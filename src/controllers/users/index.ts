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


// export const createUser = async (req: Request, res: Response) => {
//   try {
//     console.log("[createUser] Request body:", req.body);

//     const { username, email, password, role = 'user' } = req.body;

//     // Validate required fields
//     if (!username || !email || !password) {
//       console.log("[createUser] Missing required fields");
//       return res.sendError(res, "Username, email, and password are required");
//     }

//     // Check if email exists
//     const emailExists = await User.findOne({ where: { email } });
//     if (emailExists) {
//       console.log("[createUser] Email already exists:", email);
//       return res.sendError(res, "ERR_AUTH_USERNAME_OR_EMAIL_ALREADY_EXIST");
//     }

//     // Hash password
//     const hashedPassword = await bcrypt.hash(password, 10);

//     // Determine if this is an admin signup
//     const isAdmin = role === 'admin';

//     // Create user - admins need approval, so they start as unverified
//     const user = await User.create({
//       username,
//       email,
//       password: hashedPassword,
//       role: role,
//       verified: false // Both users and admins start unverified
//     });
//     console.log("[createUser] New user created with ID:", user.id, "Role:", role);

//     // Only send verification email for regular users
//     if (!isAdmin) {
//       // Generate verify token
//       const verifyToken = crypto.randomBytes(32).toString("hex");
//       await UserToken.create({
//         user_id: user.id,
//         token: verifyToken,
//         token_type: "verify",
//       });
//       console.log("[createUser] Verification token created for user");

//       // Generate verification link
//       const verifyLink = `${process.env.ADMIN_URL}/auth/verify?token=${verifyToken}`;
//       console.log("[createUser] Verification link:", verifyLink);
//       console.log("[createUser] Attempting to send email to:", email);

//       // Send verification email with proper error handling
//       try {
//         await sendVerifyEmail(verifyLink, email);
//         console.log("[createUser] ✅ Verification email sent successfully");

//         return res.sendSuccess(res, {
//           message: "Account created successfully! Please check your email to verify your account.",
//         });
//       } catch (emailError: any) {
//         console.error("[createUser] ❌ Email sending failed:", emailError);

//         // User was created but email failed
//         return res.sendSuccess(res, {
//           message: "Account created, but we couldn't send the verification email. Please contact support.",
//           warning: "Email delivery failed",
//         });
//       }
//     } else {
//       // Admin account created - needs approval from existing admin
//       console.log("[createUser] ✅ Admin account created - awaiting approval");

//       return res.sendSuccess(res, {
//         message: "Admin account request submitted successfully! Please wait for approval from an existing admin.",
//         isAdmin: true,
//         pendingApproval: true,
//       });
//     }
//   } catch (err: any) {
//     console.error("[createUser] Error:", err);
//     return res.sendError(res, err.message || "ERR_INTERNAL_SERVER_ERROR");
//   }
// };


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

    // Check if user is verified
    if (!user.verified) {
      return res.sendError(res, "Please verify your email before logging in.");
    }

    // Validate role matches the selected account type
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
































//update

