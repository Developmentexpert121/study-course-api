import { Request, Response } from "express";
import { checkAccessToken, generateTokens } from "../../util/auth";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import hash from "../../util/hash";
import User from "../../models/user.model";
import UserToken from "../../models/user-token.model";
import { sendForgotEmail, sendVerifyEmail } from "../../provider/send-mail";
import { QueryTypes } from "sequelize";
import sequelize from "../../util/dbConn";
import jwt from "jsonwebtoken";
import conf from "../../conf/auth.conf";
import Course from "../../models/course.model";
import Enrollment from "../../models/enrollment.model";
import Chapter from "../../models/chapter.model";
import UserProgress from "../../models/userProgress.model";
import Comment from "../../models/comment.model";
import Ratings from "../../models/rating.model";


export const createUser = async (req: Request, res: Response) => {
  try {
    console.log("[createUser] body:", req.body);

    const { username, email, password } = req.body;

    // Check if email exists
    const emailExists = await User.findOne({ where: { email } });
    if (emailExists) {
      console.log("[createUser] Email already exists:", email);
      return res.sendError(res, "ERR_AUTH_USERNAME_OR_EMAIL_ALREADY_EXIST");
    }

    // Create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, password: hashedPassword });
    console.log("[createUser] New user ID:", user.id);

    // Generate verify token
    const verifyToken = crypto.randomBytes(32).toString("hex");
    await UserToken.create({
      user_id: user.id,
      token: verifyToken,
      token_type: "verify",
    });
    console.log("[createUser] Token saved:", verifyToken.slice(0, 8) + "...");

    // Generate verification link
    const verifyLink = `${process.env.ADMIN_URL}/auth/verify?token=${verifyToken}`;
    console.log("[createUser] Sending verify email to:", email);
    
    // ✅ FIX: Add await and error handling for email
    try {
      await sendVerifyEmail(verifyLink, email);
      console.log("[createUser] Verify email sent successfully");
    } catch (emailError) {
      console.error("[createUser] Email sending failed:", emailError);
      // Don't fail the request, just log the error
    }

    return res.sendSuccess(res, {
      message: "Account created. Please check your email to verify your account.",
    });
  } catch (err) {
    console.error("[createUser] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

export const verifyUser = async (req: Request, res: Response) => {
  try {
    const { token } = req.body; // or req.query if you send via URL

    console.log("[verifyUser] Verifying token:", token);

    const tokenRecord = await UserToken.findOne({
      where: { token, token_type: "verify" },
    });

    if (!tokenRecord) {
      console.log("[verifyUser] Token not found.");
      return res.sendError(
        res,
        "Verification failed. Token may be invalid or expired."
      );
    }

    const user = await User.findByPk(tokenRecord.user_id);
    if (!user) {
      console.log("[verifyUser] User not found for token.");
      return res.sendError(res, "User not found.");
    }

    /* ── mark verified and clean up ─────────────────── */
    user.verified = true;
    await user.save();
    await UserToken.destroy({ where: { id: tokenRecord.id } });

    /* ── generate new access token ──────────────────── */
    const { accessToken, refreshToken } = await generateTokens({
      id: user.id,
      email: user.email,
      role: user.role
    });
    console.log("[verifyUser] Account verified for:", user.email);

    return res.sendSuccess(res, {
      message: "Account verified successfully!",
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("[verifyUser] Error:", err);
    return res.sendError(res, "Something went wrong.");
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.sendError(res, "Email and password are required");
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.sendError(res, "Email Not Found");
    }


    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.sendError(res, "Password Not Matched");
    }
    if (!user.verified) {
      return res.sendError(res, "Please verify your email before logging in.");
    }
    const { id, username, role } = user;

    const { accessToken, refreshToken } = await generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
    });
    return res.sendSuccess(res, {
      user: {
        id,
        username,
        email,
        role,
      },
      accessToken,
      refreshToken,
    });
  } catch (error: any) {
    console.error("Login error:", error);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const user = await User.findOne({ where: { email: req.body.email } });
    if (!user) {
      return res.sendError(res, "ERR_AUTH_WRONG_USERNAME_OR_PASSWORD");
    }

    let resetToken = crypto.randomBytes(32).toString("hex");
    let token = await UserToken.findOne({ where: { user_id: user.id } });
    if (!token) {
      await UserToken.create({
        user_id: user.id,
        token: resetToken,
        createdAt: Date.now(),
      });
    } else {
      await UserToken.update(
        { token: resetToken },
        {
          where: {
            id: token.id,
          },
        }
      );
    }
    const link = `${process.env.ADMIN_URL}/auth/reset-password?token=${resetToken}`;

    sendForgotEmail(link, user.email);
    return res.send({
      success: true,
      message: "Forgot password email has been send",
    });
  } catch (error: any) {
    console.error(error);
    return res.sendError(res, error.message);
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const userToken = await UserToken.findOne({
      where: { token: req.body.token },
    });
    if (!userToken) {
      return res.sendError(res, "Invalid or expired token. Please request a new password reset link.");
    }
    await UserToken.destroy({ where: { id: userToken.id } });
    await User.update(
      {
        password: await hash.generate(req.body.password),
      },
      {
        where: {
          id: userToken.user_id,
        },
      }
    );
    return res.send({ status: true, message: "Password changed successfully" });
  } catch (error: any) {
    console.error(error);
    return res.sendError(res, error.message);
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const { count, rows: users } = await User.findAndCountAll({
      where: { role: "user" },
      attributes: ["id", "username", "email", "role", "verified", "createdAt"],
      order: [["createdAt", "DESC"]],
    });

    return res.sendSuccess(res, {
      users,
      count, // Total number of users
    });
  } catch (error: any) {
    console.error("[getAllUsers] Error:", error);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

export const getUserStats = async (req: Request, res: Response) => {
  try {
    const monthly = await sequelize.query(
      `
      SELECT 
        TO_CHAR("createdAt", 'YYYY-MM') AS month,
        COUNT(*) AS count
      FROM users
      WHERE role = 'user'
      GROUP BY month
      ORDER BY month DESC
      LIMIT 12
      `,
      { type: QueryTypes.SELECT }
    );

    const yearly = await sequelize.query(
      `
      SELECT 
        EXTRACT(YEAR FROM "createdAt")::INT AS year,
        COUNT(*) AS count
      FROM users
      WHERE role = 'user'
      GROUP BY year
      ORDER BY year DESC
      LIMIT 5
      `,
      { type: QueryTypes.SELECT }
    );

    return res.sendSuccess(res, { monthly, yearly });
  } catch (error) {
    console.error("[getUserStats] Error:", error);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

export const refreshToken = (req: Request, res: Response) => {
  const token = req.body.refreshToken;

  if (!token) {
    return res.status(401).json({ message: "Refresh token is required" });
  }

  try {
    const decoded = jwt.verify(token, conf.refreshSecret) as any;

    // Optional: Check if token is blacklisted or revoked

    const accessToken = jwt.sign(
      { id: decoded.id, email: decoded.email, role: decoded.role },
      conf.secret,
      { expiresIn: "15m" }
    );

    return res.sendSuccess(res, { accessToken });
  } catch (err) {
    return res.status(401).json({ message: "Invalid refresh token" });
  }
};

export const getDashboardSummary = async (req: Request, res: Response) => {
  try {
    const [
      activeCoursesCount,
      inactiveCoursesCount,
      totalUsersCount,
      verifiedUsersCount,
      adminUsersCount,
      enrolledCoursesCount, 
    ] = await Promise.all([
      Course.count({ where: { is_active: true } }),
      Course.count({ where: { is_active: false } }),
      User.count(),
      User.count({ where: { verified: true } }),
      User.count({ where: { role: "admin" } }),
      Enrollment.count(), // ✅ Add this
    ]);

    return res.sendSuccess(res, {
      totalUsers: totalUsersCount,
      verifiedUsers: verifiedUsersCount,
      adminUsers: adminUsersCount,
      activeCourses: activeCoursesCount,
      inactiveCourses: inactiveCoursesCount,
      enrolledCourses: enrolledCoursesCount, 
    });
  } catch (error) {
    console.error("[getDashboardSummary] Error:", error);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

export const getAllUsersWithProgress = async (req: Request, res: Response) => {
  try {
    // Step 1: Get page and limit from query
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    // Step 2: Fetch paginated users
    const { rows: users, count: totalUsers } = await User.findAndCountAll({
      offset,
      limit,
      order: [['createdAt', 'DESC']],
    });

    // Step 3: Process each user's enrolled courses and progress
    const result = await Promise.all(
      users.map(async (user) => {
        const enrollments = await Enrollment.findAll({
          where: { user_id: user.id },
        });

        const enrolledCourses = await Promise.all(
          enrollments.map(async (enrollment) => {
            const course = await Course.findByPk(enrollment.course_id);
            const chapters = await Chapter.findAll({
              where: { course_id: course.id },
              order: [['order', 'ASC']],
            });

            const userProgress = await UserProgress.findAll({
              where: { user_id: user.id, course_id: course.id },
            });

            const completedChapters = userProgress.filter(p => p.completed).length;
            const totalChapters = chapters.length;

            const percentage = totalChapters === 0
              ? 0
              : Math.round((completedChapters / totalChapters) * 100);

            return {
              course_id: course.id,
              title: course.title,
              image: course.image,
              total_chapters: totalChapters,
              completed_chapters: completedChapters,
              completion_percentage: percentage,
            };
          })
        );

        return {
          id: user.id,
          username: user.username,
          email: user.email,
          enrolledCourses,
        };
      })
    );

    // Step 4: Send response with pagination metadata
    return res.sendSuccess(res, {
      currentPage: page,
      totalPages: Math.ceil(totalUsers / limit),
      totalUsers,
      users: result,
    });

  } catch (err) {
    console.error("[getAllUsersWithProgress] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

export const getUserDetails = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.sendError(res, "USER_NOT_FOUND");
    }

    // Fetch enrollments
    const enrollments = await Enrollment.findAll({
      where: { user_id: userId },
    });

    const coursesWithProgress = await Promise.all(
      enrollments.map(async (enrollment) => {
        const course = await Course.findByPk(enrollment.course_id);

        const chapters = await Chapter.findAll({
          where: { course_id: course.id },
          order: [["order", "ASC"]],
        });

        const userProgress = await UserProgress.findAll({
          where: {
            user_id: userId,
            course_id: course.id,
          },
        });

        const completedChapters = userProgress.filter((progress) => progress.completed).map((p) => ({
          chapter_id: p.chapter_id,
          completedAt: p.completedAt,
        }));

        const detailedChapterProgress = chapters.map((chapter) => {
          const match = completedChapters.find((c) => c.chapter_id === chapter.id);
          return {
            chapter_id: chapter.id,
            title: chapter.title,
            order: chapter.order,
            completed: !!match,
            completedAt: match?.completedAt || null,
          };
        });

        const totalChapters = chapters.length;
        const completedCount = completedChapters.length;

        const percentage =
          totalChapters === 0 ? 0 : Math.round((completedCount / totalChapters) * 100);

        return {
          course_id: course.id,
          title: course.title,
          image: course.image,
          enrolledAt: enrollment.createdAt,
          total_chapters: totalChapters,
          completed_chapters: completedCount,
          completion_percentage: percentage,
          chapters: detailedChapterProgress,
        };
      })
    );

    // Optional: Quizzes (stubbed)
    const quizResults = [];

    // ✅ Comments
    const comments = await Comment.findAll({
      where: { userId: userId },
      include: [
        { model: Course, attributes: ["id", "title"] },
        // { model: Chapter, attributes: ["id", "title"] },
      ],
      order: [["createdAt", "DESC"]],
    });

    const formattedComments = comments.map((comment) => ({
      id: comment.id,
      text: comment.text,
      course: comment.Course ? { id: comment.Course.id, title: comment.Course.title } : null,
      // chapter: comment.Chapter ? { id: comment.Chapter.id, title: comment.Chapter.title } : null,
      createdAt: comment.createdAt,
    }));

    // ✅ Ratings
    const ratings = await Ratings.findAll({
      where: { id: userId },
      include: [{ model: Course, attributes: ["id", "title"] }],
    });

    const formattedRatings = ratings.map((rating) => ({
      id: rating.id,
      course: {
        id: rating.Course.id,
        title: rating.Course.title,
      },
      score: rating.score,
      review: rating.review || null,
      createdAt: rating.createdAt,
    }));

    // Final Response
    return res.sendSuccess(res, {
      id: user.id,
      username: user.username,
      email: user.email,
      verified: user.verified,
      role: user.role || "user",
      joinedAt: user.createdAt,
      courses: coursesWithProgress,
      quizzes: quizResults,
      comments: formattedComments,
      ratings: formattedRatings,
    });
  } catch (err) {
    console.error("[getUserDetails] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

