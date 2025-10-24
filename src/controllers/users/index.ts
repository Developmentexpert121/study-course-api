import { Request, Response } from "express";
import { checkAccessToken, generateTokens } from "../../util/auth";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import hash from "../../util/hash";
import User from "../../models/user.model";
import UserToken from "../../models/user-token.model";
import {
  sendForgotEmail,
  sendVerifyEmail,
  sendApprovalEmail,
  sendRejectionEmail
} from "../../provider/send-mail";
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
import Lesson from "../../models/lesson.model";
import { Sequelize, Op } from 'sequelize';
import AdminActivity from '../../models/admin-activity.model';




export const createUser = async (req: Request, res: Response) => {
  try {
    console.log("[createUser] Request body:", req.body);

    const { username, email, password, role = 'user' } = req.body;

    // Validate required fields
    if (!username || !email || !password) {
      console.log("[createUser] Missing required fields");
      return res.sendError(res, "Username, email, and password are required");
    }

    // Check if email exists
    const emailExists = await User.findOne({ where: { email } });
    if (emailExists) {
      console.log("[createUser] Email already exists:", email);
      return res.sendError(res, "ERR_AUTH_USERNAME_OR_EMAIL_ALREADY_EXIST");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Determine if this is an admin signup
    const isAdmin = role === 'admin';

    // Set status based on role
    const status = isAdmin ? 'pending' : 'active';

    // Create user - admins need approval, so they start as unverified with pending status
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      role: role,
      verified: false, // Both users and admins start unverified
      status: status   // Admins: 'pending', Regular users: 'active'
    });
    console.log("[createUser] New user created with ID:", user.id, "Role:", role, "Status:", status);

    // Only send verification email for regular users
    if (!isAdmin) {
      // Generate verify token
      const verifyToken = crypto.randomBytes(32).toString("hex");
      await UserToken.create({
        user_id: user.id,
        token: verifyToken,
        token_type: "verify",
      });
      console.log("[createUser] Verification token created for user");

      // Generate verification link
      const verifyLink = `${process.env.ADMIN_URL}/auth/verify?token=${verifyToken}`;
      console.log("[createUser] Verification link:", verifyLink);
      console.log("[createUser] Attempting to send email to:", email);

      // Send verification email with proper error handling
      try {
        await sendVerifyEmail(verifyLink, email);
        console.log("[createUser] ✅ Verification email sent successfully");

        return res.sendSuccess(res, {
          message: "Account created successfully! Please check your email to verify your account.",
        });
      } catch (emailError: any) {
        console.error("[createUser] ❌ Email sending failed:", emailError);

        // User was created but email failed
        return res.sendSuccess(res, {
          message: "Account created, but we couldn't send the verification email. Please contact support.",
          warning: "Email delivery failed",
        });
      }
    } else {
      // Admin account created - needs approval from existing admin
      console.log("[createUser] ✅ Admin account created - awaiting approval");

      return res.sendSuccess(res, {
        message: "Admin account request submitted successfully! Please wait for approval from an existing admin.",
        isAdmin: true,
        pendingApproval: true,
      });
    }
  } catch (err: any) {
    console.error("[createUser] Error:", err);
    return res.sendError(res, err.message || "ERR_INTERNAL_SERVER_ERROR");
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

// export const loginUser = async (req: Request, res: Response) => {
//   try {
//     const { email, password, role } = req.body;

//     if (!email || !password) {
//       return res.sendError(res, "Email and password are required");
//     }

//     const user = await User.findOne({ where: { email } });

//     if (!user) {
//       return res.sendError(res, "Email Not Found");
//     }

//     const passwordMatch = await bcrypt.compare(password, user.password);

//     if (!passwordMatch) {
//       return res.sendError(res, "Password Not Matched");
//     }

//     // Check if user is verified
//     if (!user.verified) {
//       return res.sendError(res, "Please verify your email before logging in.");
//     }

//     // Validate role matches the selected account type
//     if (role && user.role !== role) {
//       if (role === 'admin' && user.role === 'user') {
//         return res.sendError(res, "This is a User account. Please select 'User Account' to login.");
//       } else if (role === 'user' && user.role === 'admin') {
//         return res.sendError(res, "This is an Admin account. Please select 'Admin Account' to login.");
//       }
//     }

//     const { id, username, role: userRole } = user;

//     const { accessToken, refreshToken } = await generateTokens({
//       id: user.id,
//       email: user.email,
//       role: user.role,
//     });

//     return res.sendSuccess(res, {
//       user: {
//         id,
//         username,
//         email,
//         role: userRole,
//       },
//       accessToken,
//       refreshToken,
//     });
//   } catch (error: any) {
//     console.error("Login error:", error);
//     return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
//   }
// };




export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password, role } = req.body;

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

    if (role && user.role !== role) {
      if (role === 'admin' && user.role === 'user') {
        return res.sendError(res, "This is a User account. Please select 'User Account' to login.");
      } else if (role === 'user' && user.role === 'admin') {
        return res.sendError(res, "This is an Admin account. Please select 'Admin Account' to login.");
      }
    }

    const { id, username, role: userRole } = user;

    const { accessToken, refreshToken } = await generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // ✅ Track admin login activity - MINIMAL VERSION
    if (user.role === 'admin') {
      try {
        console.log('🟡 Creating AdminActivity record...');

        // Explicitly set string value
        const adminActivity = await AdminActivity.create({
          admin_id: user.id,
          activity_type: 'login' // Direct string value
        });

        console.log('✅ AdminActivity record created:');
        console.log('ID:', adminActivity.id);
        console.log('Admin ID:', adminActivity.admin_id);
        console.log('Activity Type:', adminActivity.activity_type);
        console.log('Type of activity_type:', typeof adminActivity.activity_type);

      } catch (activityError: any) {
        console.error('❌ Error recording admin activity:', activityError.message);
      }
    }

    return res.sendSuccess(res, {
      user: {
        id,
        username,
        email,
        role: userRole,
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
    console.log("token for usertoken", UserToken)
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
          status: user.status,
          verifyUser: user.verified,
          role: user.role,
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

export const getAllAdmins = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;

    const whereClause: any = { role: "admin" };

    // Filter by status if provided
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    // Search filter - NOW USING IMPORTED Op
    if (search) {
      whereClause[Op.or] = [
        { username: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (Number(page) - 1) * Number(limit);

    const { count, rows: admins } = await User.findAndCountAll({
      where: whereClause,
      attributes: [
        "id", "username", "email", "role", "verified",
        "profileImage", "createdAt", "status", "updatedAt"
      ],
      order: [["createdAt", "DESC"]],
      limit: Number(limit),
      offset: offset
    });

    return res.status(200).json({
      success: true,
      data: {
        admins,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(count / Number(limit)),
          totalItems: count,
          itemsPerPage: Number(limit)
        }
      }
    });
  } catch (error: any) {
    console.error("[getAllAdmins] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

export const approveAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = req.params.id;
    const superAdminId = req.user!.id;

    console.log(`[approveAdmin] Super Admin ${superAdminId} approving admin with ID: ${adminId}`);

    if (!adminId) {
      res.status(400).json({
        success: false,
        message: "Admin ID is required"
      });
      return;
    }

    const admin = await User.findOne({
      where: { id: adminId, role: 'admin' }
    });

    if (!admin) {
      res.status(404).json({
        success: false,
        message: "Admin user not found"
      });
      return;
    }

    if (admin.status === 'approved') {
      res.status(400).json({
        success: false,
        message: "Admin is already approved"
      });
      return;
    }

    await User.update(
      {
        verified: true,
        status: 'approved',
        approvedBy: superAdminId,
        approvedAt: new Date()
      },
      {
        where: { id: adminId }
      }
    );

    console.log("[approveAdmin] Admin approved successfully");

    try {
      await sendApprovalEmail(admin.email, admin.username);
      console.log("[approveAdmin] ✅ Approval email sent successfully");
    } catch (emailError) {
      console.error("[approveAdmin] ⚠️ Approval email failed to send:", emailError);
    }

    // const updatedAdmin = await User.findByPk(adminId, {
    //   attributes: ["id", "username", "email", "role", "verified", "status", "approvedAt"]
    // });

    res.status(200).json({
      success: true,
      message: "Admin approved successfully!",
      data: {
        // admin: updatedAdmin,
        emailSent: true
      }
    });
  } catch (error: any) {
    console.error("[approveAdmin] Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

export const rejectAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = req.params.id;
    const superAdminId = req.user!.id;
    const { reason } = req.body;

    console.log(`[rejectAdmin] Super Admin ${superAdminId} rejecting admin with ID: ${adminId}`);

    if (!adminId) {
      res.status(400).json({
        success: false,
        message: "Admin ID is required"
      });
      return;
    }

    const admin = await User.findOne({
      where: { id: adminId, role: 'admin' }
    });

    if (!admin) {
      res.status(404).json({
        success: false,
        message: "Admin user not found"
      });
      return;
    }

    console.log("[rejectAdmin] Found admin:", admin.email, admin.username);

    await User.update(
      {
        status: 'rejected',
        rejectedBy: superAdminId,
        rejectedAt: new Date(),
        rejectionReason: reason || null
      },
      { where: { id: adminId } }
    );

    console.log("[rejectAdmin] Admin status updated to 'rejected'");

    let emailSent = false;
    try {
      console.log("[rejectAdmin] Sending rejection email...");
      // Use only 2 parameters to match the function signature
      emailSent = await sendRejectionEmail(admin.email, admin.username);

      if (emailSent) {
        console.log("[rejectAdmin] ✅ Rejection email sent successfully");
      }
    } catch (emailError) {
      console.error("[rejectAdmin] ❌ Email error:", emailError);
    }

    // const updatedAdmin = await User.findByPk(adminId, {
    //   attributes: ["id", "username", "email", "role", "verified", "status", "rejectedAt", "rejectionReason"]
    // });
    // console.log("updatedAdminupdatedAdmin",updatedAdmin)

    res.status(200).json({
      success: true,
      message: emailSent
        ? "Admin application rejected successfully! Rejection email has been sent."
        : "Admin application rejected successfully! However, we couldn't send the rejection email.",
      data: {
        // admin: updatedAdmin,
        emailSent
      }
    });

  } catch (error: any) {
    console.error("[rejectAdmin] Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};























// Additional functions if needed
export const suspendAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = req.params.id;
    const superAdminId = req.user!.id;
    const { reason } = req.body;

    const admin = await User.findOne({
      where: { id: adminId, role: 'admin' }
    });

    if (!admin) {
      res.status(404).json({
        success: false,
        message: "Admin user not found"
      });
      return;
    }

    await User.update(
      {
        status: 'suspended',
        suspendedBy: superAdminId,
        suspendedAt: new Date(),
        suspensionReason: reason
      },
      { where: { id: adminId } }
    );

    res.status(200).json({
      success: true,
      message: "Admin suspended successfully"
    });
  } catch (error: any) {
    console.error("[suspendAdmin] Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

export const activateAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = req.params.id;
    const superAdminId = req.user!.id;

    const admin = await User.findOne({
      where: { id: adminId, role: 'admin' }
    });

    if (!admin) {
      res.status(404).json({
        success: false,
        message: "Admin user not found"
      });
      return;
    }

    await User.update(
      {
        status: 'approved',
        activatedBy: superAdminId,
        activatedAt: new Date()
      },
      { where: { id: adminId } }
    );

    res.status(200).json({
      success: true,
      message: "Admin activated successfully"
    });
  } catch (error: any) {
    console.error("[activateAdmin] Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};















export const trackLogoutActivity = async (req: Request, res: Response) => {
  try {
    const { admin_id } = req.body;

    if (!admin_id) {
      return res.sendError(res, "Admin ID is required");
    }

    console.log(`🟡 Creating logout activity record for admin ID: ${admin_id}`);

    // Create logout activity record
    const adminActivity = await AdminActivity.create({
      admin_id: admin_id,
      activity_type: 'logout'
    });

    console.log('✅ Logout activity recorded successfully:');
    console.log('ID:', adminActivity.id);
    console.log('Admin ID:', adminActivity.admin_id);
    console.log('Activity Type:', adminActivity.activity_type);

    return res.sendSuccess(res, {
      message: 'Logout activity recorded successfully',
      activity: {
        id: adminActivity.id,
        admin_id: adminActivity.admin_id,
        activity_type: adminActivity.activity_type,
        created_at: adminActivity.created_at
      }
    });

  } catch (error: any) {
    console.error('❌ Error recording logout activity:', error.message);
    return res.sendError(res, "Error recording logout activity");
  }
};











export const getAllAdminActivities = async (req: Request, res: Response) => {
  console.log('=== GET /user/getlogs CALLED ===');

  try {
    console.log('🟡 Querying admin activities from database...');

    // Use raw query with JOIN to get user details
    const activities = await sequelize.query(`
      SELECT 
        aa.id,
        aa.admin_id,
        aa.activity_type,
        aa.created_at,
        aa.updated_at,
        u.username,
        u.email,
        u.role
      FROM admin_activities aa
      LEFT JOIN users u ON aa.admin_id = u.id
      ORDER BY aa.created_at DESC
    `, {
      type: QueryTypes.SELECT
    });

    console.log('✅ Found activities:', activities.length);

    // Log sample data to verify structure
    if (activities.length > 0) {
      console.log('✅ Sample activity data:', activities[0]);
    }

    // Return all activities data with user information
    return res.status(200).json({
      success: true,
      data: {
        activities: activities,
        totalCount: activities.length,
        currentPage: 1,
        totalPages: 1,
        hasMore: false
      }
    });

  } catch (error: any) {
    console.error('❌ Database error:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};




//date 17/10/2025

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    console.log("[getCurrentUser] Starting user authentication...");

    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log("[getCurrentUser] No Bearer token found in header");
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const token = authHeader.split(' ')[1];
    console.log("[getCurrentUser] Token received:", token.substring(0, 20) + "...");

    // Verify and decode token using JWT
    let decoded: any;
    try {
      decoded = jwt.verify(token, conf.secret);
      console.log("[getCurrentUser] Token decoded successfully:", {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role
      });
    } catch (jwtError) {
      console.error("[getCurrentUser] JWT verification failed:", jwtError);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    // Find user by ID from decoded token in database
    const user = await User.findByPk(decoded.id, {
      attributes: {
        exclude: ['password'] // Exclude password from response
      }
    });

    if (!user) {
      console.log("[getCurrentUser] User not found in database for ID:", decoded.id);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log("[getCurrentUser] User found in database:", {
      id: user.id,
      email: user.email,
      role: user.role,
      verified: user.verified,
      status: user.status
    });

    // Compare token data with database user
    if (user.email !== decoded.email) {
      console.log("[getCurrentUser] Email mismatch - Token:", decoded.email, "DB:", user.email);
      return res.status(401).json({
        success: false,
        message: 'Token data mismatch'
      });
    }

    if (user.role !== decoded.role) {
      console.log("[getCurrentUser] Role mismatch - Token:", decoded.role, "DB:", user.role);
      return res.status(401).json({
        success: false,
        message: 'User role has changed'
      });
    }

    // Check if user is verified (based on your existing logic)
    if (!user.verified) {
      console.log("[getCurrentUser] User not verified:", user.email);
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before accessing this resource'
      });
    }

    // For admin users, check status - using your ENUM values
    if (user.role === 'admin' && user.status !== 'approved') {
      console.log("[getCurrentUser] Admin not approved:", user.email, "Status:", user.status);
      return res.status(403).json({
        success: false,
        message: 'Admin account pending approval'
      });
    }

    // For regular users, check if they are active


    console.log("[getCurrentUser] ✅ User authentication successful for:", user.email);

    // Return user data matching your model structure
    return res.status(200).json({
      success: true,
      message: 'User profile fetched successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        verified: user.verified,
        status: user.status,
        profileImage: user.profileImage,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });

  } catch (error: any) {
    console.error('[getCurrentUser] Unexpected error:', error);

    return res.status(500).json({
      success: false,
      message: 'ERR_INTERNAL_SERVER_ERROR'
    });
  }
};


// date 23/10/25



export const getAllUsersforadmin = async (req: Request, res: Response) => {
  try {
    // Step 1: Get page and limit from query
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    // Step 2: Fetch paginated users (excluding admin and super-admin roles)
    const { rows: users, count: totalUsers } = await User.findAndCountAll({
      where: {
        role: {
          [Op.notIn]: ['admin', 'Super-Admin'] // Excludes users with 'admin' or 'super-admin' role
        }
      },
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
          status: user.status,
          verifyUser: user.verified,
          role: user.role,
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












export const verifyResetToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    console.log("[verifyResetToken] Verifying reset token:", token);

    if (!token) {
      return res.sendError(res, "Token is required");
    }

    // Find the token in the UserToken table
    const userToken = await UserToken.findOne({
      where: { token: token },
    });

    if (!userToken) {
      console.log("[verifyResetToken] Token not found or expired");
      return res.sendError(res, "Invalid or expired reset token. Please request a new password reset link.");
    }

    // Find the user associated with this token
    const user = await User.findByPk(userToken.user_id);

    if (!user) {
      console.log("[verifyResetToken] User not found for token");
      return res.sendError(res, "User not found");
    }

    console.log("[verifyResetToken] ✅ Token verified successfully for user:", user.email);

    return res.sendSuccess(res, {
      email: user.email,
      message: "Token verified successfully"
    });

  } catch (error: any) {
    console.error("[verifyResetToken] Error:", error);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};







export const getCoursesByUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { 
      page = 1, 
      limit = 10, 
      category, 
      status = 'active',
      search 
    } = req.query;

    console.log(`[getCoursesByUser] Fetching courses for user ID: ${userId}`);

    // Validate userId
    if (!userId || isNaN(parseInt(userId))) {
      console.log("[getCoursesByUser] Invalid user ID provided");
      return res.sendError(res, "Valid user ID is required");
    }

    const userIdNum = parseInt(userId);
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Build where clause
    const whereClause: any = {
      userId: userIdNum
    };

    // Filter by status
    if (status === 'active') {
      whereClause.is_active = true;
    } else if (status === 'inactive') {
      whereClause.is_active = false;
    }
    // If status is 'all', no filter applied

    // Filter by category
    if (category && category !== 'all') {
      whereClause.category = category;
    }

    // Search filter
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Fetch courses with pagination
    const { count: totalCourses, rows: courses } = await Course.findAndCountAll({
      where: whereClause,
      attributes: [
        'id', 
        'title', 
        'description', 
        'category', 
        'is_active', 
        'image', 
        'creator', 
        'ratings', 
        'userId', 
        'createdAt', 
        'updatedAt'
      ],
      order: [['createdAt', 'DESC']],
      limit: limitNum,
      offset: offset
    });

    console.log(`[getCoursesByUser] Found ${courses.length} courses for user ${userId}`);

    // Get unique categories for filter options
    const categories = await Course.findAll({
      where: { userId: userIdNum },
      attributes: ['category'],
      group: ['category'],
      raw: true
    });

    const uniqueCategories = categories.map(cat => cat.category).filter(Boolean);

    return res.sendSuccess(res, {
      courses,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalCourses / limitNum),
        totalCourses,
        coursesPerPage: limitNum,
        hasNextPage: pageNum < Math.ceil(totalCourses / limitNum),
        hasPrevPage: pageNum > 1
      },
      filters: {
        availableCategories: uniqueCategories,
        totalActive: await Course.count({ 
          where: { ...whereClause, is_active: true } 
        }),
        totalInactive: await Course.count({ 
          where: { ...whereClause, is_active: false } 
        })
      }
    });

  } catch (error: any) {
    console.error("[getCoursesByUser] Error:", error);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};


// date 24/10/25

export const getCourseById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate ID
    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid course ID',
      });
    }

    // Find course by ID - only select existing columns
    const course = await Course.findByPk(id, {
      attributes: [
        'id',
        'title',
        'description',
        'category',
        'is_active',
        'image',
        'intro_video',
        'creator',
        'price',
        'price_type',
        'duration',
        'status',
        'ratings',
        'userId',
        'createdAt',
        'updatedAt'
      ]
    });

    // Check if course exists
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    // Return course details
    return res.status(200).json({
      success: true,
      data: course,
    });
  } catch (error) {
    console.error('Error fetching course:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};


// export const getChaptersByCourseId = async (req: Request, res: Response) => {
//   try {
//     const { courseId } = req.params;

//     // Validate courseId
//     if (!courseId || isNaN(Number(courseId))) {
//       return res.status(400).json({
//         success: false,
//         message: 'Valid course ID is required',
//       });
//     }

//     // Fetch chapters ordered by the 'order' field
//     const chapters = await Chapter.findAll({
//       where: { course_id: Number(courseId) },
//       order: [['order', 'ASC']],
//     });

//     // Check if chapters exist
//     if (!chapters || chapters.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: 'No chapters found for this course',
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       count: chapters.length,
//       data: chapters,
//     });
//   } catch (error) {
//     console.error('Error fetching chapters:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Server error while fetching chapters',
//       error: error instanceof Error ? error.message : 'Unknown error',
//     });
//   }
// };

export const getChaptersByCourseId = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;

    // Validate courseId
    if (!courseId || isNaN(Number(courseId))) {
      return res.status(400).json({
        success: false,
        message: 'Valid course ID is required',
      });
    }

    // Fetch chapters with their lessons ordered by the 'order' field
    const chapters = await Chapter.findAll({
      where: { course_id: Number(courseId) },
      order: [['order', 'ASC']],
      include: [
        {
          model: Lesson,
          as: 'lessons', // Make sure this association is defined in your Chapter model
          order: [['order', 'ASC']],
        },
      ],
    });

    // Check if chapters exist
    if (!chapters || chapters.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No chapters found for this course',
      });
    }

    return res.status(200).json({
      success: true,
      count: chapters.length,
      data: chapters,
    });
  } catch (error) {
    console.error('Error fetching chapters:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching chapters',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

