import UserProgress from "../../models/userProgress.model";
import Enrollment from "../../models/enrollment.model";
import Chapter from "../../models/chapter.model";
import { Request, Response } from "express";
import User from "../../models/user.model";
import Course from "../../models/course.model";
import { Op } from "sequelize";
import McqSubmission from "../../models/mcqSubmission.model"
import Mcq from "../../models/mcq.model";
import Lesson from "../../models/lesson.model";
import CourseAuditLog from "../../models/CourseAuditLog.model"
import Ratings from "../../models/rating.model";


const createAuditLog = async (
  courseId: number,
  courseTitle: string,
  action: string,
  userId: number | undefined,
  userName: string | undefined,
  changedFields: any = null,
  isActiveStatus: boolean | null = null
) => {
  try {
    await CourseAuditLog.create({
      course_id: courseId,
      course_title: courseTitle,
      action,
      user_id: userId || null,
      user_name: userName || 'System',
      changed_fields: changedFields,
      is_active_status: isActiveStatus,
      action_timestamp: new Date()
    });
  } catch (error) {
    console.error('[createAuditLog] Error:', error);
  }
};

export const enrollInCourse = async (req: Request, res: Response) => {
  try {
    const { user_id, course_id }: any = req.body;

    if (!user_id || !course_id) {
      return res.status(400).sendError(res, "user_id and course_id are required");
    }

    const user = await User.findByPk(user_id);
    if (!user) return res.status(404).sendError(res, "User not found");

    const course = await Course.findByPk(course_id);
    if (!course) return res.status(404).sendError(res, "Course not found");

    const existing = await Enrollment.findOne({ where: { user_id, course_id } });
    if (existing) return res.status(400).sendError(res, "Already enrolled");

    // Create enrollment with enrolled_at - Store in variable
    const enrollment = await Enrollment.create({
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

      const currentUserId = req.user?.id;
      const currentUserIdNumber = parseInt(currentUserId as string, 10);
      const currentUser = await User.findByPk(currentUserId);
      const currentUserName = currentUser?.username || currentUser?.email || "System";

      // Create audit log for enrollment
      await createAuditLog(
        course_id,
        course.title,
        'enrolled',
        currentUserIdNumber,
        currentUserName,
        {
          enrollment_id: enrollment.id,
          student_name: user.username || user.email,
          enrolled_at: enrollment.enrolled_at,
          first_chapter_unlocked: firstChapter.id,
          progress_record_created: created
        },
        true
      );

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

// export const getMyEnrolledCourses = async (req: Request, res: Response) => {
//   try {
//     const userId = req.query.userId as string;
//     const { search, active, page = 1, limit = 10 } = req.query;

//     if (!userId) {
//       return res.sendError(res, "userId is required as query parameter");
//     }

//     const user = await User.findByPk(userId);
//     if (!user) {
//       return res.sendError(res, "User not found");
//     }

//     const courseWhere: any = {};
//     if (active !== undefined) courseWhere.is_active = active === "true";

//     if (search && typeof search === "string") {
//       courseWhere[Op.or] = [
//         { title: { [Op.iLike]: `%${search}%` } },
//         { description: { [Op.iLike]: `%${search}%` } },
//         { category: { [Op.iLike]: `%${search}%` } },
//         { creator: { [Op.iLike]: `%${search}%` } }
//       ];
//     }

//     const totalCount = await Course.count({
//       where: courseWhere,
//       include: [{
//         model: Enrollment,
//         as: 'enrollments',
//         where: { user_id: userId },
//         required: true
//       }]
//     });

//     const totalPages = Math.ceil(totalCount / Number(limit));

//     const enrolledCourses = await Course.findAll({
//       where: courseWhere,
//       include: [{
//         model: Enrollment,
//         as: 'enrollments',
//         where: { user_id: userId },
//         required: true
//       }],
//       order: [[{ model: Enrollment, as: 'enrollments' }, 'createdAt', 'DESC']],
//       limit: Number(limit),
//       offset: (Number(page) - 1) * Number(limit),
//       attributes: [
//         'id', 'title', 'description', 'category', 'is_active',
//         'image', 'creator', 'ratings', 'createdAt', 'updatedAt'
//       ]
//     });

//     // 🌟 ENHANCED: Fetch full progress details per course
//     const formattedCourses = await Promise.all(
//       enrolledCourses.map(async (course) => {
//         const enrollment = course.enrollments[0];

//         // use your progress helper from progress.controller.ts
//         const progressData = await getUserCourseProgressData(userId, course.id.toString());

//         return {
//           enrollment_id: enrollment.id,
//           user_id: enrollment.user_id,
//           enrolled_at: enrollment.enrolled_at,
//           course: {
//             id: course.id,
//             title: course.title,
//             description: course.description,
//             category: course.category,
//             image: course.image,
//             creator: course.creator,
//             ratings: course.ratings,
//             is_active: course.is_active,
//             created_at: course.createdAt,
//             updated_at: course.updatedAt
//           },
//           progress: progressData // 👈 full structured progress detail
//         };
//       })
//     );

//     return res.sendSuccess(res, {
//       user_id: userId,
//       count: formattedCourses.length,
//       totalCount,
//       totalPages,
//       currentPage: Number(page),
//       enrollments: formattedCourses,
//     });

//   } catch (err) {
//     console.error("[getMyEnrolledCourses] Error:", err);
//     return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
//   }
// };


export const getMyEnrolledCourses = async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    const { search, active, page = 1, limit = 10,status } = req.query;

    if (!userId) {
      return res.sendError(res, "userId is required as query parameter");
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.sendError(res, "User not found");
    }

    const courseWhere: any = {};
    if (active !== undefined) courseWhere.is_active = active === "true";

    if (search && typeof search === "string") {
      courseWhere[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { category: { [Op.iLike]: `%${search}%` } },
        { creator: { [Op.iLike]: `%${search}%` } }
      ];  
    }

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

    const enrolledCourses = await Course.findAll({
      where: courseWhere,
      include: [{
        model: Enrollment,
        as: 'enrollments',
        where: { user_id: userId },
        required: true,
        attributes: ['id', 'user_id', 'course_id', 'batch', 'enrolled_at', 'createdAt'] // 👈 Include batch
      }],
      order: [[{ model: Enrollment, as: 'enrollments' }, 'createdAt', 'DESC']],
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      attributes: [
        'id', 'title', 'description', 'category', 'is_active',
        'image', 'creator', 'ratings', 'createdAt', 'updatedAt'
      ]
    });

    // 🌟 ENHANCED: Fetch full progress details per course
    const formattedCourses = await Promise.all(
      enrolledCourses.map(async (course) => {
        const enrollment = course.enrollments[0];

        // use your progress helper from progress.controller.ts
        const progressData = await getUserCourseProgressData(userId, course.id.toString());

        return {
          enrollment_id: enrollment.id,
          user_id: enrollment.user_id,
          course_id: enrollment.course_id, // 👈 Added for clarity
          batch: enrollment.batch, // 👈 Include batch number
          enrolled_at: enrollment.enrolled_at,
          course: {
            id: course.id,
            title: course.title,
            description: course.description,
            category: course.category,
            image: course.image,
            creator: course.creator,
            ratings: course.ratings,
            is_active: course.is_active,
            created_at: course.createdAt,
            updated_at: course.updatedAt
          },
          progress: progressData // 👈 full structured progress detail
        };
      })
    );

    return res.sendSuccess(res, {
      user_id: userId,
      count: formattedCourses.length,
      totalCount,
      totalPages,
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

    // Store enrollment data before deletion for audit log
    const enrolledAt = enrollment.enrolled_at;

    // Delete all user progress for this course
    await UserProgress.destroy({
      where: { user_id, course_id }
    });

    // Delete the enrollment
    await Enrollment.destroy({
      where: { user_id, course_id }
    });

    // Get current authenticated user info for audit log
    const currentUserId = req.user?.id;
    const currentUserIdNumber = parseInt(currentUserId as string, 10);
    const currentUser = await User.findByPk(currentUserId);
    const currentUserName = currentUser?.username || currentUser?.email || "System";

    // Create audit log for unenrollment
    await createAuditLog(
      course_id,
      course.title,
      'unenrolled',
      currentUserIdNumber,
      currentUserName,
      {
        student_name: user.username || user.email,
        unenrolled_at: new Date(),
        enrolled_duration: enrolledAt ? new Date().getTime() - new Date(enrolledAt).getTime() : null,
        progress_records_deleted: true
      },
      false
    );

    return res.sendSuccess(res, {
      message: "Successfully unenrolled from the course"
    });
  } catch (err) {
    console.error("[unenrollFromCourse] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
}

const getUserCourseProgressData = async (user_id: string, courseId: string) => {
  const chapters = await Chapter.findAll({
    where: { course_id: courseId },
    order: [['order', 'ASC']],
    include: [{
      model: Lesson,
      as: 'lessons',
      attributes: ['id', 'title', 'order', 'duration'],
      order: [['order', 'ASC']]
    }, {
      model: Mcq,
      as: 'mcqs',
      attributes: ['id'],
      where: { is_active: true },
      required: false
    }]
  });

  const userProgress = await UserProgress.findAll({
    where: {
      user_id,
      course_id: courseId
    }
  });

  const chaptersWithProgress = await Promise.all(chapters.map(async (chapter, index) => {
    const chapterProgress = userProgress.find(p =>
      p.chapter_id === chapter.id
    );

    // Get completed lessons from JSON array
    const completedLessons = chapterProgress?.completed_lessons
      ? JSON.parse(chapterProgress.completed_lessons)
      : [];

    const completedLessonsCount = completedLessons.length;
    const allLessonsCompleted = completedLessonsCount >= chapter.lessons.length;

    // ✅ PROPER LOCK LOGIC:
    let locked = true;
    if (index === 0) {
      locked = false; // First chapter always unlocked
    } else {
      const previousChapter = chapters[index - 1];
      const previousChapterProgress = userProgress.find(p =>
        p.chapter_id === previousChapter.id
      );
      // Locked if previous chapter not completed (mcq_passed)
      locked = !(previousChapterProgress && previousChapterProgress.mcq_passed);
    }

    // Can attempt MCQ only if:
    // 1. Chapter is unlocked AND
    // 2. All lessons are completed AND  
    // 3. MCQ not already passed
    const canAttemptMCQ = !locked && allLessonsCompleted && !chapterProgress?.mcq_passed;

    return {
      id: chapter.id,
      title: chapter.title,
      order: chapter.order,
      locked: locked,
      completed: chapterProgress?.completed || false,
      mcq_passed: chapterProgress?.mcq_passed || false,
      lesson_completed: chapterProgress?.lesson_completed || false,
      progress: {
        total_lessons: chapter.lessons.length,
        completed_lessons: completedLessonsCount,
        all_lessons_completed: allLessonsCompleted,
        has_mcqs: chapter.mcqs.length > 0,
        total_mcqs: chapter.mcqs.length,
        can_attempt_mcq: canAttemptMCQ
      },
      lessons: chapter.lessons.map(lesson => ({
        id: lesson.id,
        title: lesson.title,
        order: lesson.order,
        duration: lesson.duration,
        completed: completedLessons.includes(lesson.id), // Check if lesson is in completed_lessons array
        locked: locked // Lessons inherit chapter lock status
      }))
    };
  }));

  // Calculate overall progress
  const totalChapters = chapters.length;
  const completedChapters = chaptersWithProgress.filter(ch => ch.completed).length;
  const overallProgress = totalChapters > 0 ? (completedChapters / totalChapters) * 100 : 0;

  return {
    course_id: courseId,
    user_id,
    overall_progress: Math.round(overallProgress),
    total_chapters: totalChapters,
    completed_chapters: completedChapters,
    chapters: chaptersWithProgress
  };
};



export const updateEnrollmentBatch = async (req: Request, res: Response) => {
  try {
    const { enrollmentId } = req.params;
    const { batch } = req.body;

    // Validate input
    if (!enrollmentId || !batch) {
      return res.status(400).json({
        success: false,
        message: 'Enrollment ID and batch are required'
      });
    }

    // Validate batch value
    const validBatches = ['1', '2', '3', '4', '5', '6'];
    if (!validBatches.includes(batch.toString())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid batch. Must be between 1 and 6'
      });
    }

    // Find enrollment
    const enrollment = await Enrollment.findByPk(enrollmentId);
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Update batch
    await enrollment.update({ batch: batch.toString() });

    return res.status(200).json({
      success: true,
      message: `Batch updated to ${batch}`,
      data: {
        id: enrollment.id,
        user_id: enrollment.user_id,
        course_id: enrollment.course_id,
        batch: enrollment.batch,
        enrolled_at: enrollment.enrolled_at,
        updatedAt: enrollment.updatedAt
      }
    });

  } catch (error) {
    console.error('Update enrollment batch error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};




export const getUserCourses = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const { page, limit, search, category, sort } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const offset = (pageNum - 1) * limitNum;

    const where: any = {};

    // Search & Category filters
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { category: { [Op.iLike]: `%${search}%` } },
      ];
    }
    if (category && category !== "all") {
      where.category = { [Op.iLike]: `%${category}%` };
    }

    // Include enrollments for this user
    const include = [
      {
        model: Enrollment,
        as: "enrollments",
        required: false,
        where: { user_id: userId },
        attributes: ["id", "user_id", "course_id", "enrolled_at", "batch"],
      },
      {
        model: User,
        as: "user",
        attributes: ["id", "username", "email", "profileImage"]
      },
      {
        model: Chapter,
        as: "chapters",
        required: false,
        include: [
          { model: Lesson, as: "lessons", attributes: ["id", "title", "duration", "is_preview"] },
          { model: Mcq, as: "mcqs", attributes: ["id", "question"] }
        ]
      },
       {
    model: Ratings,        
    as: "course_ratings",        
    required: false,
    attributes: ["id", "user_id", "course_id", "score", "review", "status"]
  }
    ];
    console.log(Course.associations);

    // Sorting
    let order: any[] = [["createdAt", "DESC"]];
    if (sort) {
      if (sort === "newest") order = [["createdAt", "DESC"]];
      else if (sort === "oldest") order = [["createdAt", "ASC"]];
      else if (sort === "popular") order = [["enrollment_count", "DESC"]];
    }

    // Fetch courses with enrollments
    const { count, rows: courses } = await Course.findAndCountAll({
      where,
      include,
      order,
      limit: limitNum,
      offset,
      distinct: true
    });
    const creatorIds = courses
      .map(course => course.creator)
      .filter(Boolean);

    const uniqueCreatorIds = [...new Set(creatorIds)];

    let creatorsMap: any = {};

    if (uniqueCreatorIds.length > 0) {
      const creators = await User.findAll({
        where: { id: uniqueCreatorIds },
        attributes: ["id", "username", "email", "profileImage"],
        raw: true
      });

      creatorsMap = creators.reduce((map: any, user: any) => {
        map[user.id] = user;
        return map;
      }, {});
    }
    const calculateCompletionPercentage = (
      totalChapters: number,
      chaptersWithLessons: number,
      chaptersWithMCQs: number
    ): number => {
      if (totalChapters === 0) return 0;
      const lessonsPercentage = (chaptersWithLessons / totalChapters) * 50;
      const mcqsPercentage = (chaptersWithMCQs / totalChapters) * 50;
      return Math.round(lessonsPercentage + mcqsPercentage);
    };

    const getReadinessLevel = (percentage: number): string => {
      if (percentage === 0) return "not_started";
      if (percentage < 25) return "very_low";
      if (percentage < 50) return "low";
      if (percentage < 75) return "medium";
      if (percentage < 100) return "high";
      return "complete";
    };

    // Process courses
    const processedCourses = courses.map(course => {
      const courseJson = course.toJSON();
const ratings = courseJson.course_ratings || [];
  const ratingCount = ratings.length;
  const averageRating = ratingCount > 0
    ? ratings.reduce((sum, r) => sum + r.score, 0) / ratingCount
    : 0;
      const totalChapters = courseJson.chapters?.length || 0;

      const chaptersWithLessons =
        courseJson.chapters?.filter((chapter: any) =>
          (chapter.lessons?.length || 0) > 0
        ).length || 0;

      const chaptersWithMCQs =
        courseJson.chapters?.filter((chapter: any) =>
          (chapter.mcqs?.length || 0) > 0
        ).length || 0;

      const chaptersWithoutLessons = totalChapters - chaptersWithLessons;
      const chaptersWithoutMCQs = totalChapters - chaptersWithMCQs;

      const allChaptersHaveLessons = chaptersWithoutLessons === 0;
      const allChaptersHaveMCQs = chaptersWithoutMCQs === 0;

      const totalLessons =
        courseJson.chapters?.reduce(
          (sum: number, c: any) => sum + (c.lessons?.length || 0),
          0
        ) || 0;

      const totalMCQs =
        courseJson.chapters?.reduce(
          (sum: number, c: any) => sum + (c.mcqs?.length || 0),
          0
        ) || 0;

      const hasChapters = totalChapters > 0;
      const hasLessons = totalLessons > 0;
      const hasMCQs = totalMCQs > 0;

      const isCourseComplete =
        hasChapters &&
        hasLessons &&
        hasMCQs &&
        allChaptersHaveLessons &&
        allChaptersHaveMCQs;

      const completionPercentage = calculateCompletionPercentage(
        totalChapters,
        chaptersWithLessons,
        chaptersWithMCQs
      );

      const isEnrolledData = (courseJson.enrollments?.length || 0) > 0;
console.log("#################",averageRating)
      return {
        ...courseJson,

        creator: courseJson.user || null,
 average_rating: Number(averageRating.toFixed(2)),
    rating_count: ratingCount,
        // ✅ SAME FIELD NAMES AS ADMIN
        chapters_with_lessons: chaptersWithLessons,
        chapters_without_lessons: chaptersWithoutLessons,
        all_chapters_have_lessons: allChaptersHaveLessons,

        chapters_with_mcqs: chaptersWithMCQs,
        chapters_without_mcqs: chaptersWithoutMCQs,
        all_chapters_have_mcqs: allChaptersHaveMCQs,

        total_chapters: totalChapters,
        total_lessons: totalLessons,
        total_mcqs: totalMCQs,

        completion_percentage: completionPercentage,
        readiness_level: getReadinessLevel(completionPercentage),

        is_course_complete: isCourseComplete,

        course_readiness: {
          has_chapters: hasChapters,
          has_lessons: hasLessons,
          has_mcqs: hasMCQs,
          all_chapters_have_lessons: allChaptersHaveLessons,
          all_chapters_have_mcqs: allChaptersHaveMCQs,
          completion_percentage: completionPercentage,
          readiness_level: getReadinessLevel(completionPercentage)
        },

        // Enrollment info
        isEnrolledData,
        enrolled_at: isEnrolledData ? courseJson.enrollments[0].enrolled_at : null,
        batch: isEnrolledData ? courseJson.enrollments[0].batch : null,
        enrollment_count: courseJson.enrollments?.length || 0,

        enrollments: undefined,
        user: undefined
      };
    });

    return res.status(200).json({
      success: true,
      totalCourses: count,
      currentPage: pageNum,
      totalPages: Math.ceil(count / limitNum),
      // courses: processedCourses,
      enrolledCourses: processedCourses.filter(c => c.isEnrolledData),
      unenrolledCourses: processedCourses.filter(c => !c.isEnrolledData)
    });

  } catch (error) {
    console.error("Error fetching user courses:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch courses",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};