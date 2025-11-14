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
  sendRejectionEmail,
  sendLoginCredentialsEmail
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
import multer from "multer";
import Certificate from "../../models/certificate.model"

import CourseAuditLog from '../../models/CourseAuditLog.model'
import Role from "../../models/role.model";


export const createUser = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    // Validate required fields
    if (!username || !email || !password) {
      return res.sendError(res, "Username, email, and password are required");
    }

    // Check if email exists
    const emailExists = await User.findOne({ where: { email } });
    if (emailExists) {
      return res.sendError(res, "ERR_AUTH_USERNAME_OR_EMAIL_ALREADY_EXIST");
    }

    // Get the default "Student" role ID
    const userRole = await Role.findOne({ where: { name: 'Student' } });
    if (!userRole) {
      return res.sendError(res, "Default user role not found. Please contact administrator.");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with role_id
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      role: 'Student', // Set role as "Student"
      role_id: userRole.id,
      verified: false,
      status: 'active'
    });

    // Generate verify token
    const verifyToken = crypto.randomBytes(32).toString("hex");
    await UserToken.create({
      user_id: user.id,
      token: verifyToken,
      token_type: "verify",
    });

    // Generate verification link
    const verifyLink = `${process.env.ADMIN_URL}/auth/verify?token=${verifyToken}`;
    try {
      await sendVerifyEmail(verifyLink, email);

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
  } catch (err: any) {
    console.error("[createUser] Error:", err);
    return res.sendError(res, err.message || "ERR_INTERNAL_SERVER_ERROR");
  }
};
// In your user controller
export const createUserByAdmin = async (req: Request, res: Response) => {
  try {
    const { username, email, password, role_id, send_credentials = true } = req.body;

    // Validate required fields
    if (!username || !email || !password || !role_id) {
      return res.sendError(res, "Username, email, password, and role_id are required");
    }

    // Check if email already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.sendError(res, "ERR_AUTH_USERNAME_OR_EMAIL_ALREADY_EXIST");
    }

    // Get role by ID
    const roleRecord = await Role.findByPk(role_id);
    if (!roleRecord) {
      return res.sendError(res, "Invalid role ID selected");
    }

    const roleId = roleRecord.id;
    const roleName = roleRecord.name;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with role_id
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      role: roleName, // Keep for backward compatibility
      role_id: roleId, // Use role_id
      verified: true, // Auto-verify admin-created users
      status: 'active'
    });

    // Send login credentials via email if requested
    if (send_credentials) {
      try {
        await sendLoginCredentialsEmail(email, username, password, roleName);

        return res.sendSuccess(res, {
          message: `User created successfully as ${roleName}! Login credentials sent to ${email}`,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: roleName,
            role_id: roleId,
            verified: user.verified
          }
        });
      } catch (emailError) {
        console.error("[createUserByAdmin] Email sending failed:", emailError);

        // User was created but email failed
        return res.sendSuccess(res, {
          message: "User created but failed to send email credentials",
          warning: "Email delivery failed",
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: roleName,
            role_id: roleId,
            verified: user.verified
          }
        });
      }
    } else {
      return res.sendSuccess(res, {
        message: "User created successfully!",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: roleName,
          role_id: roleId,
          verified: user.verified
        }
      });
    }
  } catch (err: any) {
    console.error("[createUserByAdmin] Error:", err);
    return res.sendError(res, err.message || "ERR_INTERNAL_SERVER_ERROR");
  }
};