export const getAllAdmins = async (req: Request, res: Response) => {
  try {
    const { count, rows: admins } = await User.findAndCountAll({
      where: { role: "admin" },
      attributes: ["id", "username", "email", "role", "verified", "profileImage", "createdAt" , "status"],
      order: [["createdAt", "DESC"]],
    });

    return res.sendSuccess(res, {
      admins,
      count,
    });
  } catch (error: any) {
    console.error("[getAllAdmins] Error:", error);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};








// export const approveAdmin = async (req: Request, res: Response) => {
//   try {
//     const adminId = req.params.id;
    
//     console.log("[approveAdmin] Approving admin with ID:", adminId);
    
//     // Find the admin user
//     const admin = await User.findOne({
//       where: { id: adminId, role: 'admin' }
//     });
    
//     if (!admin) {
//       console.log("[approveAdmin] Admin not found");
//       return res.sendError(res, "Admin user not found");
//     }
    
//     if (admin.verified) {
//       console.log("[approveAdmin] Admin already verified");
//       return res.sendError(res, "Admin is already verified");
//     }
    
//     // Update admin to verified
//     admin.verified = true;
//     await admin.save();
    
//     console.log("[approveAdmin] Admin verified successfully");
    

    
//     // Send approval email
//     try {
//       const emailSent = await sendApprovalEmail(admin.email, admin.username);
//       if (emailSent) {
//         console.log("[approveAdmin] ✅ Approval email sent successfully");
//       } else {
//         console.log("[approveAdmin] ⚠️ Approval email failed to send");
//       }
//     } catch (emailError) {
//       console.error("[approveAdmin] ❌ Email error:", emailError);
//     }
    
//     return res.sendSuccess(res, {
//       message: "Admin approved successfully! Approval email has been sent.",
//       admin: {
//         id: admin.id,
//         username: admin.username,
//         email: admin.email,
//         verified: admin.verified,
//         role: admin.role
//       }
//     });
//   } catch (error: any) {
//     console.error("[approveAdmin] Error:", error);
//     return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
//   }
// };



export const approveAdmin = async (req: Request, res: Response) => {
  try {
    const adminId = req.params.id;
    
    console.log("[approveAdmin] Approving admin with ID:", adminId);
    
    // Find the admin user
    const admin = await User.findOne({
      where: { id: adminId, role: 'admin' }
    });
    
    if (!admin) {
      console.log("[approveAdmin] Admin not found");
      return res.sendError(res, "Admin user not found");
    }
    
    if (admin.verified) {
      console.log("[approveAdmin] Admin already verified");
      return res.sendError(res, "Admin is already verified");
    }
    
    // Update both verified status and status field in a single operation
    await User.update(
      { 
        verified: true,
        status: 'approved' // Fixed typo: 'accpected' -> 'approved'
      },
      { 
        where: { id: adminId } 
      }
    );

    console.log("[approveAdmin] Admin approved successfully");

    // Send approval email
    try {
      const emailSent = await sendApprovalEmail(admin.email, admin.username);
      if (emailSent) {
        console.log("[approveAdmin] ✅ Approval email sent successfully");
      } else {
        console.log("[approveAdmin] ⚠️ Approval email failed to send");
      }
    } catch (emailError) {
      console.error("[approveAdmin] ❌ Email error:", emailError);
    }
    
    return res.sendSuccess(res, {
      message: "Admin approved successfully! Approval email has been sent.",
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        verified: true,
        status: 'approved',
        role: admin.role
      }
    });
  } catch (error: any) {
    console.error("[approveAdmin] Error:", error);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};



export const rejectAdmin = async (req: Request, res: Response) => {
  try {
    const adminId = req.params.id;
    
    console.log("[rejectAdmin] Rejecting admin with ID:", adminId);

    // Find the admin
    const admin = await User.findOne({ where: { id: adminId } });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin user not found"
      });
    }

    console.log("[rejectAdmin] Found admin:", admin.email, admin.username);

    // Update status to rejected
    await User.update(
      { status: 'rejected' },
      { where: { id: adminId } }
    );
    
    console.log("[rejectAdmin] Admin status updated to 'rejected'");

    // Send rejection email
    console.log("[rejectAdmin] Sending rejection email...");
    const emailSent = await sendRejectionEmail(admin.email, admin.username);
    
    if (emailSent) {
      console.log("[rejectAdmin] ✅ Rejection email sent successfully");
      return res.status(200).json({
        success: true,
        message: "Admin application rejected successfully! Rejection email has been sent."
      });
    } else {
      console.log("[rejectAdmin] ⚠️ Admin rejected but email failed to send");
      return res.status(200).json({
        success: true,
        message: "Admin application rejected successfully! However, we couldn't send the rejection email."
      });
    }
    
  } catch (error: any) {
    console.error("[rejectAdmin] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};
