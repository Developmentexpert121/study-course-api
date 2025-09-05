import UserProgress from "../../models/userProgress.model";
import Enrollment from "../../models/enrollment.model";
import Chapter from "../../models/chapter.model";
import { Request, Response } from "express";
import User from "../../models/user.model";
import Course from "../../models/course.model";


export const enrollInCourse = async (req: Request, res: Response) => {
  try {
    const { user_id, course_id }: any = req.body;
    console.log("-----------user",user_id)
    if (!user_id || !course_id) {
      return res.sendError(res, "user_id and course_id are required");
    }

    const user = await User.findByPk(user_id);
    if (!user) return res.sendError(res, "User not found");

    const course = await Course.findByPk(course_id);
    if (!course) return res.sendError(res, "Course not found");

    const existing = await Enrollment.findOne({ where: { user_id, course_id } });
    if (existing) return res.sendError(res, "Already enrolled");

    await Enrollment.create({ user_id, course_id });

    const firstChapter = await Chapter.findOne({
      where: { course_id },
      order: [['order', 'ASC']],
    });

    if (firstChapter) {
      await UserProgress.create({
        user_id,
        course_id,
        chapter_id: firstChapter.id,
        completed: false,
        mcq_passed: false,
        locked: false,
      });
    } else {
      return res.sendError(res, "No chapters found in this course");
    }

    return res.sendSuccess(res, {
      message: "Enrolled successfully. First chapter unlocked.",
    });
  } catch (err) {
    console.error("[enrollInCourse] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};




export const getMyEnrolledCourses = async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId;
    const { search, active } = req.query;

    if (!userId) {
      return res.sendError(res, "userId is required as query parameter");
    }

    // Check if user exists
    const user = await User.findByPk(userId as string);
    if (!user) {
      return res.sendError(res, "User not found");
    }

    // Build where conditions for filtering
    const where: any = {};

    if (active !== undefined) {
      where.is_active = active === "true";
    }

    if (search && typeof search === "string") {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { category: { [Op.iLike]: `%${search}%` } },
        { creator: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Get enrolled courses with enrollment details
    const enrolledCourses = await Course.findAll({
      where,
      include: [{
        model: Enrollment,
        as: 'enrollments',
        where: { user_id: userId as string },
        required: true, // This makes it an INNER JOIN
        attributes: ['id', 'user_id', 'createdAt'] // Enrollment details
      }],
      order: [[{ model: Enrollment, as: 'enrollments' }, 'createdAt', 'DESC']],
      attributes: [
        'id', 'title', 'description', 'category', 'is_active', 
        'image', 'creator', 'ratings', 'createdAt', 'updatedAt'
      ]
    });

    // Format the response
    const formattedCourses = enrolledCourses.map(course => {
      const enrollment = course.enrollments[0]; // Get the first enrollment (should only be one per user)
      return {
        enrollment_id: enrollment.id,
        enrolled_at: enrollment.createdAt,
        user_id: enrollment.user_id,
        course: {
          id: course.id,
          title: course.title,
          description: course.description,
          category: course.category,
          is_active: course.is_active,
          image: course.image,
          creator: course.creator,
          ratings: course.ratings,
          created_at: course.createdAt,
          updated_at: course.updatedAt
        }
      };
    });

    return res.sendSuccess(res, {
      user_id: userId,
      count: formattedCourses.length,
      enrollments: formattedCourses,
    });
  } catch (err) {
    console.error("[getMyEnrolledCourses] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};




export const getStatusEnrolled = async (req: Request, res: Response) => {
  try {
    const { user_id, course_id }: any = req.query;

    // Validate required query params
    if (!user_id || !course_id) {
      return res.status(400).json({
        success: false,
        message: "user_id and course_id are required",
      });
    }

    // Check if user is enrolled
    const enrollment = await Enrollment.findOne({
      where: { user_id, course_id },
    });

    // If not enrolled, return 200 OK with enrolled: false
    if (!enrollment) {
      return res.status(200).json({
        success: true,
        data: {
          enrolled: false,
          message: "User is not enrolled in this course",
        },
      });
    }

    // Optional: Get user progress (if exists)
    const progress = await UserProgress.findOne({
      where: { user_id, course_id },
      order: [["updatedAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      data: {
        enrolled: true,
        message: "User is enrolled in this course",
        progress: progress
          ? {
              chapter_id: progress.chapter_id,
              completed: progress.completed,
              mcq_passed: progress.mcq_passed,
              locked: progress.locked,
            }
          : null,
      },
    });
  } catch (err) {
    console.error("[getStatusEnrolled] Error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const unenrollFromCourse = async (req: Request, res: Response) => {
  try {
      const { user_id, course_id }: any = req.query;

    if (!user_id || !course_id) {
      return res.sendError(res, "user_id and course_id are required");
    }

    // Check if user exists
    const user = await User.findByPk(user_id);
    if (!user) return res.sendError(res, "User not found");

    // Check if course exists
    const course = await Course.findByPk(course_id);
    if (!course) return res.sendError(res, "Course not found");

    // Check if user is enrolled
    const enrollment = await Enrollment.findOne({ 
      where: { user_id, course_id } 
    });
    
    if (!enrollment) {
      return res.sendError(res, "User is not enrolled in this course");
    }

    // Delete all user progress for this course
    await UserProgress.destroy({
      where: { user_id, course_id }
    });

    // Delete the enrollment
    await Enrollment.destroy({
      where: { user_id, course_id }
    });

    return res.sendSuccess(res, {
      message: "Successfully unenrolled from the course"
    });
  } catch (err) {
    console.error("[unenrollFromCourse] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};