export const verifyUser = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    const tokenRecord = await UserToken.findOne({
      where: { token, token_type: "verify" },
    });

    if (!tokenRecord) {
      return res.sendError(
        res,
        "Verification failed. Token may be invalid or expired."
      );
    }

    const user = await User.findByPk(tokenRecord.user_id, {
      include: [{
        model: Role,
        as: 'roleDetails',
        attributes: ['id', 'name', 'permissions']
      }]
    });

    if (!user) {
      return res.sendError(res, "User not found.");
    }

    user.verified = true;
    await user.save();
    await UserToken.destroy({ where: { id: tokenRecord.id } });

    const { accessToken, refreshToken } = await generateTokens({
      id: user.id,
      email: user.email,
      role: user.roleDetails?.name || user.role // Use roleDetails if available
    });

    return res.sendSuccess(res, {
      message: "Account verified successfully!",
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.roleDetails?.name || user.role, // Return role name
        roleDetails: user.roleDetails, // Include full role details
        verified: user.verified,
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

    if (!user.verified) {
      return res.sendError(res, "Please verify your email before logging in.");
    }

    // ✅ Check account status ONLY for Student users (not admin or super-admin)
    if (user.role === 'Student') { // Changed from 'user' to 'Student'
      if (user.status !== 'active') {
        if (user.status === 'inactive') {
          return res.sendError(res, "Your account has been suspended. Please contact your teacher.");
        } else if (user.status === 'pending') {
          return res.sendError(res, "Your account is pending approval. Please wait for admin approval.");
        } else if (user.status === 'rejected') {
          return res.sendError(res, "Your account has been rejected. Please contact your teacher.");
        }
        // Fallback for any other status
        return res.sendError(res, "Your account is not active. Please contact your teacher.");
      }
    }

    if (role && user.role !== role) {
      // Update these role checks to match your new role names
      if (role === 'admin' && user.role === 'Student') {
        return res.sendError(res, "This is a Student account. Please select 'Student Account' to login.");
      } else if (role === 'Student' && user.role === 'admin') {
        return res.sendError(res, "This is an Admin account. Please select 'Admin Account' to login.");
      }
    }

    const { id, username, role: userRole } = user;

    // ✅ Fetch user's role permissions from the database
    let userPermissions: string[] = [];

    if (user.role_id) {
      // If user has a role_id, fetch the role with permissions
      const userRole = await Role.findByPk(user.role_id);
      if (userRole && userRole.permissions) {
        // Convert permissions object to array of keys where value is true
        userPermissions = Object.keys(userRole.permissions).filter(
          (key: string) => userRole.permissions[key] === true
        );
      }
    } else {
      // Fallback: If no role_id, use default permissions based on role name
      switch (user.role) {
        case 'Super-Admin':
          userPermissions = ['dashboard', 'teacher', 'student', 'courses', 'activitylogs', 'newsletter']; // Updated permission keys
          break;
        case 'Teacher':
          userPermissions = ['dashboard', 'courses', 'engagement', 'certificates'];
          break;
        case 'Student':
          userPermissions = ['dashboard', 'courses', 'wishlist', 'certificates'];
          break;
        case 'Admin':
          userPermissions = ['dashboard', 'courses', 'engagement'];
          break;
        default:
          userPermissions = ['dashboard']; // Default minimal permissions
      }
    }

    // ✅ Generate tokens with permissions included
    const { accessToken, refreshToken } = await generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: userPermissions // ✅ Pass permissions here
    });

    try {
      const adminActivity = await AdminActivity.create({
        admin_id: user.id,
        activity_type: 'login',
      });
    } catch (activityError: any) {
      console.error('❌ Error recording login activity:', activityError.message);
    }

    return res.sendSuccess(res, {
      user: {
        id,
        username,
        email,
        role: userRole,
        permissions: userPermissions, // ✅ Include permissions in response
        role_id: user.role_id, // Include role_id if needed
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
    const {
      page = 1,
      limit = 10,
      status,
      search,
      email,
      name
    } = req.query;

    // Get role IDs to EXCLUDE (Super-Admin, Student, Teacher)
    const excludedRoles = await Role.findAll({
      where: {
        name: {
          [Op.in]: ['Super-Admin', 'Student', 'Teacher']
        }
      },
      attributes: ['id']
    });

    const excludedRoleIds = excludedRoles.map(role => role.id);

    const whereClause: any = {
      role_id: {
        [Op.notIn]: excludedRoleIds
      }
    };

    // Filter by status if provided
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    // Filter by exact email if provided
    if (email) {
      whereClause.email = { [Op.iLike]: email };
    }

    // Filter by exact username/name if provided
    if (name) {
      whereClause.username = { [Op.iLike]: name };
    }

    // Search filter
    if (search) {
      whereClause[Op.or] = [
        { username: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (Number(page) - 1) * Number(limit);

    // Get paginated users with role details (excluding Super-Admin, Student, Teacher)
    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      include: [{
        model: Role,
        as: 'roleDetails',
        attributes: ['id', 'name', 'permissions']
      }],
      attributes: [
        "id", "username", "email", "role", "verified",
        "profileImage", "createdAt", "status", "updatedAt", "role_id"
      ],
      order: [["createdAt", "DESC"]],
      limit: Number(limit),
      offset: offset
    });

    // Get counts using role_ids (excluding Super-Admin, Student, Teacher)
    const totalUsers = await User.count({
      where: {
        role_id: {
          [Op.notIn]: excludedRoleIds
        }
      }
    });

    const verifiedUsers = await User.count({
      where: {
        role_id: {
          [Op.notIn]: excludedRoleIds
        },
        verified: true
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        users, // Changed from 'admins' to 'users' since we're returning all non-excluded roles
        stats: {
          totalUsers, // Changed from totalAdmins
          verifiedUsers, // Changed from verifiedAdmins
          unverifiedUsers: totalUsers - verifiedUsers // Changed from unverifiedAdmins
        },
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

    if (!adminId) {
      res.status(400).json({
        success: false,
        message: "Admin ID is required"
      });
      return;
    }

    // Check if user has admin role by role_id
    const adminRole = await Role.findOne({ where: { name: 'Admin' } });
    if (!adminRole) {
      res.status(500).json({
        success: false,
        message: "Admin role not found"
      });
      return;
    }

    const admin = await User.findOne({
      where: {
        id: adminId,
        role_id: adminRole.id
      }
    });

    if (!admin) {
      res.status(404).json({
        success: false,
        message: "Admin user not found"
      });
      return;
    }

    // Rest of the function remains the same...
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

    try {
      await sendApprovalEmail(admin.email, admin.username);
    } catch (emailError) {
      console.error("[approveAdmin] ⚠️ Approval email failed to send:", emailError);
    }

    res.status(200).json({
      success: true,
      message: "Admin approved successfully!",
      data: {
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


    await User.update(
      {
        status: 'rejected',
        rejectedBy: superAdminId,
        rejectedAt: new Date(),
        rejectionReason: reason || null
      },
      { where: { id: adminId } }
    );


    let emailSent = false;
    try {
      emailSent = await sendRejectionEmail(admin.email, admin.username);
    } catch (emailError) {
      console.error("[rejectAdmin] ❌ Email error:", emailError);
    }
    res.status(200).json({
      success: true,
      message: emailSent
        ? "Admin application rejected successfully! Rejection email has been sent."
        : "Admin application rejected successfully! However, we couldn't send the rejection email.",
      data: {
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


    // Create logout activity record
    const adminActivity = await AdminActivity.create({
      admin_id: admin_id,
      activity_type: 'logout'
    });


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

  try {

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

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify and decode token using JWT
    let decoded: any;
    try {
      decoded = jwt.verify(token, conf.secret);

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
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }



    // Compare token data with database user
    if (user.email !== decoded.email) {
      return res.status(401).json({
        success: false,
        message: 'Token data mismatch'
      });
    }

    if (user.role !== decoded.role) {
      return res.status(401).json({
        success: false,
        message: 'User role has changed'
      });
    }

    if (!user.verified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before accessing this resource'
      });
    }

    if (user.role === 'admin' && user.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Admin account pending approval'
      });
    }

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
export const getAllUsersforadmin = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const searchTerm = (req.query.search as string)?.trim() || '';
    const filterType = (req.query.filterType as string) || 'all';
    const role_id = req.query.role_id as string; // Get role_id from query params

    // Build base where clause
    const baseWhereClause: any = {};

    // Add role_id filter if provided
    if (role_id) {
      baseWhereClause.role_id = role_id;
    } else {
      // If no role_id provided, exclude Admin and Super-Admin (existing logic)
      const excludedRoles = await Role.findAll({
        where: { name: { [Op.in]: ['Admin', 'Super-Admin'] } },
        attributes: ['id']
      });
      const excludedRoleIds = excludedRoles.map(role => role.id);
      baseWhereClause.role_id = {
        [Op.notIn]: excludedRoleIds
      };
    }

    // Handle verification status filter
    const verificationStatus = req.query.verifyUser;
    if (verificationStatus === 'true' || verificationStatus === 'false') {
      baseWhereClause.verified = verificationStatus === 'true';
    }

    const searchWhereClause = { ...baseWhereClause };

    if (searchTerm) {
      switch (filterType) {
        case 'name':
          searchWhereClause.username = { [Op.like]: `%${searchTerm}%` };
          break;
        case 'email':
          searchWhereClause.email = { [Op.like]: `%${searchTerm}%` };
          break;
        case 'all':
        default:
          searchWhereClause[Op.or] = [
            { username: { [Op.like]: `%${searchTerm}%` } },
            { email: { [Op.like]: `%${searchTerm}%` } }
          ];
          break;
      }
    }

    // Get counts using the same baseWhereClause (which now includes role_id filter)
    const [totalUsers, activeUsers, inactiveUsers] = await Promise.all([
      User.count({ where: baseWhereClause }),
      User.count({ where: { ...baseWhereClause, status: 'active' } }),
      User.count({ where: { ...baseWhereClause, status: 'inactive' } })
    ]);

    // Fetch users with role details
    const { rows: users, count: filteredUsersCount } = await User.findAndCountAll({
      where: searchWhereClause,
      include: [{
        model: Role,
        as: 'roleDetails',
        attributes: ['id', 'name', 'permissions']
      }],
      offset,
      limit,
      order: [['createdAt', 'DESC']],
    });

    // Process user data...
    const result = await Promise.all(
      users.map(async (user) => {
        const enrollments = await Enrollment.findAll({
          where: { user_id: user.id },
        });

        const enrolledCourses = await Promise.all(
          enrollments.map(async (enrollment) => {
            const course = await Course.findByPk(enrollment.course_id);
            if (!course) return null;

            const chapters = await Chapter.findAll({
              where: { course_id: course.id },
              order: [['order', 'ASC']],
            });

            const userProgress = await UserProgress.findAll({
              where: { user_id: user.id, course_id: course.id },
            });

            const completedChapters = userProgress.filter(p => p.completed).length;
            const totalChapters = chapters.length;
            const percentage = totalChapters === 0 ? 0 : Math.round((completedChapters / totalChapters) * 100);

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

        const validEnrolledCourses = enrolledCourses.filter(course => course !== null);

        return {
          id: user.id,
          username: user.username,
          status: user.status,
          verifyUser: user.verified,
          role: user.roleDetails?.name || user.role,
          role_id: user.role_id,
          email: user.email,
          createdAt: user.createdAt,
          profileImage: user.profileImage || null,
          enrolledCourses: validEnrolledCourses,
        };
      })
    );

    return res.sendSuccess(res, {
      currentPage: page,
      totalPages: Math.ceil(filteredUsersCount / limit),
      totalUsers,
      activeUsers,
      inactiveUsers,
      filteredUsersCount,
      searchTerm: searchTerm || null,
      filterType: filterType,
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

    if (!token) {
      return res.sendError(res, "Token is required");
    }

    // Find the token in the UserToken table
    const userToken = await UserToken.findOne({
      where: { token: token },
    });

    if (!userToken) {
      return res.sendError(res, "Invalid or expired reset token. Please request a new password reset link.");
    }

    // Find the user associated with this token
    const user = await User.findByPk(userToken.user_id);

    if (!user) {
      return res.sendError(res, "User not found");
    }


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


    // Validate userId
    if (!userId || isNaN(parseInt(userId))) {
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


export const deactivateUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    // Validate userId
    if (!userId) {
      return res.sendError(res, "User ID is required");
    }

    // Find the user
    const user = await User.findOne({ where: { id: userId } });

    if (!user) {
      return res.sendError(res, "User not found");
    }

    // Prevent deactivating admin or super-admin accounts
    if (user.role === 'admin' || user.role === 'super-admin') {
      return res.sendError(res, "Cannot deactivate admin accounts");
    }

    // Check if already inactive
    if (user.status === 'inactive') {
      return res.sendError(res, "User account is already inactive");
    }

    // Update status to inactive
    await user.update({ status: 'inactive' });

    return res.sendSuccess(res, {
      message: "User account has been deactivated successfully",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        status: user.status
      }
    });

  } catch (error: any) {
    console.error("Deactivate user error:", error);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

export const activateUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    // Validate userId
    if (!userId) {
      return res.sendError(res, "User ID is required");
    }

    // Find the user
    const user = await User.findOne({ where: { id: userId } });

    if (!user) {
      return res.sendError(res, "User not found");
    }

    // Check if already active
    if (user.status === 'active') {
      return res.sendError(res, "User account is already active");
    }

    // Update status to active
    await user.update({ status: 'active' });

    return res.sendSuccess(res, {
      message: "User account has been activated successfully",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        status: user.status
      }
    });

  } catch (error: any) {
    console.error("Activate user error:", error);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};



export const getDashboardStatsOptimized = async (req, res) => {
  try {
    // Execute all counts in parallel for better performance
    const [
      totalUsers,
      adminUsers,
      regularUsers,
      verifiedUsers,
      unverifiedUsers,
      approvedAdmins,
      rejectedAdmins,
      pendingAdmins,
      totalChapters,
      totalCourses,
      activeCourses,
      inactiveCourses,
      draftCourses,
      totalCertificates,
      totalEnrollments // Added total enrollments count
    ] = await Promise.all([
      User.count(),
      User.count({ where: { role: 'admin' } }),
      User.count({ where: { role: 'user' } }),
      User.count({ where: { role: 'user', verified: true } }),
      User.count({ where: { role: 'user', verified: false } }),
      User.count({ where: { role: 'admin', status: 'approved' } }),
      User.count({ where: { role: 'admin', status: 'rejected' } }),
      User.count({ where: { role: 'admin', status: 'pending' } }),
      Chapter.count(),
      Course.count(),
      Course.count({ where: { status: 'active', is_active: true } }),
      Course.count({ where: { status: 'inactive', is_active: false } }),
      Course.count({ where: { status: 'draft' } }),
      Certificate.count(),
      Enrollment.count() // Added enrollment count
    ]);

    const stats = {
      users: {
        total: totalUsers,
        byRole: {
          admin: adminUsers,
          user: regularUsers
        },
        userVerification: {
          verified: verifiedUsers,
          unverified: unverifiedUsers
        },
        adminStatus: {
          approved: approvedAdmins,
          rejected: rejectedAdmins,
          pending: pendingAdmins
        }
      },
      chapters: {
        total: totalChapters
      },
      courses: {
        total: totalCourses,
        active: activeCourses,
        inactive: inactiveCourses,
        draft: draftCourses
      },
      certificates: {
        total: totalCertificates
      },
      enrollments: { // Added enrollments section
        total: totalEnrollments
      },
      summary: {
        totalUsers,
        totalAdmins: adminUsers,
        totalChapters,
        totalCourses,
        activeCourses,
        inactiveCourses,
        totalCertificates,
        totalEnrollments // Added to summary
      }
    };

    res.status(200).json({
      success: true,
      message: 'Dashboard statistics retrieved successfully',
      data: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving dashboard statistics',
      error: error.message
    });
  }
};


export const getCourseAuditLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort_by = 'action_timestamp',
      sort_order = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;

    const { count, rows: auditLogs } = await CourseAuditLog.findAndCountAll({
      order: [[sort_by, sort_order.toUpperCase()]],
      limit: parseInt(limit),
      offset: offset
    });

    res.status(200).json({
      success: true,
      data: auditLogs,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(count / limit),
        total_records: count,
        has_next: page * limit < count,
        has_prev: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// routes/instructorDashboard.js
export const getInstructorDashboardStatsOptimized = async (req, res) => {
  try {
    // Check if user is authenticated and get instructor ID
    const instructorId = req.user?.id || req.user?._id;

    if (!instructorId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in again.',
        error: 'User not authenticated'
      });
    }


    // Execute all counts in parallel for better performance
    const [
      totalCourses,
      activeCourses,
      inactiveCourses,
      draftCourses,
      totalChapters,
      totalEnrollments,
      activeEnrollments,
      completedEnrollments,
      totalCertificatesIssued,
      totalRevenue,
      averageRating,
      totalStudents
    ] = await Promise.all([
      Course.count({ where: { instructorId } }),
      Course.count({ where: { instructorId, status: 'active', is_active: true } }),
      Course.count({ where: { instructorId, status: 'inactive', is_active: false } }),
      Course.count({ where: { instructorId, status: 'draft' } }),
      Chapter.count({
        include: [{
          model: Course,
          where: { instructorId },
          attributes: []
        }]
      }),
      Enrollment.count({
        include: [{
          model: Course,
          where: { instructorId },
          attributes: []
        }]
      }),
      Enrollment.count({
        where: { status: 'active' },
        include: [{
          model: Course,
          where: { instructorId },
          attributes: []
        }]
      }),
      Enrollment.count({
        where: { status: 'completed' },
        include: [{
          model: Course,
          where: { instructorId },
          attributes: []
        }]
      }),
      Certificate.count({
        include: [{
          model: Course,
          where: { instructorId },
          attributes: []
        }]
      }),
      Enrollment.sum('amount_paid', {
        include: [{
          model: Course,
          where: { instructorId },
          attributes: []
        }]
      }) || 0,
      Course.findOne({
        where: { instructorId },
        attributes: [
          [sequelize.fn('AVG', sequelize.col('rating')), 'avgRating']
        ],
        raw: true
      }).then(result => result?.avgRating ? parseFloat(result.avgRating).toFixed(2) : 0),
      Enrollment.count({
        distinct: true,
        col: 'userId',
        include: [{
          model: Course,
          where: { instructorId },
          attributes: []
        }]
      })
    ]);

    const stats = {
      courses: {
        total: totalCourses,
        active: activeCourses,
        inactive: inactiveCourses,
        draft: draftCourses
      },
      chapters: {
        total: totalChapters,
        averagePerCourse: totalCourses > 0 ? (totalChapters / totalCourses).toFixed(2) : 0
      },
      enrollments: {
        total: totalEnrollments,
        active: activeEnrollments,
        completed: completedEnrollments,
        completionRate: totalEnrollments > 0
          ? ((completedEnrollments / totalEnrollments) * 100).toFixed(2) + '%'
          : '0%'
      },
      students: {
        total: totalStudents,
        averagePerCourse: totalCourses > 0 ? (totalStudents / totalCourses).toFixed(2) : 0
      },
      certificates: {
        total: totalCertificatesIssued
      },
      performance: {
        averageRating: parseFloat(averageRating),
        totalRevenue: parseFloat(totalRevenue).toFixed(2)
      },
      summary: {
        totalCourses,
        activeCourses,
        totalChapters,
        totalEnrollments,
        totalStudents,
        totalCertificatesIssued,
        averageRating: parseFloat(averageRating),
        totalRevenue: parseFloat(totalRevenue).toFixed(2)
      }
    };

    res.status(200).json({
      success: true,
      message: 'Instructor dashboard statistics retrieved successfully',
      data: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching instructor dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving instructor dashboard statistics',
      error: error.message
    });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;


    // Validate userId
    if (!userId || isNaN(Number(userId))) {
      return res.status(400).json({
        success: false,
        message: "Valid user ID is required"
      });
    }

    // Find user by primary key (id)
    const user = await User.findByPk(userId, {
      attributes: {
        exclude: ['password'] // Exclude password for security
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }


    // Return user data
    return res.status(200).json({
      success: true,
      message: "User retrieved successfully",
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        verified: user.verified,
        profileImage: user.profileImage,
        bio: user.bio,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });

  } catch (error: any) {
    console.error("[getUserById] Error:", error);
    return res.status(500).json({
      success: false,
      message: "ERR_INTERNAL_SERVER_ERROR",
      error: error.message
    });
  }
};

export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { username, bio } = req.body;


    // Validate userId
    if (!userId || isNaN(Number(userId))) {
      return res.status(400).json({
        success: false,
        message: "Valid user ID is required"
      });
    }

    // Check if user exists
    const existingUser = await User.findByPk(userId);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Prepare update data
    const updateData: any = {};

    // Update username if provided
    if (username) {
      if (username.length < 3 || username.length > 30) {
        return res.status(400).json({
          success: false,
          message: "Username must be between 3 and 30 characters"
        });
      }

      // Check if username already exists (excluding current user)
      const existingUsername = await User.findOne({
        where: {
          username,
          id: { [Op.ne]: userId }
        }
      });

      if (existingUsername) {
        return res.status(400).json({
          success: false,
          message: "Username already taken"
        });
      }

      updateData.username = username;
    }

    // Update bio if provided
    if (bio !== undefined) {
      if (bio.length > 500) {
        return res.status(400).json({
          success: false,
          message: "Bio cannot exceed 500 characters"
        });
      }
      updateData.bio = bio;
    }

    // Handle profile image upload
    if (req.file) {

      // Delete old profile image if exists
      if (existingUser.profileImage) {
        try {
          const fs = require('fs').promises;
          const path = require('path');
          const oldImagePath = path.join(__dirname, '..', 'uploads', existingUser.profileImage);

          await fs.unlink(oldImagePath);
        } catch (error) {
          console.error("[updateUserProfile] Error deleting old image:", error);
          // Continue with update even if deletion fails
        }
      }

      // Store only the filename in database
      updateData.profileImage = req.file.filename;
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No data provided for update"
      });
    }

    // Update user
    await User.update(updateData, {
      where: { id: userId }
    });

    // Fetch updated user
    const updatedUser = await User.findByPk(userId, {
      attributes: { exclude: ['password'] }
    });



    // Return updated user data
    return res.status(200).json({
      success: true,
      message: "User profile updated successfully",
      data: {
        id: updatedUser?.id,
        username: updatedUser?.username,
        email: updatedUser?.email,
        role: updatedUser?.role,
        verified: updatedUser?.verified,
        profileImage: updatedUser?.profileImage,
        bio: updatedUser?.bio,
        status: updatedUser?.status,
        createdAt: updatedUser?.createdAt,
        updatedAt: updatedUser?.updatedAt
      }
    });

  } catch (error: any) {
    console.error("[updateUserProfile] Error:", error);
    return res.status(500).json({
      success: false,
      message: "ERR_INTERNAL_SERVER_ERROR",
      error: error.message
    });
  }
};

export const getAdminCourseStats = async (req: Request, res: Response) => {
  try {
    const adminId = req.params.adminId || req.user?.id; // Get from params or authenticated user

    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: 'Admin ID is required'
      });
    }

    // 1. Get total courses created by admin
    const totalCourses = await Course.count({
      where: { userId: adminId }
    });

    // 2. Get total active courses
    const totalActiveCourses = await Course.count({
      where: {
        userId: adminId,
        is_active: true
      }
    });

    // 3. Get ALL courses created by admin with full details
    const adminCourses = await Course.findAll({
      where: { userId: adminId },
      attributes: ['id', 'title', 'subtitle', 'category', 'price', 'image', 'ratings', 'status', 'is_active', 'createdAt']
    });

    const courseIds = adminCourses.map(course => course.id);

    // 4. Get total enrollments for admin's courses
    const totalEnrollments = await Enrollment.count({
      where: {
        course_id: {
          [Op.in]: courseIds
        }
      }
    });

    // 5. Get total users who completed courses (have certificate entries)
    const totalUsersCompleted = await Certificate.count({
      where: {
        course_id: {
          [Op.in]: courseIds
        },
        status: 'issued'
      }
    });

    // 6. Get enrollment count and completion count for EACH course
    const enrollmentCounts: { [key: number]: number } = {};
    const completionCounts: { [key: number]: number } = {};

    if (courseIds.length > 0) {
      // Get enrollments for ALL courses
      const enrollments = await Enrollment.findAll({
        where: {
          course_id: {
            [Op.in]: courseIds
          }
        },
        attributes: ['course_id']
      });

      // Count enrollments for each course
      enrollments.forEach((enrollment: any) => {
        const courseId = enrollment.course_id;
        enrollmentCounts[courseId] = (enrollmentCounts[courseId] || 0) + 1;
      });

      // Get completion counts for ALL courses
      const certificates = await Certificate.findAll({
        where: {
          course_id: {
            [Op.in]: courseIds
          },
          status: 'issued'
        },
        attributes: ['course_id']
      });

      // Count completions for each course
      certificates.forEach((certificate: any) => {
        const courseId = certificate.course_id;
        completionCounts[courseId] = (completionCounts[courseId] || 0) + 1;
      });
    }

    // 7. Create array with ALL courses and their stats
    const allCoursesWithStats = adminCourses.map((course: any) => {
      const courseData = course.toJSON();
      return {
        ...courseData,
        enrollment_count: enrollmentCounts[course.id] || 0,
        completion_count: completionCounts[course.id] || 0
      };
    });

    // 8. Get top 3 courses with most enrollments (separately)
    const top3Courses = [...allCoursesWithStats]
      .sort((a, b) => b.enrollment_count - a.enrollment_count)
      .slice(0, 3);

    return res.status(200).json({
      success: true,
      data: {
        total_courses: totalCourses,
        total_active_courses: totalActiveCourses,
        total_enrollments: totalEnrollments,
        total_users_completed: totalUsersCompleted,
        // ALL courses with enrollment_count and completion_count for EACH course
        all_courses: allCoursesWithStats,
        // Top 3 courses separately
        top_3_courses: top3Courses
      }
    });

  } catch (error) {
    console.error('Error fetching admin course stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch course statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};


export const getAdminCourseStatsOptimized = async (req: Request, res: Response) => {
  try {
    const adminId = req.params.adminId || req.user?.id;

    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: 'Admin ID is required'
      });
    }

    // Get total courses
    const totalCourses = await Course.count({
      where: { userId: adminId }
    });

    // Get courses with enrollment counts using raw query
    const [results]: any = await Course.sequelize?.query(`
      SELECT 
        c.id,
        c.title,
        c.subtitle,
        c.category,
        c.price,
        c.image,
        c.ratings,
        c.status,
        c.is_active,
        COUNT(e.id) as enrollment_count
      FROM courses c
      LEFT JOIN enrollments e ON c.id = e.course_id
      WHERE c.userId = :adminId
      GROUP BY c.id
      ORDER BY enrollment_count DESC
    `, {
      replacements: { adminId },
      type: 'SELECT'
    }) || [[], {}];

    const totalEnrollments = results.reduce((sum: number, course: any) =>
      sum + parseInt(course.enrollment_count || 0), 0
    );

    const top3Courses = results.slice(0, 3).map((course: any) => ({
      id: course.id,
      title: course.title,
      subtitle: course.subtitle,
      category: course.category,
      price: course.price,
      image: course.image,
      ratings: course.ratings,
      status: course.status,
      is_active: course.is_active,
      enrollment_count: parseInt(course.enrollment_count || 0)
    }));

    return res.status(200).json({
      success: true,
      data: {
        total_courses: totalCourses,
        total_enrollments: totalEnrollments,
        top_3_courses: top3Courses
      }
    });

  } catch (error) {
    console.error('Error fetching admin course stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch course statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};