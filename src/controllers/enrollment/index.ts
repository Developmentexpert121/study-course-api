import UserProgress from "../../models/userProgress.model";
import Enrollment from "../../models/enrollment.model";
import Chapter from "../../models/chapter.model";
import { Request, Response } from "express";
import User from "../../models/user.model";
import Course from "../../models/course.model";
import { Op } from "sequelize";
import McqSubmission from "../../models/mcqSubmission.model"
import Mcq from "../../models/mcq.model";

export const enrollInCourse = async (req: Request, res: Response) => {
  try {
    const { user_id, course_id }: any = req.body;
    console.log("-----------user", user_id);

    if (!user_id || !course_id) {
      return res.status(400).sendError(res, "user_id and course_id are required");
    }

    const user = await User.findByPk(user_id);
    if (!user) return res.status(404).sendError(res, "User not found");

    const course = await Course.findByPk(course_id);
    if (!course) return res.status(404).sendError(res, "Course not found");

    const existing = await Enrollment.findOne({ where: { user_id, course_id } });
    if (existing) return res.status(400).sendError(res, "Already enrolled");

    // Create enrollment with enrolled_at
    await Enrollment.create({
      user_id,
      course_id,
      enrolled_at: new Date()
    });

    const firstChapter = await Chapter.findOne({
      where: { course_id },
      order: [['order', 'ASC']],
    });

    if (firstChapter) {
      // Use findOrCreate to avoid duplicates
      const [userProgress, created] = await UserProgress.findOrCreate({
        where: {
          user_id,
          course_id,
          chapter_id: firstChapter.id
        },
        defaults: {
          completed: false,
          mcq_passed: false,
          locked: false,
        }
      });

      const message = created
        ? "Enrolled successfully. First chapter unlocked."
        : "Enrolled successfully. Progress record already exists.";

      return res.status(200).sendSuccess(res, {
        message,
      });
    } else {
      return res.status(400).sendError(res, "No chapters found in this course");
    }
  } catch (err) {
    console.error("[enrollInCourse] Error:", err);
    return res.status(500).sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

export const getMyEnrolledCourses = async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    const { search, active, page = 1, limit = 10 } = req.query;

    if (!userId) {
      return res.sendError(res, "userId is required as query parameter");
    }

    // Check if user exists
    const user = await User.findByPk(userId);
    if (!user) {
      return res.sendError(res, "User not found");
    }

    // Build where conditions for filtering
    const courseWhere: any = {};

    if (active !== undefined) {
      courseWhere.is_active = active === "true";
    }

    if (search && typeof search === "string") {
      courseWhere[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { category: { [Op.iLike]: `%${search}%` } },
        { creator: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Get total count for pagination
    const totalCount = await Course.count({
      where: courseWhere,
      include: [{
        model: Enrollment,
        as: 'enrollments',
        where: { user_id: userId },
        required: true
      }]
    });

    const totalPages = Math.ceil(totalCount / Number(limit));

    // Get enrolled courses with enrollment details - FIXED
    const enrolledCourses = await Course.findAll({
      where: courseWhere,
      include: [{
        model: Enrollment,
        as: 'enrollments',
        where: { user_id: userId },
        required: true,
        // Remove attributes to avoid column mapping issues
      }],
      order: [[{ model: Enrollment, as: 'enrollments' }, 'createdAt', 'DESC']],
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      attributes: [
        'id', 'title', 'description', 'category', 'is_active',
        'image', 'creator', 'ratings', 'createdAt', 'updatedAt'
      ]
    });

    // Get progress data for each course
    const formattedCourses = await Promise.all(
      enrolledCourses.map(async (course) => {
        const enrollment = course.enrollments[0];

        try {
          // Get only chapters that have at least one active MCQ
          const chaptersWithMcqs = await Chapter.findAll({
            where: { course_id: course.id },
            attributes: ['id'],
            include: [
              {
                model: Mcq,
                attributes: ['id'],
                required: true,
                where: {
                  is_active: true
                }
              }
            ],
            distinct: true
          });

          const totalChaptersWithMCQs = chaptersWithMcqs.length;

          // Get user's passed chapters in this course (only those with MCQs)
          const chapterIdsWithMCQs = chaptersWithMcqs.map(chapter => chapter.id);

          const passingSubmissions = await McqSubmission.findAll({
            where: {
              user_id: userId,
              course_id: course.id,
              passed: true,
              chapter_id: {
                [Op.in]: chapterIdsWithMCQs
              }
            },
            attributes: ['chapter_id'],
            group: ['chapter_id']
          });

          const passedChaptersCount = passingSubmissions.length;

          // Calculate progress percentage based only on chapters with MCQs
          const progress_percentage = totalChaptersWithMCQs > 0
            ? Math.round((passedChaptersCount / totalChaptersWithMCQs) * 100)
            : 0;

          return {
            enrollment_id: enrollment.id,
            enrolled_at: enrollment.enrolled_at, // Use enrolled_at
            user_id: enrollment.user_id,
            enrollment_date: enrollment.createdAt, // Use createdAt
            progress: {
              total_chapters: totalChaptersWithMCQs,
              completed_chapters: passedChaptersCount,
              progress_percentage: progress_percentage
            },
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
        } catch (error) {
          console.error(`Error getting progress for course ${course.id}:`, error);
          return {
            enrollment_id: enrollment.id,
            enrolled_at: enrollment.enrolled_at,
            user_id: enrollment.user_id,
            enrollment_date: enrollment.createdAt,
            progress: {
              total_chapters: 0,
              completed_chapters: 0,
              progress_percentage: 0
            },
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
        }
      })
    );

    return res.sendSuccess(res, {
      user_id: userId,
      count: formattedCourses.length,
      totalCount: totalCount,
      totalPages: totalPages,
      currentPage: Number(page),
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

    // Check if user is enrolled - DON'T specify attributes, let Sequelize handle it
    const enrollment = await Enrollment.findOne({
      where: { user_id, course_id },
      // Remove attributes to avoid the column mapping issue
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
        enrollment_date: enrollment.enrolled_at, // Use enrolled_at
        enrolled_at: enrollment.createdAt, // Use createdAt for timestamp
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