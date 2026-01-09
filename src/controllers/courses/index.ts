import { Request, Response } from "express";
import Course from "../../models/course.model";
import { Op, Sequelize } from "sequelize";
import UserProgress from "../../models/userProgress.model";
import Chapter from "../../models/chapter.model";
import Enrollment from "../../models/enrollment.model";
import Lesson from "../../models/lesson.model";
import Mcq from "../../models/mcq.model";
import User from "../../models/user.model";
import CourseAuditLog from "../../models/CourseAuditLog.model"
import Wishlist from "../../models/wishlist.model";
import Ratings from "../../models/rating.model";
import db from '../../util/dbConn';
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
// Add this to your existing course controller

/**
 * Get all courses for admin (access to all courses regardless of creator)
 */
export const getAllCoursesForAdmin = async (req: Request, res: Response) => {
  try {
    const {
      active,
      status,
      search,
      include_chapters,
      page,
      limit,
      category,
      sort,
      creator_id
    } = req.query;

    const where: any = {};
    const userId = req.user?.id;
    const userRole = req.user?.role;

    // Check if user has admin privileges
    if (!userId || (userRole !== 'admin' && userRole !== 'Super-Admin')) {
      return res.status(403).sendError(res, "Admin access required");
    }

    console.log(`Admin ${userId} accessing all courses`);

    let statusFilter = active !== undefined ? active : status;

    // Apply status filter
    if (statusFilter !== undefined) {
      if (statusFilter === "true" || statusFilter === "active") {
        where.status = "active";
        where.is_active = true;
      } else if (statusFilter === "false" || statusFilter === "inactive") {
        where.status = "inactive";
        where.is_active = false;
      } else if (statusFilter === "draft") {
        where.status = "draft";
        where.is_active = false;
      } else {
        console.log("Invalid status filter, ignoring:", statusFilter);
      }
    }

    // Search filter
    if (search && typeof search === "string" && search.trim() !== "") {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search.trim()}%` } },
        { description: { [Op.iLike]: `%${search.trim()}%` } },
        { category: { [Op.iLike]: `%${search.trim()}%` } },
      ];
    }

    // Category filter
    if (category && typeof category === "string" && category !== "all") {
      where.category = { [Op.iLike]: `%${category}%` };
    }

    // Filter by specific creator if provided
    if (creator_id && typeof creator_id === "string") {
      where.userId = creator_id;
    }

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const finalPage = Math.max(1, pageNum);
    const finalLimit = Math.min(100, Math.max(1, limitNum)); // Increased limit for admin
    const offset = (finalPage - 1) * finalLimit;

    let order: any[] = [["createdAt", "DESC"]];

    if (sort && typeof sort === "string") {
      const sortParam = sort.toLowerCase().trim();

      const sortMap: { [key: string]: any[] } = {
        "newest": [["createdAt", "DESC"]],
        "-createdat": [["createdAt", "DESC"]],
        "oldest": [["createdAt", "ASC"]],
        "createdat": [["createdAt", "ASC"]],
        "popular": [["enrollment_count", "DESC"], ["createdAt", "DESC"]],
        "-enrollment_count": [["enrollment_count", "DESC"], ["createdAt", "DESC"]],
        "enrollment_count": [["enrollment_count", "ASC"], ["createdAt", "DESC"]],
        "ratings": [["average_rating", "DESC"], ["createdAt", "DESC"]],
        "-ratings": [["average_rating", "DESC"], ["createdAt", "DESC"]],
        "rating": [["average_rating", "DESC"], ["total_ratings", "DESC"]],
        "-rating": [["average_rating", "DESC"], ["total_ratings", "DESC"]],
        "title": [["title", "ASC"]],
        "-title": [["title", "DESC"]],
        "price": [["price", "ASC"]],
        "-price": [["price", "DESC"]],
        "creator": [["creator", "ASC"]],
        "-creator": [["creator", "DESC"]],
      };

      if (sortMap[sortParam]) {
        order = sortMap[sortParam];
      } else {
        console.log("Unknown sort parameter, using default");
      }
    }

    // Include chapters and enrollments
    const include: any[] = [
      {
        model: Chapter,
        as: "chapters",
        attributes: include_chapters === "true"
          ? ["id", "title", "order", "description", "duration"]
          : ["id"],
        required: false,
        include: [
          {
            model: Lesson,
            as: "lessons",
            attributes: ["id", "title", "duration", "order", "is_preview"],
            required: false,
            order: [["order", "ASC"]]
          },
          {
            model: Mcq,
            as: "mcqs",
            attributes: ["id", "question"],
            required: false
          }
        ],
        order: [["order", "ASC"]]
      },
      {
        model: Enrollment,
        as: "enrollments",
        required: false,
        include: [{
          model: User,
          as: "user",
          attributes: ["id", "username", "email"]
        }]
      },
      {
        model: User,
        as: "user", // Include the course creator details
        attributes: ["id", "username", "email", "profileImage"]
      }
    ];

    // Get all courses (no user ID restriction)
    const { count, rows: courses } = await Course.findAndCountAll({
      where,
      order,
      limit: finalLimit,
      offset,
      include,
      distinct: true,
      col: "id",
    });

    console.log(`Admin found ${courses.length} courses out of ${count} total`);

    // Fetch ratings for all courses
    const courseIds = courses.map(course => course.id);
    let ratingsMap = {};

    if (courseIds.length > 0) {
      const ratings = await Ratings.findAll({
        where: {
          course_id: courseIds,
          isactive: true,
          status: 'showtoeveryone'
        },
        attributes: ['course_id', 'score'],
        raw: true
      });

      // Calculate rating statistics for each course
      ratingsMap = ratings.reduce((map, rating) => {
        if (!map[rating.course_id]) {
          map[rating.course_id] = {
            total_ratings: 0,
            total_score: 0,
            scores: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
          };
        }

        map[rating.course_id].total_ratings++;
        map[rating.course_id].total_score += rating.score;
        map[rating.course_id].scores[rating.score]++;

        return map;
      }, {});

      // Calculate average rating and percentage distribution
      Object.keys(ratingsMap).forEach(courseId => {
        const stats = ratingsMap[courseId];
        stats.average_rating = stats.total_ratings > 0
          ? parseFloat((stats.total_score / stats.total_ratings).toFixed(1))
          : 0;

        // Calculate percentage distribution
        stats.percentage_distribution = {};
        Object.keys(stats.scores).forEach(score => {
          stats.percentage_distribution[score] = stats.total_ratings > 0
            ? parseFloat(((stats.scores[score] / stats.total_ratings) * 100).toFixed(1))
            : 0;
        });
      });
    }

    // Helper functions (same as before)
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

    // Process courses with admin-specific data
    const processedCourses = courses.map(course => {
      const courseData = course.toJSON();

      // Get creator information from included user
      const creatorInfo = courseData.user || {};
      const creatorName = creatorInfo.username || "Unknown";
      const creatorEmail = creatorInfo.email || "";
      const creatorProfileImage = creatorInfo.profileImage || null;

      const enrollments = courseData.enrollments || [];

      // Get rating statistics for this course
      const courseRatings = ratingsMap[course.id] || {
        total_ratings: 0,
        average_rating: 0,
        scores: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        percentage_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };

      // Calculate totals for the course
      const totalChapters = courseData.chapters?.length || 0;
      const totalLessons = courseData.chapters?.reduce((total: number, chapter: any) => {
        return total + (chapter.lessons?.length || 0);
      }, 0) || 0;

      const totalMCQs = courseData.chapters?.reduce((total: number, chapter: any) => {
        return total + (chapter.mcqs?.length || 0);
      }, 0) || 0;

      const totalDuration = courseData.chapters?.reduce((total: number, chapter: any) => {
        const chapterDuration = chapter.lessons?.reduce((lessonTotal: number, lesson: any) =>
          lessonTotal + (lesson.duration || 0), 0
        ) || 0;
        return total + chapterDuration;
      }, 0) || 0;

      // Count chapters with and without MCQs
      const chaptersWithMCQs = courseData.chapters?.filter((chapter: any) =>
        (chapter.mcqs?.length || 0) > 0
      ).length || 0;

      const chaptersWithoutMCQs = totalChapters - chaptersWithMCQs;

      // Count chapters with and without lessons
      const chaptersWithLessons = courseData.chapters?.filter((chapter: any) =>
        (chapter.lessons?.length || 0) > 0
      ).length || 0;

      const chaptersWithoutLessons = totalChapters - chaptersWithLessons;

      // Check if all chapters have lessons and MCQs
      const allChaptersHaveLessons = chaptersWithoutLessons === 0;
      const allChaptersHaveMCQs = chaptersWithoutMCQs === 0;

      // Check course completion based on actual content
      const hasChapters = totalChapters > 0;
      const hasLessons = totalLessons > 0;
      const hasMCQs = totalMCQs > 0;

      // Course is complete only if it has chapters AND has both lessons AND MCQs in ALL chapters
      const isCourseComplete = hasChapters && hasLessons && hasMCQs &&
        allChaptersHaveLessons && allChaptersHaveMCQs;

      // Calculate completion percentage
      const completionPercentage = calculateCompletionPercentage(
        totalChapters,
        chaptersWithLessons,
        chaptersWithMCQs
      );

      // Course readiness levels with detailed breakdown
      const courseReadiness = {
        has_chapters: hasChapters,
        has_lessons: hasLessons,
        has_mcqs: hasMCQs,
        all_chapters_have_lessons: allChaptersHaveLessons,
        all_chapters_have_mcqs: allChaptersHaveMCQs,
        completion_percentage: completionPercentage,
        readiness_level: getReadinessLevel(completionPercentage),
        missing_components: []
      };

      // Process chapters with detailed information
      const processedChapters = include_chapters === "true" ? courseData.chapters?.map((chapter: any) => ({
        id: chapter.id,
        title: chapter.title,
        order: chapter.order,
        description: chapter.description,
        duration: chapter.duration,
        has_lessons: (chapter.lessons?.length || 0) > 0,
        total_lessons: chapter.lessons?.length || 0,
        has_mcqs: (chapter.mcqs?.length || 0) > 0,
        total_mcqs: chapter.mcqs?.length || 0,
        is_ready: (chapter.lessons?.length || 0) > 0 && (chapter.mcqs?.length || 0) > 0,
        lessons: chapter.lessons?.map((lesson: any) => ({
          id: lesson.id,
          title: lesson.title,
          duration: lesson.duration,
          order: lesson.order,
          is_preview: lesson.is_preview
        })) || [],
        mcqs_preview: chapter.mcqs?.slice(0, 2).map((mcq: any) => ({
          id: mcq.id,
          question: mcq.question
        })) || []
      })) : undefined;

      // Admin-specific response format
      return {
        ...courseData,
        // Course statistics
        creator: {
          id: creatorInfo.id,
          username: creatorInfo.username,
          email: creatorInfo.email,
          profileImage: creatorInfo.profileImage,
        },
        has_chapters: hasChapters,
        totalChapters: totalChapters,
        totalLessons: totalLessons,
        totalMCQs: totalMCQs,
        totalDuration: totalDuration,
        has_content: totalLessons > 0 || totalMCQs > 0,

        // Rating statistics
        ratings: {
          average_rating: courseRatings.average_rating,
          total_ratings: courseRatings.total_ratings,
          rating_distribution: courseRatings.scores,
          percentage_distribution: courseRatings.percentage_distribution
        },

        // Convenience fields for sorting and display
        average_rating: courseRatings.average_rating,
        total_ratings: courseRatings.total_ratings,

        // Lesson distribution across chapters
        chapters_with_lessons: chaptersWithLessons,
        chapters_without_lessons: chaptersWithoutLessons,
        all_chapters_have_lessons: allChaptersHaveLessons,

        // MCQ distribution across chapters
        chapters_with_mcqs: chaptersWithMCQs,
        chapters_without_mcqs: chaptersWithoutMCQs,
        all_chapters_have_mcqs: allChaptersHaveMCQs,

        // Course completion status
        is_course_complete: isCourseComplete,
        course_readiness: courseReadiness,

        // Chapter information
        chapters: processedChapters,

        // Creator information
        creator_name: creatorName,
        creator_email: creatorEmail,
        creator_profile_image: creatorProfileImage,
        creator_id: creatorInfo.id,

        // Enrollment information
        enrollment_count: enrollments.length,

        enrolled_users: enrollments.map((enrollment: any) => ({
          user_id: enrollment.user_id,
          enrolled_at: enrollment.enrolled_at,
          user: enrollment.user
        })),

        // Admin specific fields
        is_owned_by_current_user: creatorInfo.id === userId,

        // Clean up
        enrollments: undefined,
        user: undefined
      };
    });

    const totalPages = Math.ceil(count / finalLimit);

    console.log(`Admin query results: ${courses.length} courses found, ${count} total`);

    return res.sendSuccess(res, {
      total: count,
      page: finalPage,
      totalPages,
      courses: processedCourses,
      appliedFilters: {
        search: search || null,
        category: category || null,
        sort: sort || 'newest',
        status: statusFilter || null,
        creator_id: creator_id || null
      },
      admin_access: true,
      total_courses_all: count
    });
  } catch (err) {
    console.error("[getAllCoursesForAdmin] Error:", err);
    console.error("Error details:", err.message);
    console.error("Error stack:", err.stack);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

/**
 * Get admin dashboard statistics
 */
export const getAdminDashboardStats = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    // Check if user has admin privileges
    if (!userId || (userRole !== 'admin' && userRole !== 'Super-Admin')) {
      return res.status(403).sendError(res, "Admin access required");
    }

    // Get total courses count
    const totalCourses = await Course.count();

    // Get courses by status
    const activeCourses = await Course.count({ where: { status: 'active', is_active: true } });
    const inactiveCourses = await Course.count({ where: { status: 'inactive', is_active: false } });
    const draftCourses = await Course.count({ where: { status: 'draft', is_active: false } });

    // Get total enrollments
    const totalEnrollments = await Enrollment.count();

    // Get courses created this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const coursesThisMonth = await Course.count({
      where: {
        createdAt: {
          [Op.gte]: startOfMonth
        }
      }
    });

    // Get enrollments this month
    const enrollmentsThisMonth = await Enrollment.count({
      where: {
        enrolled_at: {
          [Op.gte]: startOfMonth
        }
      }
    });

    // Get courses by category
    const coursesByCategory = await Course.findAll({
      attributes: [
        'category',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      group: ['category'],
      raw: true
    });

    return res.sendSuccess(res, {
      total_courses: totalCourses,
      active_courses: activeCourses,
      inactive_courses: inactiveCourses,
      draft_courses: draftCourses,
      total_enrollments: totalEnrollments,
      courses_this_month: coursesThisMonth,
      enrollments_this_month: enrollmentsThisMonth,
      courses_by_category: coursesByCategory,
      generated_at: new Date().toISOString()
    });
  } catch (err) {
    console.error("[getAdminDashboardStats] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};
// export const createCourse = async (req: Request, res: Response) => {
//   try {
//     const {
//       title,
//       description,
//       category,
//       subtitle,
//       image,
//       introVideo,
//       creator,
//       price,
//       priceType,
//       duration,
//       status,
//       features,
//       categories
//     } = req.body;

//     // Required field validation
//     if (!title) return res.sendError(res, "Title is required");
//     if (!category) return res.sendError(res, "Category is required");
//     if (!creator) return res.sendError(res, "Creator Name is required");
//     if (!duration) return res.sendError(res, "Duration is required");
//     if (!status) return res.sendError(res, "Status is required");

//     // Validate status
//     const validStatuses = ['draft', 'active', 'inactive'];
//     if (!validStatuses.includes(status)) {
//       return res.sendError(res, "Status must be one of: draft, active, inactive");
//     }

//     // Price validation for paid courses
//     if (priceType === 'paid' && (!price || Number(price) <= 0)) {
//       return res.sendError(res, "Valid price is required for paid courses");
//     }

//     // Features validation
//     if (!features || !Array.isArray(features) || features.length === 0) {
//       return res.sendError(res, "At least one course feature is required");
//     }

//     const userId = req.user?.id;
//     const userIdNumber = parseInt(userId as string, 10);
//     if (!userId) {
//       console.error("No userId found in request");
//       return res.sendError(res, "User authentication required");
//     }

//     const existingByTitle = await Course.findOne({ where: { title } });
//     if (existingByTitle) {
//       return res.sendError(res, `A course with the title '${title}' already exists.`);
//     }

//     // Sync is_active with status
//     const is_active = status === 'active';

//     const course = await Course.create({
//       title,
//       subtitle: subtitle || null,
//       description: description || null,
//       category,
//       additional_categories: categories || [],
//       image: image || null,
//       intro_video: introVideo || null,
//       creator,
//       price: priceType === 'free' ? 0 : Number(price),
//       price_type: priceType || 'free',
//       duration,
//       status: status || 'draft',
//       is_active,
//       features: features || [],
//       userId
//     });

//     const user = await User.findByPk(userId);
//     if (!user) {
//       return res.sendError(res, "User not found");
//     }

//     const userName = user.username || user.email;

//     await createAuditLog(
//       course.id,
//       course.title,
//       'created',
//       userIdNumber,
//       userName,
//       {
//         initial_data: {
//           title: course.title,
//           category: course.category,
//           status: course.status,
//           is_active: course.is_active,
//           price: course.price,
//           price_type: course.price_type,
//           creator: course.creator
//         }
//       },
//       course.is_active
//     );

//     return res.sendSuccess(res, {
//       message: "Course created successfully",
//       course: {
//         id: course.id,
//         title: course.title,
//         subtitle: course.subtitle,
//         category: course.category,
//         price: course.price,
//         price_type: course.price_type,
//         duration: course.duration,
//         status: course.status,
//         is_active: course.is_active,
//         features: course.features,
//         image: course.image,
//         intro_video: course.intro_video,
//         creator: course.creator,
//         createdAt: course.createdAt
//       }
//     });
//   } catch (err) {
//     console.error("[createCourse] Error:", err);
//     return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
//   }
// };



export const createCourse = async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      category,
      subtitle,
      image,
      introVideo,
      creator,
      price,
      priceType,
      duration,
      status,
      features,
      categories,
      courseMode,
    } = req.body;

    // Required field validation
    if (!title) return res.sendError(res, "Title is required");
    if (!category) return res.sendError(res, "Category is required");
    if (!creator) return res.sendError(res, "Creator Name is required");
    if (!duration) return res.sendError(res, "Duration is required");
    if (!status) return res.sendError(res, "Status is required");
    if (!courseMode) return res.sendError(res, "courseMode is required");

    // Validate status
    const validStatuses = ['draft', 'active', 'inactive'];
    if (!validStatuses.includes(status)) {
      return res.sendError(res, "Status must be one of: draft, active, inactive");
    }

    // Price validation for paid courses
    if (priceType === 'paid' && (!price || Number(price) <= 0)) {
      return res.sendError(res, "Valid price is required for paid courses");
    }

    // Features validation
    if (!features || !Array.isArray(features) || features.length === 0) {
      return res.sendError(res, "At least one course feature is required");
    }

    const userId = req.user?.id;
    const userIdNumber = parseInt(userId as string, 10);
    if (!userId) {
      console.error("No userId found in request");
      return res.sendError(res, "User authentication required");
    }

    const existingByTitle = await Course.findOne({ where: { title } });
    if (existingByTitle) {
      return res.sendError(res, `A course with the title '${title}' already exists.`);
    }

    // NEW: Validate that course cannot be active without chapters
    // Note: For new course creation, there won't be any chapters yet
    // So we force status to 'draft' or 'inactive' if they try to create as 'active'
    let finalStatus = status;
    if (status === 'active') {
      finalStatus = 'inactive';
      console.log(`Course cannot be created with 'active' status without chapters. Setting status to 'inactive'.`);
    }

    // Sync is_active with status
    const is_active = finalStatus === 'active';

    const course = await Course.create({
      title,
      subtitle: subtitle || null,
      description: description || null,
      category,
      additional_categories: categories || [],
      image: image || null,
      intro_video: introVideo || null,
      creator,
      price: priceType === 'free' ? 0 : Number(price),
      price_type: priceType || 'free',
      duration,
      status: finalStatus,
      is_active,
      features: features || [],
      userId,
      mode: courseMode,
    });

    const user = await User.findByPk(userId);
    if (!user) {
      return res.sendError(res, "User not found");
    }

    const userName = user.username || user.email;

    await createAuditLog(
      course.id,
      course.title,
      'created',
      userIdNumber,
      userName,
      {
        initial_data: {
          title: course.title,
          category: course.category,
          status: course.status,
          is_active: course.is_active,
          price: course.price,
          price_type: course.price_type,
          creator: course.creator
        }
      },
      course.is_active
    );

    return res.sendSuccess(res, {
      message: finalStatus !== status
        ? "Course created successfully. Status set to 'inactive' as courses require at least one chapter to be active."
        : "Course created successfully",
      course: {
        id: course.id,
        title: course.title,
        subtitle: course.subtitle,
        category: course.category,
        price: course.price,
        price_type: course.price_type,
        duration: course.duration,
        status: course.status,
        is_active: course.is_active,
        features: course.features,
        image: course.image,
        intro_video: course.intro_video,
        creator: course.creator,
        createdAt: course.createdAt
      }
    });
  } catch (err) {
    console.error("[createCourse] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};



export const listCourses = async (req: Request, res: Response) => {
  try {
    const {
      active,
      status,
      search,
      include_chapters,
      page,
      limit,
      category,
      sort,
      view_type = 'admin'
    } = req.query;

    const where: any = {};
    const userId = req.user?.id;
    const userRole = req.user?.role;

    // 🔥 ACCESS CONTROL: Super-Admin sees all courses, Admin sees only their courses, User sees all active courses
    if (view_type === 'admin') {
      if (!userId) {
        return res.status(401).sendError(res, "Authentication required for admin view");
      }

      if (userRole === 'Super-Admin') {
        // Super-Admin can see ALL courses from ALL admins
        console.log(`Super-Admin view - Showing all courses for Super-Admin ID: ${userId}`);
      } else if (userRole === 'admin') {
        // Regular Admin can only see their own courses
        where.userId = userId;
        console.log(`Admin view - Showing courses for user ID: ${userId}`);
      } else {
        return res.status(403).sendError(res, "Admin access required for admin view");
      }
    } else {
      // User view: Show all active courses from all admins
      where.status = 'active';
      where.is_active = true;
      console.log(`User view - Showing all active courses from all admins`);
    }

    let statusFilter = active !== undefined ? active : status;

    // Apply status filter only for admin view
    if (view_type === 'admin' && statusFilter !== undefined) {
      if (statusFilter === "true" || statusFilter === "active") {
        where.status = "active";
        where.is_active = true;
      } else if (statusFilter === "false" || statusFilter === "inactive") {
        where.status = "inactive";
        where.is_active = false;
      } else if (statusFilter === "draft") {
        where.status = "draft";
        where.is_active = false;
      } else {
        console.log("Invalid status filter, ignoring:", statusFilter);
      }
    }

    // Search filter (works for both views)
    if (search && typeof search === "string" && search.trim() !== "") {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search.trim()}%` } },
        { description: { [Op.iLike]: `%${search.trim()}%` } },
        { category: { [Op.iLike]: `%${search.trim()}%` } },
      ];
    }

    // Category filter (works for both views)
    if (category && typeof category === "string" && category !== "all") {
      where.category = { [Op.iLike]: `%${category}%` };
    }

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const finalPage = Math.max(1, pageNum);
    const finalLimit = Math.min(50, Math.max(1, limitNum));
    const offset = (finalPage - 1) * finalLimit;

    let order: any[] = [["createdAt", "DESC"]];

    if (sort && typeof sort === "string") {
      const sortParam = sort.toLowerCase().trim();

      const sortMap: { [key: string]: any[] } = {
        "newest": [["createdAt", "DESC"]],
        "-createdat": [["createdAt", "DESC"]],
        "oldest": [["createdAt", "ASC"]],
        "createdat": [["createdAt", "ASC"]],
        "popular": [["enrollment_count", "DESC"], ["createdAt", "DESC"]],
        "-enrollment_count": [["enrollment_count", "DESC"], ["createdAt", "DESC"]],
        "enrollment_count": [["enrollment_count", "ASC"], ["createdAt", "DESC"]],
        "ratings": [["average_rating", "DESC"], ["createdAt", "DESC"]],
        "-ratings": [["average_rating", "DESC"], ["createdAt", "DESC"]],
        "rating": [["average_rating", "DESC"], ["total_ratings", "DESC"]],
        "-rating": [["average_rating", "DESC"], ["total_ratings", "DESC"]],
        "title": [["title", "ASC"]],
        "-title": [["title", "DESC"]],
        "price": [["price", "ASC"]],
        "-price": [["price", "DESC"]],
      };

      if (sortMap[sortParam]) {
        order = sortMap[sortParam];
      } else {
        console.log("Unknown sort parameter, using default");
      }
    }

    const include: any[] = [
      {
        model: Chapter,
        as: "chapters",
        attributes: include_chapters === "true"
          ? ["id", "title", "order", "description", "duration"]
          : ["id"],
        required: false,
        include: [
          {
            model: Lesson,
            as: "lessons",
            attributes: ["id", "title", "duration", "order", "is_preview"],
            required: false,
            order: [["order", "ASC"]]
          },
          {
            model: Mcq,
            as: "mcqs",
            attributes: ["id", "question"],
            required: false
          }
        ],
        order: [["order", "ASC"]]
      },
      {
        model: Enrollment,
        as: "enrollments",
        required: false,
        include: [{
          model: User,
          as: "user",
          attributes: ["id", "username", "email"]
        }]
      }
    ];

    // Get courses based on view type
    const { count, rows: courses } = await Course.findAndCountAll({
      where,
      order,
      limit: finalLimit,
      offset,
      include,
      distinct: true,
      col: "id",
    });

    console.log(`${view_type === 'admin' ? 'Admin' : 'User'} found ${courses.length} courses out of ${count} total`);




     const role = req.user.role;
    console.log("this is role", role);

    // Build the where clause for counts based on user role
    const countWhere: any = {};
    if (role === 'admin') {
      countWhere.userId = userId; // Admin only sees their own courses
    }
    // Super-Admin and User roles see all courses

    const courseCount = await Course.count({
      where: countWhere
    });

    const activecourseCount = await Course.count({
      where: {
        ...(role === 'admin' ? { userId } : {}),
        status: "active"
      }
    });

    const inactivecourseCount = await Course.count({
      where: {
        ...(role === 'admin' ? { userId } : {}),
        status: "inactive"
      }
    });

    const draftcourseCount = await Course.count({
      where: {
        ...(role === 'admin' ? { userId } : {}),
        status: "draft"
      }
    });



    // 🔥 AUTO-UPDATE COURSE STATUS BASED ON CHAPTERS
    const coursesToUpdate = [];
    for (const course of courses) {
      const hasChapters = course.chapters && course.chapters.length > 0;

      // If course has no chapters and status is not 'inactive', mark for update
      if (!hasChapters && course.status !== 'inactive') {
        coursesToUpdate.push(course.id);
        // Update immediately
        await course.update({
          status: 'inactive',
          is_active: false
        });
        console.log(`Course ${course.id} (${course.title}) status set to inactive - no chapters`);
      }
    }

    if (coursesToUpdate.length > 0) {
      console.log(`Auto-updated ${coursesToUpdate.length} courses to inactive status due to missing chapters`);
    }

    // 🔥 FETCH CREATOR INFORMATION FOR ALL COURSES
    const creatorIds = courses.map(course => course.creator).filter(id => id);
    const uniqueCreatorIds = [...new Set(creatorIds)];

    console.log('Creator IDs to fetch:', uniqueCreatorIds);

    let creatorsMap = {};

    if (uniqueCreatorIds.length > 0) {
      const creators = await User.findAll({
        where: {
          id: uniqueCreatorIds
        },
        attributes: ['id', 'username', 'email', 'profileImage'],
        raw: true
      });

      creatorsMap = creators.reduce((map, user) => {
        map[user.id] = {
          id: user.id,
          username: user.username,
          email: user.email,
          profileImage: user.profileImage,
        };
        return map;
      }, {});

      console.log('Creators map:', creatorsMap);
    }

    // Fetch ratings for all courses
    const courseIds = courses.map(course => course.id);
    let ratingsMap = {};

    if (courseIds.length > 0) {
      const ratings = await Ratings.findAll({
        where: {
          course_id: courseIds,
          isactive: true,
          status: 'showtoeveryone'
        },
        attributes: ['course_id', 'score'],
        raw: true
      });

      ratingsMap = ratings.reduce((map, rating) => {
        if (!map[rating.course_id]) {
          map[rating.course_id] = {
            total_ratings: 0,
            total_score: 0,
            scores: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
          };
        }

        map[rating.course_id].total_ratings++;
        map[rating.course_id].total_score += rating.score;
        map[rating.course_id].scores[rating.score]++;

        return map;
      }, {});

      Object.keys(ratingsMap).forEach(courseId => {
        const stats = ratingsMap[courseId];
        stats.average_rating = stats.total_ratings > 0
          ? parseFloat((stats.total_score / stats.total_ratings).toFixed(1))
          : 0;

        stats.percentage_distribution = {};
        Object.keys(stats.scores).forEach(score => {
          stats.percentage_distribution[score] = stats.total_ratings > 0
            ? parseFloat(((stats.scores[score] / stats.total_ratings) * 100).toFixed(1))
            : 0;
        });
      });
    }

    // Helper functions
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

    const getMissingComponents = (
      hasChapters: boolean,
      hasLessons: boolean,
      hasMCQs: boolean,
      allChaptersHaveLessons: boolean,
      allChaptersHaveMCQs: boolean
    ): string[] => {
      const missing = [];
      if (!hasChapters) missing.push("chapters");
      if (!hasLessons) missing.push("lessons");
      if (!hasMCQs) missing.push("mcqs");
      if (hasChapters && !allChaptersHaveLessons) missing.push("lessons_in_all_chapters");
      if (hasChapters && !allChaptersHaveMCQs) missing.push("mcqs_in_all_chapters");
      return missing;
    };

    // 🔥 PROCESS COURSES WITH EXACT SAME FORMAT FOR BOTH VIEWS
    const processedCourses = courses.map(course => {
      const courseData = course.toJSON();

      const creatorId = Number(courseData.creator);
      const creatorInfo = creatorsMap[creatorId] || {};
      const creatorName = creatorInfo.username || "Unknown";
      const creatorEmail = creatorInfo.email || "";
      const creatorProfileImage = creatorInfo.profileImage || null;

      const enrollments = courseData.enrollments || [];

      const courseRatings = ratingsMap[course.id] || {
        total_ratings: 0,
        average_rating: 0,
        scores: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        percentage_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };

      const totalChapters = courseData.chapters?.length || 0;
      const totalLessons = courseData.chapters?.reduce((total: number, chapter: any) => {
        return total + (chapter.lessons?.length || 0);
      }, 0) || 0;

      const totalMCQs = courseData.chapters?.reduce((total: number, chapter: any) => {
        return total + (chapter.mcqs?.length || 0);
      }, 0) || 0;

      const totalDuration = courseData.chapters?.reduce((total: number, chapter: any) => {
        const chapterDuration = chapter.lessons?.reduce((lessonTotal: number, lesson: any) =>
          lessonTotal + (lesson.duration || 0), 0
        ) || 0;
        return total + chapterDuration;
      }, 0) || 0;

      const chaptersWithMCQs = courseData.chapters?.filter((chapter: any) =>
        (chapter.mcqs?.length || 0) > 0
      ).length || 0;

      const chaptersWithoutMCQs = totalChapters - chaptersWithMCQs;

      const chaptersWithLessons = courseData.chapters?.filter((chapter: any) =>
        (chapter.lessons?.length || 0) > 0
      ).length || 0;



      const chaptersWithoutLessons = totalChapters - chaptersWithLessons;

      const allChaptersHaveLessons = chaptersWithoutLessons === 0;
      const allChaptersHaveMCQs = chaptersWithoutMCQs === 0;
      const someChaptersMissingLessons = chaptersWithoutLessons > 0;
      const someChaptersMissingMCQs = chaptersWithoutMCQs > 0;

      const hasChapters = totalChapters > 0;
      const hasLessons = totalLessons > 0;
      const hasMCQs = totalMCQs > 0;

      const isCourseComplete = hasChapters && hasLessons && hasMCQs &&
        allChaptersHaveLessons && allChaptersHaveMCQs;

      const completionPercentage = calculateCompletionPercentage(
        totalChapters,
        chaptersWithLessons,
        chaptersWithMCQs
      );




      const courseReadiness = {
        has_chapters: hasChapters,
        has_lessons: hasLessons,
        has_mcqs: hasMCQs,
        all_chapters_have_lessons: allChaptersHaveLessons,
        all_chapters_have_mcqs: allChaptersHaveMCQs,
        completion_percentage: completionPercentage,
        readiness_level: getReadinessLevel(completionPercentage),
        missing_components: getMissingComponents(hasChapters, hasLessons, hasMCQs, allChaptersHaveLessons, allChaptersHaveMCQs),
        auto_status_applied: !hasChapters && courseData.status === 'inactive'
      };



      const processedChapters = include_chapters === "true" ? courseData.chapters?.map((chapter: any) => ({
        id: chapter.id,
        title: chapter.title,
        order: chapter.order,
        description: chapter.description,
        duration: chapter.duration,
        has_lessons: (chapter.lessons?.length || 0) > 0,
        total_lessons: chapter.lessons?.length || 0,
        has_mcqs: (chapter.mcqs?.length || 0) > 0,
        total_mcqs: chapter.mcqs?.length || 0,
        is_ready: (chapter.lessons?.length || 0) > 0 && (chapter.mcqs?.length || 0) > 0,
        lessons: chapter.lessons?.map((lesson: any) => ({
          id: lesson.id,
          title: lesson.title,
          duration: lesson.duration,
          order: lesson.order,
          is_preview: lesson.is_preview
        })) || [],
        mcqs_preview: chapter.mcqs?.slice(0, 2).map((mcq: any) => ({
          id: mcq.id,
          question: mcq.question
        })) || []
      })) : undefined;

      return {
        ...courseData,
        creator: {
          id: creatorInfo.id,
          username: creatorInfo.username,
          email: creatorInfo.email,
          profileImage: creatorInfo.profileImage,
        },
        has_chapters: hasChapters,
        totalChapters: totalChapters,
        totalLessons: totalLessons,
        totalMCQs: totalMCQs,
        totalDuration: totalDuration,
        has_content: totalLessons > 0 || totalMCQs > 0,

        ratings: {
          average_rating: courseRatings.average_rating,
          total_ratings: courseRatings.total_ratings,
          rating_distribution: courseRatings.scores,
          percentage_distribution: courseRatings.percentage_distribution
        },

        average_rating: courseRatings.average_rating,
        total_ratings: courseRatings.total_ratings,

        chapters_with_lessons: chaptersWithLessons,
        chapters_without_lessons: chaptersWithoutLessons,
        all_chapters_have_lessons: allChaptersHaveLessons,
        some_chapters_missing_lessons: someChaptersMissingLessons,

        chapters_with_mcqs: chaptersWithMCQs,
        chapters_without_mcqs: chaptersWithoutMCQs,
        all_chapters_have_mcqs: allChaptersHaveMCQs,
        some_chapters_missing_mcqs: someChaptersMissingMCQs,

        is_course_complete: isCourseComplete,
        course_readiness: courseReadiness,

        chapters: processedChapters,

        creator_name: creatorName,
        creator_email: creatorEmail,
        creator_profile_image: creatorProfileImage,
        creator_id: creatorId,

        enrollment_count: enrollments.length,

        enrolled_users: enrollments.map((enrollment: any) => ({
          user_id: enrollment.user_id,
          enrolled_at: enrollment.enrolled_at,
          user: enrollment.user
        })),

        enrollments: undefined
      };
    });

    const totalPages = Math.ceil(count / finalLimit);


    return res.sendSuccess(res, {
      total: count,
      page: finalPage,
      totalPages,
      courses: processedCourses,
      totalcoursecountwithactive: activecourseCount,
      inactivecourseCounttotal: inactivecourseCount,
      draftcourseCounttotal: draftcourseCount,
      appliedFilters: {
        search: search || null,
        category: category || null,
        sort: sort || 'newest',
        status: view_type === 'admin' ? (statusFilter || null) : null
      }
    });
  } catch (err) {
    console.error("[listCourses - Unified] Error:", err);
    console.error("Error details:", err.message);
    console.error("Error stack:", err.stack);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

// export const listCourses = async (req: Request, res: Response) => {
//   try {
//     const {
//       active,
//       status,
//       search,
//       include_chapters,
//       page,
//       limit,
//       category,
//       sort,
//       view_type = 'admin'
//     } = req.query;

//     const where: any = {};
//     const userId = req.user?.id;
//     const userRole = req.user?.role;

//     // 🔥 ACCESS CONTROL: Super-Admin sees all courses, Admin sees only their courses, User sees all active courses
//     if (view_type === 'admin') {
//       if (!userId) {
//         return res.status(401).sendError(res, "Authentication required for admin view");
//       }

//       if (userRole === 'Super-Admin') {
//         // Super-Admin can see ALL courses from ALL admins
//         console.log(`Super-Admin view - Showing all courses for Super-Admin ID: ${userId}`);
//       } else if (userRole === 'admin') {
//         // Regular Admin can only see their own courses
//         where.userId = userId;
//         console.log(`Admin view - Showing courses for user ID: ${userId}`);
//       } else {
//         return res.status(403).sendError(res, "Admin access required for admin view");
//       }
//     } else {
//       // User view: Show all active courses from all admins
//       where.status = 'active';
//       where.is_active = true;
//       console.log(`User view - Showing all active courses from all admins`);
//     }

//     let statusFilter = active !== undefined ? active : status;

//     // Apply status filter only for admin view
//     if (view_type === 'admin' && statusFilter !== undefined) {
//       if (statusFilter === "true" || statusFilter === "active") {
//         where.status = "active";
//         where.is_active = true;
//       } else if (statusFilter === "false" || statusFilter === "inactive") {
//         where.status = "inactive";
//         where.is_active = false;
//       } else if (statusFilter === "draft") {
//         where.status = "draft";
//         where.is_active = false;
//       } else {
//         console.log("Invalid status filter, ignoring:", statusFilter);
//       }
//     }

//     // Search filter (works for both views)
//     if (search && typeof search === "string" && search.trim() !== "") {
//       where[Op.or] = [
//         { title: { [Op.iLike]: `%${search.trim()}%` } },
//         { description: { [Op.iLike]: `%${search.trim()}%` } },
//         { category: { [Op.iLike]: `%${search.trim()}%` } },
//       ];
//     }

//     // Category filter (works for both views)
//     if (category && typeof category === "string" && category !== "all") {
//       where.category = { [Op.iLike]: `%${category}%` };
//     }

//     const pageNum = parseInt(page as string) || 1;
//     const limitNum = parseInt(limit as string) || 10;
//     const finalPage = Math.max(1, pageNum);
//     const finalLimit = Math.min(50, Math.max(1, limitNum));
//     const offset = (finalPage - 1) * finalLimit;

//     let order: any[] = [["createdAt", "DESC"]];

//     if (sort && typeof sort === "string") {
//       const sortParam = sort.toLowerCase().trim();

//       const sortMap: { [key: string]: any[] } = {
//         "newest": [["createdAt", "DESC"]],
//         "-createdat": [["createdAt", "DESC"]],
//         "oldest": [["createdAt", "ASC"]],
//         "createdat": [["createdAt", "ASC"]],
//         "popular": [["enrollment_count", "DESC"], ["createdAt", "DESC"]],
//         "-enrollment_count": [["enrollment_count", "DESC"], ["createdAt", "DESC"]],
//         "enrollment_count": [["enrollment_count", "ASC"], ["createdAt", "DESC"]],
//         "ratings": [["average_rating", "DESC"], ["createdAt", "DESC"]],
//         "-ratings": [["average_rating", "DESC"], ["createdAt", "DESC"]],
//         "rating": [["average_rating", "DESC"], ["total_ratings", "DESC"]],
//         "-rating": [["average_rating", "DESC"], ["total_ratings", "DESC"]],
//         "title": [["title", "ASC"]],
//         "-title": [["title", "DESC"]],
//         "price": [["price", "ASC"]],
//         "-price": [["price", "DESC"]],
//       };

//       if (sortMap[sortParam]) {
//         order = sortMap[sortParam];
//       } else {
//         console.log("Unknown sort parameter, using default");
//       }
//     }

//     const include: any[] = [
//       {
//         model: Chapter,
//         as: "chapters",
//         attributes: include_chapters === "true"
//           ? ["id", "title", "order", "description", "duration"]
//           : ["id"],
//         required: false,
//         include: [
//           {
//             model: Lesson,
//             as: "lessons",
//             attributes: ["id", "title", "duration", "order", "is_preview"],
//             required: false,
//             order: [["order", "ASC"]]
//           },
//           {
//             model: Mcq,
//             as: "mcqs",
//             attributes: ["id", "question"],
//             required: false
//           }
//         ],
//         order: [["order", "ASC"]]
//       },
//       {
//         model: Enrollment,
//         as: "enrollments",
//         required: false,
//         include: [{
//           model: User,
//           as: "user",
//           attributes: ["id", "username", "email"]
//         }]
//       }
//     ];

//     // Get courses based on view type
//     const { count, rows: courses } = await Course.findAndCountAll({
//       where,
//       order,
//       limit: finalLimit,
//       offset,
//       include,
//       distinct: true,
//       col: "id",
//     });

//     // Replace the course count section with this:

//     const role = req.user.role;
//     console.log("this is role", role);

//     // Build the where clause for counts based on user role
//     const countWhere: any = {};
//     if (role === 'admin') {
//       countWhere.userId = userId; // Admin only sees their own courses
//     }
//     // Super-Admin and User roles see all courses

//     const courseCount = await Course.count({
//       where: countWhere
//     });

//     const activecourseCount = await Course.count({
//       where: {
//         ...(role === 'admin' ? { userId } : {}),
//         status: "active"
//       }
//     });

//     const inactivecourseCount = await Course.count({
//       where: {
//         ...(role === 'admin' ? { userId } : {}),
//         status: "inactive"
//       }
//     });

//     const draftcourseCount = await Course.count({
//       where: {
//         ...(role === 'admin' ? { userId } : {}),
//         status: "draft"
//       }
//     });
//     // 🔥 AUTO-UPDATE COURSE STATUS TO ACTIVE ONLY ON FIRST TIME (draft → active)
//     console.log("🔍 Checking course completion status...");
//     const coursesToUpdate = [];

//     for (const course of courses) {
//       const chapters = course.chapters || [];
//       const totalChapters = chapters.length;

//       // Check all conditions
//       const hasChapters = totalChapters > 0;

//       const hasLessons = chapters.some((ch: any) =>
//         ch.lessons && ch.lessons.length > 0
//       );

//       const hasMCQs = chapters.some((ch: any) =>
//         ch.mcqs && ch.mcqs.length > 0
//       );

//       const allChaptersHaveLessons = hasChapters && chapters.every((ch: any) =>
//         ch.lessons && ch.lessons.length > 0
//       );

//       const allChaptersHaveMCQs = hasChapters && chapters.every((ch: any) =>
//         ch.mcqs && ch.mcqs.length > 0
//       );

//       // Check if ALL conditions are true
//       const isComplete = hasChapters && hasLessons && hasMCQs && allChaptersHaveLessons && allChaptersHaveMCQs;

//       // ONLY auto-activate if: course is in DRAFT status AND all conditions are true
//       if (isComplete && course.status === 'draft') {
//         coursesToUpdate.push({
//           course,
//           oldStatus: course.status,
//           newStatus: 'active'
//         });
//         console.log(`Course ${course.id} (${course.title}): Draft → Active (first time activation)`);
//       }
//       // Do NOT auto-deactivate or change active courses
//     }

//     // NOW UPDATE ALL COURSES THAT NEED UPDATING
//     if (coursesToUpdate.length > 0) {
//       console.log(`📝 Auto-activating ${coursesToUpdate.length} draft courses...`);
//       for (const update of coursesToUpdate) {
//         await update.course.update({
//           status: update.newStatus,
//           is_active: true
//         });
//         console.log(`✅ Course ${update.course.id}: ${update.oldStatus} → ${update.newStatus}`);
//       }
//       console.log(`✨ Auto-activated ${coursesToUpdate.length} draft courses`);
//     } else {
//       console.log(`✅ No draft courses to auto-activate`);
//     }

//     // 🔥 FETCH CREATOR INFORMATION FOR ALL COURSES
//     const creatorIds = courses.map(course => course.creator).filter(id => id);
//     const uniqueCreatorIds = [...new Set(creatorIds)];

//     console.log('Creator IDs to fetch:', uniqueCreatorIds);

//     let creatorsMap = {};

//     if (uniqueCreatorIds.length > 0) {
//       const creators = await User.findAll({
//         where: {
//           id: uniqueCreatorIds
//         },
//         attributes: ['id', 'username', 'email', 'profileImage'],
//         raw: true
//       });

//       creatorsMap = creators.reduce((map, user) => {
//         map[user.id] = {
//           id: user.id,
//           username: user.username,
//           email: user.email,
//           profileImage: user.profileImage,
//         };
//         return map;
//       }, {});

//       console.log('Creators map:', creatorsMap);
//     }

//     // Fetch ratings for all courses
//     const courseIds = courses.map(course => course.id);
//     let ratingsMap = {};

//     if (courseIds.length > 0) {
//       const ratings = await Ratings.findAll({
//         where: {
//           course_id: courseIds,
//           isactive: true,
//           status: 'showtoeveryone'
//         },
//         attributes: ['course_id', 'score'],
//         raw: true
//       });

//       ratingsMap = ratings.reduce((map, rating) => {
//         if (!map[rating.course_id]) {
//           map[rating.course_id] = {
//             total_ratings: 0,
//             total_score: 0,
//             scores: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
//           };
//         }

//         map[rating.course_id].total_ratings++;
//         map[rating.course_id].total_score += rating.score;
//         map[rating.course_id].scores[rating.score]++;

//         return map;
//       }, {});

//       Object.keys(ratingsMap).forEach(courseId => {
//         const stats = ratingsMap[courseId];
//         stats.average_rating = stats.total_ratings > 0
//           ? parseFloat((stats.total_score / stats.total_ratings).toFixed(1))
//           : 0;

//         stats.percentage_distribution = {};
//         Object.keys(stats.scores).forEach(score => {
//           stats.percentage_distribution[score] = stats.total_ratings > 0
//             ? parseFloat(((stats.scores[score] / stats.total_ratings) * 100).toFixed(1))
//             : 0;
//         });
//       });
//     }

//     // Helper functions
//     const calculateCompletionPercentage = (
//       totalChapters: number,
//       chaptersWithLessons: number,
//       chaptersWithMCQs: number
//     ): number => {
//       if (totalChapters === 0) return 0;
//       const lessonsPercentage = (chaptersWithLessons / totalChapters) * 50;
//       const mcqsPercentage = (chaptersWithMCQs / totalChapters) * 50;
//       return Math.round(lessonsPercentage + mcqsPercentage);
//     };

//     const getReadinessLevel = (percentage: number): string => {
//       if (percentage === 0) return "not_started";
//       if (percentage < 25) return "very_low";
//       if (percentage < 50) return "low";
//       if (percentage < 75) return "medium";
//       if (percentage < 100) return "high";
//       return "complete";
//     };

//     const getMissingComponents = (
//       hasChapters: boolean,
//       hasLessons: boolean,
//       hasMCQs: boolean,
//       allChaptersHaveLessons: boolean,
//       allChaptersHaveMCQs: boolean
//     ): string[] => {
//       const missing = [];
//       if (!hasChapters) missing.push("chapters");
//       if (!hasLessons) missing.push("lessons");
//       if (!hasMCQs) missing.push("mcqs");
//       if (hasChapters && !allChaptersHaveLessons) missing.push("lessons_in_all_chapters");
//       if (hasChapters && !allChaptersHaveMCQs) missing.push("mcqs_in_all_chapters");
//       return missing;
//     };

//     // 🔥 PROCESS COURSES WITH EXACT SAME FORMAT FOR BOTH VIEWS
//     const processedCourses = courses.map(course => {
//       const courseData = course.toJSON();

//       const creatorId = Number(courseData.creator);
//       const creatorInfo = creatorsMap[creatorId] || {};
//       const creatorName = creatorInfo.username || "Unknown";
//       const creatorEmail = creatorInfo.email || "";
//       const creatorProfileImage = creatorInfo.profileImage || null;

//       const enrollments = courseData.enrollments || [];

//       const courseRatings = ratingsMap[course.id] || {
//         total_ratings: 0,
//         average_rating: 0,
//         scores: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
//         percentage_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
//       };

//       const totalChapters = courseData.chapters?.length || 0;
//       const totalLessons = courseData.chapters?.reduce((total: number, chapter: any) => {
//         return total + (chapter.lessons?.length || 0);
//       }, 0) || 0;

//       const totalMCQs = courseData.chapters?.reduce((total: number, chapter: any) => {
//         return total + (chapter.mcqs?.length || 0);
//       }, 0) || 0;

//       const totalDuration = courseData.chapters?.reduce((total: number, chapter: any) => {
//         const chapterDuration = chapter.lessons?.reduce((lessonTotal: number, lesson: any) =>
//           lessonTotal + (lesson.duration || 0), 0
//         ) || 0;
//         return total + chapterDuration;
//       }, 0) || 0;

//       const chaptersWithMCQs = courseData.chapters?.filter((chapter: any) =>
//         (chapter.mcqs?.length || 0) > 0
//       ).length || 0;

//       const chaptersWithoutMCQs = totalChapters - chaptersWithMCQs;

//       const chaptersWithLessons = courseData.chapters?.filter((chapter: any) =>
//         (chapter.lessons?.length || 0) > 0
//       ).length || 0;

//       const chaptersWithoutLessons = totalChapters - chaptersWithLessons;

//       const allChaptersHaveLessons = chaptersWithoutLessons === 0;
//       const allChaptersHaveMCQs = chaptersWithoutMCQs === 0;
//       const someChaptersMissingLessons = chaptersWithoutLessons > 0;
//       const someChaptersMissingMCQs = chaptersWithoutMCQs > 0;

//       const hasChapters = totalChapters > 0;
//       const hasLessons = totalLessons > 0;
//       const hasMCQs = totalMCQs > 0;

//       const isCourseComplete = hasChapters && hasLessons && hasMCQs &&
//         allChaptersHaveLessons && allChaptersHaveMCQs;

//       const completionPercentage = calculateCompletionPercentage(
//         totalChapters,
//         chaptersWithLessons,
//         chaptersWithMCQs
//       );

//       const courseReadiness = {
//         has_chapters: hasChapters,
//         has_lessons: hasLessons,
//         has_mcqs: hasMCQs,
//         all_chapters_have_lessons: allChaptersHaveLessons,
//         all_chapters_have_mcqs: allChaptersHaveMCQs,
//         completion_percentage: completionPercentage,
//         readiness_level: getReadinessLevel(completionPercentage),
//         missing_components: getMissingComponents(hasChapters, hasLessons, hasMCQs, allChaptersHaveLessons, allChaptersHaveMCQs),
//         auto_status_applied: isCourseComplete && courseData.status === 'active'
//       };

//       const processedChapters = include_chapters === "true" ? courseData.chapters?.map((chapter: any) => ({
//         id: chapter.id,
//         title: chapter.title,
//         order: chapter.order,
//         description: chapter.description,
//         duration: chapter.duration,
//         has_lessons: (chapter.lessons?.length || 0) > 0,
//         total_lessons: chapter.lessons?.length || 0,
//         has_mcqs: (chapter.mcqs?.length || 0) > 0,
//         total_mcqs: chapter.mcqs?.length || 0,
//         is_ready: (chapter.lessons?.length || 0) > 0 && (chapter.mcqs?.length || 0) > 0,
//         lessons: chapter.lessons?.map((lesson: any) => ({
//           id: lesson.id,
//           title: lesson.title,
//           duration: lesson.duration,
//           order: lesson.order,
//           is_preview: lesson.is_preview
//         })) || [],
//         mcqs_preview: chapter.mcqs?.slice(0, 2).map((mcq: any) => ({
//           id: mcq.id,
//           question: mcq.question
//         })) || []
//       })) : undefined;

//       return {
//         ...courseData,
//         creator: {
//           id: creatorInfo.id,
//           username: creatorInfo.username,
//           email: creatorInfo.email,
//           profileImage: creatorInfo.profileImage,
//         },
//         has_chapters: hasChapters,
//         totalChapters: totalChapters,
//         totalLessons: totalLessons,
//         totalMCQs: totalMCQs,
//         totalDuration: totalDuration,
//         has_content: totalLessons > 0 || totalMCQs > 0,

//         ratings: {
//           average_rating: courseRatings.average_rating,
//           total_ratings: courseRatings.total_ratings,
//           rating_distribution: courseRatings.scores,
//           percentage_distribution: courseRatings.percentage_distribution
//         },

//         average_rating: courseRatings.average_rating,
//         total_ratings: courseRatings.total_ratings,

//         chapters_with_lessons: chaptersWithLessons,
//         chapters_without_lessons: chaptersWithoutLessons,
//         all_chapters_have_lessons: allChaptersHaveLessons,
//         some_chapters_missing_lessons: someChaptersMissingLessons,

//         chapters_with_mcqs: chaptersWithMCQs,
//         chapters_without_mcqs: chaptersWithoutMCQs,
//         all_chapters_have_mcqs: allChaptersHaveMCQs,
//         some_chapters_missing_mcqs: someChaptersMissingMCQs,

//         is_course_complete: isCourseComplete,
//         course_readiness: courseReadiness,

//         chapters: processedChapters,

//         creator_name: creatorName,
//         creator_email: creatorEmail,
//         creator_profile_image: creatorProfileImage,
//         creator_id: creatorId,

//         enrollment_count: enrollments.length,

//         enrolled_users: enrollments.map((enrollment: any) => ({
//           user_id: enrollment.user_id,
//           enrolled_at: enrollment.enrolled_at,
//           user: enrollment.user
//         })),

//         enrollments: undefined
//       };
//     });

//     const totalPages = Math.ceil(count / finalLimit);

//     return res.sendSuccess(res, {
//       total: count,
//       page: finalPage,
//       totalcoursecountwithactive: activecourseCount,
//       inactivecourseCounttotal: inactivecourseCount,
//       draftcourseCounttotal: draftcourseCount,

//       totalPages,
//       courses: processedCourses,
//       appliedFilters: {
//         search: search || null,
//         category: category || null,
//         sort: sort || 'newest',
//         status: view_type === 'admin' ? (statusFilter || null) : null
//       }
//     });
//   } catch (err) {
//     console.error("[listCourses - Unified] Error:", err);
//     console.error("Error details:", err.message);
//     console.error("Error stack:", err.stack);
//     return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
//   }
// }

export const getCourse = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.sendError(res, "Invalid course ID");

    const course = await Course.findByPk(id);
    if (!course) return res.sendError(res, "Course not found");

    return res.sendSuccess(res, course);
  } catch (err) {
    console.error("[getCourse] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
}

export const updateCourse = async (req: Request, res: Response) => {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) return res.status(404).sendError(res, "Course not found");

    const {
      title,
      description,
      category,
      image,
      creator,
      subtitle,
      price,
      priceType,
      duration,
      status, // This is the new status from request body
      features,
      introVideo,
      categories
    } = req.body;

    // Required field validation
    if (!title) return res.status(400).sendError(res, "Title is required");
    if (!category) return res.status(400).sendError(res, "Category is required");
    if (!creator) return res.status(400).sendError(res, "Creator is required");
    if (!status) return res.status(400).sendError(res, "Status is required");

    // Validate status
    const validStatuses = ['draft', 'active', 'inactive'];
    if (!validStatuses.includes(status)) {
      return res.status(400).sendError(res, "Status must be one of: draft, active, inactive");
    }

    // Price validation for paid courses
    if (priceType === 'paid' && (!price || Number(price) <= 0)) {
      return res.status(400).sendError(res, "Valid price is required for paid courses");
    }

    // Features validation
    if (!features || !Array.isArray(features) || features.length === 0) {
      return res.status(400).sendError(res, "At least one course feature is required");
    }

    // Check if changing to active status - require chapters
    if (status === 'active' && course.status !== 'active') {
      const chapterCount = await Chapter.count({
        where: { course_id: course.id }
      });

      if (chapterCount === 0) {
        return res.status(400).sendError(res, "Cannot activate a course that has no chapters");
      }
    }
    // Sync is_active with status
    const is_active = status === 'active';

    const updateData = {
      title,
      description,
      category,
      image,
      creator,
      subtitle: subtitle || null,
      price: priceType === 'free' ? 0 : Number(price),
      price_type: priceType || 'free',
      duration: duration || null,
      status, // Use the NEW status from request body, not course.status
      is_active,
      features: features || [],
      additional_categories: categories || [],
      intro_video: introVideo || null
    };

    await course.update(updateData);

    // Refresh the course to get updated data
    await course.reload();

    return res.status(200).sendSuccess(res, {
      message: "Course updated successfully",
      course: {
        id: course.id,
        title: course.title,
        subtitle: course.subtitle,
        category: course.category,
        price: course.price,
        price_type: course.price_type,
        duration: course.duration,
        status: course.status, // This will now show the updated status
        is_active: course.is_active,
        features: course.features,
        image: course.image,
        intro_video: course.intro_video,
        creator: course.creator,
        updatedAt: course.updatedAt
      }
    });
  } catch (err) {
    console.error("[updateCourse] Error:", err);
    return res.status(500).sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};
export const toggleCourseStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log("iddddddddddddd", id)
    const { status } = req.body;
    console.log("+++++++++", req.body)
    const course = await Course.findByPk(id);
    if (!course) {
      return res.sendError(res, "COURSE_NOT_FOUND");
    }

    const chapterCount = await Chapter.count({
      where: { course_id: id }
    });

    // Define status flow: draft → active → inactive → draft (cycle)
    let newStatus: string = status;
    let statusMessage: string;

    // switch (course.status) {
    //   case 'draft':
    //     if (chapterCount === 0) {
    //       return res.sendError(res, "Cannot activate a course that has no chapters");
    //     }
    //     newStatus = 'active';
    //     statusMessage = "activated and published";
    //     break;

    //   case 'active':
    //     newStatus = 'inactive';
    //     statusMessage = "deactivated";
    //     break;

    //   case 'inactive':
    //     newStatus = 'draft';
    //     statusMessage = "moved to draft";
    //     break;

    //   default:
    //     newStatus = 'draft';
    //     statusMessage = "reset to draft";
    // }

    // Update both status and is_active fields
    console.log("################", newStatus)
    await course.update({
      status: newStatus,
      is_active: newStatus === 'active' // Only true when status is 'active'
    });

await course.reload();
console.log("UPDATED COURSE", course.toJSON());
    return res.sendSuccess(res, {
      message: `Course ${statusMessage} successfully`,
      course: {
        ...course.get({ plain: true }),
        totalChapters: chapterCount,
        status: newStatus,
        is_active: newStatus === 'active'
      }
    });
  } catch (err) {
    console.error("[toggleCourseStatus] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};


export const deleteCourse = async (req: Request, res: Response) => {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) return res.sendError(res, "Course not found");

    const courseId = course.id;
    const courseTitle = course.title;
    const isActive = course.is_active;

    // Create audit log before deletion
    const userId = req.user?.id;
    const userIdNumber = parseInt(userId as string, 10);

    const user = await User.findByPk(userId);
    if (!user) {
      return res.sendError(res, "User not found");
    }

    const userName = user.username || user.email;



    await createAuditLog(
      courseId,
      courseTitle,
      'deleted',
      userIdNumber,
      userName,
      {
        deleted_data: {
          title: course.title,
          category: course.category,
          status: course.status,
          is_active: course.is_active,
          creator: course.creator
        }
      },
      isActive
    );

    const deleted = await Course.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.sendError(res, "Course not found");

    return res.sendSuccess(res, { message: "Course deleted" });
  } catch (err) {
    console.error("[deleteCourse] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

export const getChaptersWithUserProgress = async (req: Request, res: Response) => {
  const { courseId } = req.params;
  const { user_id } = req.query;

  if (!user_id) return res.sendError(res, "User ID is required");

  const chapters = await Chapter.findAll({
    where: { course_id: courseId },
    order: [["order", "ASC"]],
    include: [{
      model: UserProgress,
      where: { user_id },
      required: false,
    }]
  });

  const result = chapters.map((ch: any) => ({
    id: ch.id,
    title: ch.title,
    order: ch.order,
    locked: ch.user_progress?.locked ?? true,
    mcq_passed: ch.user_progress?.mcq_passed ?? false,
  }));

  return res.sendSuccess(res, result);
};

export const listCoursesWithChaptersAndProgress = async (req: Request, res: Response) => {
  try {
    const user_id = parseInt(req.params.userId, 10);
    if (!user_id) return res.sendError(res, "User ID is required");

    const enrolledCourses = await Enrollment.findAll({ where: { user_id } });
    const enrolledCourseIds = enrolledCourses.map(e => e.course_id);

    const allCourses = await Course.findAll({
      order: [["createdAt", "DESC"]],
    });

    const response = await Promise.all(
      allCourses.map(async (course) => {
        const chapters = await Chapter.findAll({
          where: { course_id: course.id },
          order: [["order", "ASC"]],
        });

        const userProgress = await UserProgress.findAll({
          where: {
            user_id,
            course_id: course.id,
          },
        });

        const progressMap = new Map();
        userProgress.forEach((p) => {
          progressMap.set(p.chapter_id, p);
        });

        const courseChapters = chapters.map((chapter, index) => {
          const progress = progressMap.get(chapter.id);

          let locked = true;
          if (!enrolledCourseIds.includes(course.id)) {
            locked = true;
          }
          else if (progress) {
            locked = progress.locked;
          }
          else if (index === 0) {
            locked = false;
          }

          return {
            id: chapter.id,
            title: chapter.title,
            content: chapter.content,
            order: chapter.order,
            locked,
          };
        });
        return {
          id: course.id,
          title: course.title,
          description: course.description,
          category: course.category,
          image: course.image,
          chapters: courseChapters,
        };
      })
    );

    return res.sendSuccess(res, response);
  } catch (err) {
    console.error("[listCoursesWithChaptersAndProgress] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};


export const getContinueLearning = async (req: Request, res: Response) => {
  const user_id = parseInt(req.params.userId, 10);

  const enrollments = await Enrollment.findAll({ where: { user_id } });

  const response = await Promise.all(enrollments.map(async (enroll) => {
    const course = await Course.findByPk(enroll.course_id);
    const chapters = await Chapter.findAll({ where: { course_id: course.id }, order: [['order', 'ASC']] });
    const progress = await UserProgress.findAll({ where: { user_id, course_id: course.id } });

    const completedChapters = progress.filter(p => p.completed).length;
    const totalChapters = chapters.length;

    const percentage = totalChapters === 0 ? 0 : Math.round((completedChapters / totalChapters) * 100);

    const current = chapters.find(ch => {
      const chProgress = progress.find(p => p.chapter_id === ch.id);
      return chProgress && !chProgress.completed && !chProgress.locked;
    });

    return {
      course_id: course.id,
      course_title: course.title,
      course_image: course.image,
      current_chapter: current ? { id: current.id, title: current.title } : null,
      completion_percentage: percentage,
    };
  }));

  return res.sendSuccess(res, response);
};

export const getActiveCourses = async (req: Request, res: Response) => {
  try {
    const { search } = req.query;

    const where: any = {
      is_active: true,
    };

    if (search && typeof search === "string") {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { category: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const pageNumber = parseInt(req.query.page as string, 10);
    const limitNumber = parseInt(req.query.limit as string, 10);

    const page = isNaN(pageNumber) || pageNumber < 1 ? 1 : pageNumber;
    const limit = isNaN(limitNumber) || limitNumber < 1 ? 10 : limitNumber;
    const offset = (page - 1) * limit;
    const { count, rows: courses } = await Course.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit,
      offset,
      include: [
        {
          model: Chapter,
          as: "chapters",
          attributes: ["id", "title", "order"],
          required: false,
        }
      ]
    });

    const processedCourses = courses
      .filter(course => course.chapters && course.chapters.length > 0)
      .map(course => ({
        id: course.id,
        title: course.title,
        description: course.description,
        category: course.category,
        image: course.image,
        creator: course.creator,
        createdAt: course.createdAt,
        totalChapters: course.chapters.length,
      }));

    return res.sendSuccess(res, {
      total: processedCourses.length,
      page,
      totalPages: Math.ceil(processedCourses.length / limit),
      courses: processedCourses,
    });
  } catch (err) {
    console.error("[getActiveCourses] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};
export const listCoursesForUsers = async (req: Request, res: Response) => {
  try {
    const { search } = req.query;

    const where: any = {
      is_active: true
    };

    if (search && typeof search === "string") {
      where[Op.and] = [
        { is_active: true },
        {
          [Op.or]: [
            { title: { [Op.iLike]: `%${search}%` } },
            { description: { [Op.iLike]: `%${search}%` } },
            { category: { [Op.iLike]: `%${search}%` } }
          ]
        }
      ];
    } else {
      where.is_active = true;
    }
    const pageNumber = parseInt(req.query.page as string, 10);
    const limitNumber = parseInt(req.query.limit as string, 10);

    const page = isNaN(pageNumber) || pageNumber < 1 ? 1 : pageNumber;
    const limit = isNaN(limitNumber) || limitNumber < 1 ? 10 : limitNumber;
    const offset = (page - 1) * limit;

    const { count, rows: courses } = await Course.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    const coursesWithChapterCounts = await Promise.all(
      courses.map(async (course) => {
        try {
          const chapterCount = await Chapter.count({
            where: { course_id: course.id }
          });

          return {
            ...course.get({ plain: true }),
            totalChapters: chapterCount
          };
        } catch (error) {
          console.error(`Error counting chapters for course ${course.id}:`, error);
          return {
            ...course.get({ plain: true }),
            totalChapters: 0
          };
        }
      })
    );

    return res.sendSuccess(res, {
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
      courses: coursesWithChapterCounts,
    });
  } catch (err) {
    console.error("[listCoursesForUsers] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};


export const getCourseWithFullDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { user_id } = req.query;

    if (!id) {
      return res.status(400).sendError(res, "Course ID is required");
    }

    const course = await Course.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'profileImage'],
          required: false
        },
        {
          model: Chapter,
          as: "chapters",
          include: [
            {
              model: Lesson,
              as: "lessons",
              attributes: ["id", "title", "content", "video_urls", "images", "videos", "duration", "order", "is_preview"],
              order: [["order", "ASC"]]
            },
            {
              model: Mcq,
              as: "mcqs",
              attributes: ["id", "question", "options"],
              order: [["id", "ASC"]]
            }
          ],
          order: [["order", "ASC"]]
        }
      ]
    });

    if (!course) {
      return res.status(404).sendError(res, "Course not found");
    }

    const enrollmentCount = await Enrollment.count({
      where: {
        course_id: course.id
      }
    });

    let userProgress = null;
    let enrollmentStatus = null;
    let wishlistStatus = false;

    if (user_id) {
      enrollmentStatus = await Enrollment.findOne({
        where: {
          user_id: parseInt(user_id as string),
          course_id: course.id
        }
      });

      userProgress = await UserProgress.findAll({
        where: {
          user_id: parseInt(user_id as string),
          course_id: course.id
        }
      });

      const wishlistItem = await Wishlist.findOne({
        where: {
          user_id: parseInt(user_id as string),
          course_id: course.id
        }
      });

      wishlistStatus = !!wishlistItem;

      // FIXED: Create user progress without overriding locked status
      for (const chapter of course.chapters) {
        const existingProgress = userProgress.find(p => p.chapter_id === chapter.id);

        if (!existingProgress) {
          // FIXED: Only first chapter should be unlocked initially
          const isFirstChapter = chapter.order === 1;
          const locked = !isFirstChapter;

          await UserProgress.findOrCreate({
            where: {
              user_id: parseInt(user_id as string),
              course_id: course.id,
              chapter_id: chapter.id
            },
            defaults: {
              lesson_id: null,
              completed: false,
              mcq_passed: false,
              locked: locked, // This respects the natural order
              lesson_completed: false,
              completed_lessons: JSON.stringify([])
            }
          });
        }
      }

      userProgress = await UserProgress.findAll({
        where: {
          user_id: parseInt(user_id as string),
          course_id: course.id
        }
      });
    }

    const totalChapters = course.chapters?.length || 0;
    const totalLessons = course.chapters?.reduce((total, chapter) =>
      total + (chapter.lessons?.length || 0), 0
    ) || 0;
    const totalMCQs = course.chapters?.reduce((total, chapter) =>
      total + (chapter.mcqs?.length || 0), 0
    ) || 0;

    const totalLessonDuration = course.chapters?.reduce((total, chapter) => {
      const chapterDuration = chapter.lessons?.reduce((lessonTotal, lesson) =>
        lessonTotal + (lesson.duration || 0), 0
      ) || 0;
      return total + chapterDuration;
    }, 0) || 0;

    const calculateDurationInWeeks = (totalMinutes: number): string => {
      if (!totalMinutes || totalMinutes === 0) return "No duration set";

      const totalHours = totalMinutes / 60;
      const totalDays = totalHours / 24;
      const totalWeeks = totalDays / 7;

      if (totalWeeks >= 1) {
        return `${Math.round(totalWeeks * 10) / 10} Weeks`;
      } else if (totalDays >= 1) {
        return `${Math.round(totalDays)} Days`;
      } else if (totalHours >= 1) {
        return `${Math.round(totalHours)} Hours`;
      } else {
        return `${totalMinutes} Minutes`;
      }
    };

    const displayDuration = course.duration || calculateDurationInWeeks(totalLessonDuration);

    const chaptersWithProgress = course.chapters?.map((chapter, index) => {
      const chapterProgress = userProgress?.find(p => p.chapter_id === chapter.id);

      let completedLessons: number[] = [];
      if (chapterProgress?.completed_lessons) {
        try {
          completedLessons = JSON.parse(chapterProgress.completed_lessons);
        } catch (error) {
          console.error(`❌ Error parsing completed_lessons for chapter ${chapter.id}:`, error);
          completedLessons = [];
        }
      }

      const completedLessonsCount = completedLessons.length;
      const totalChapterLessons = chapter.lessons?.length || 0;
      const allLessonsCompleted = completedLessonsCount >= totalChapterLessons;

      // FIXED: Proper locking logic based on chapter order
      let locked = true;

      if (chapter.order === 1) {
        // First chapter is always unlocked for enrolled users
        locked = !(user_id && enrollmentStatus);
      } else {
        // For subsequent chapters, check if previous chapter is completed
        const previousOrder = chapter.order - 1;
        const previousChapter = course.chapters.find(ch => ch.order === previousOrder);
        const previousProgress = userProgress?.find(p => p.chapter_id === previousChapter?.id);
        locked = !(previousProgress && previousProgress.completed);
      }

      const canAttemptMCQ = !locked && allLessonsCompleted && !chapterProgress?.mcq_passed;

      const sortedLessons = chapter.lessons
        ?.sort((a, b) => a.order - b.order)
        .map(lesson => {
          const isLessonCompleted = completedLessons.includes(lesson.id);

          return {
            id: lesson.id,
            title: lesson.title,
            content: lesson.content,
            video_urls: lesson.video_urls,
            videos: lesson.videos,
            images: lesson.images,
            duration: lesson.duration,
            order: lesson.order,
            is_preview: lesson.is_preview,
            type: "lesson",
            completed: isLessonCompleted,
            locked: locked // Use the same locked status as chapter
          };
        }) || [];

      const sortedMCQs = chapter.mcqs
        ?.sort((a, b) => a.id - b.id)
        .map(mcq => ({
          id: mcq.id,
          question: mcq.question,
          options: mcq.options,
          type: "mcq"
        })) || [];

      const chapterDuration = sortedLessons.reduce((total, lesson) => total + (lesson.duration || 0), 0) || 0;

      return {
        id: chapter.id,
        title: chapter.title,
        description: chapter.description,
        order: chapter.order,
        duration: chapterDuration,
        duration_display: chapterDuration > 0 ? calculateDurationInWeeks(chapterDuration) : "No duration set",
        locked: locked, // This should now be correct
        completed: chapterProgress?.completed || false,
        mcq_passed: chapterProgress?.mcq_passed || false,
        lesson_completed: chapterProgress?.lesson_completed || false,

        user_progress: user_id ? {
          completed: chapterProgress?.completed || false,
          locked: locked, // Use the same locked status
          mcq_passed: chapterProgress?.mcq_passed || false,
          lesson_completed: chapterProgress?.lesson_completed || false,
          started_at: chapterProgress?.createdAt,
          completed_at: chapterProgress?.completed ? chapterProgress.updatedAt : null,
          can_attempt_mcq: canAttemptMCQ
        } : null,

        progress: user_id ? {
          total_lessons: totalChapterLessons,
          completed_lessons: completedLessonsCount,
          all_lessons_completed: allLessonsCompleted,
          has_mcqs: sortedMCQs.length > 0,
          total_mcqs: sortedMCQs.length,
          can_attempt_mcq: canAttemptMCQ
        } : null,
        lessons: sortedLessons,
        mcqs: sortedMCQs
      };
    }) || [];

    let overallProgress = 0;
    if (user_id && enrollmentStatus && userProgress) {
      overallProgress = calculateOverallProgress(userProgress, totalChapters, totalLessons);
    }

    const creatorInfo = course.user || {};
    const creatorData = {
      id: creatorInfo.id || parseInt(course.creator) || 0,
      username: creatorInfo.username || "Unknown Creator",
      email: creatorInfo.email || "",
      profileImage: creatorInfo.profileImage || null
    };

    const formattedCourse = {
      id: course.id,
      title: course.title,
      subtitle: course.subtitle,
      description: course.description,
      category: course.category,
      additional_categories: course.additional_categories,
      image: course.image,
      intro_video: course.intro_video,
      creator: creatorData,
      price: course.price,
      price_type: course.price_type,
      duration: displayDuration,
      status: course.status,
      features: course.features,
      is_active: course.is_active,
      ratings: course.ratings,
      enrollment_count: enrollmentCount,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,

      statistics: {
        total_chapters: totalChapters,
        total_lessons: totalLessons,
        total_mcqs: totalMCQs,
        total_duration: totalLessonDuration,
        total_duration_display: displayDuration,
        has_content: totalChapters > 0,
        total_enrolled: enrollmentCount,
        duration_breakdown: {
          minutes: totalLessonDuration,
          hours: Math.round(totalLessonDuration / 60 * 10) / 10,
          days: Math.round(totalLessonDuration / 60 / 24 * 10) / 10,
          weeks: Math.round(totalLessonDuration / 60 / 24 / 7 * 10) / 10
        }
      },

      user_data: user_id ? {
        is_enrolled: !!enrollmentStatus,
        enrollment_date: enrollmentStatus?.enrolled_at,
        enrolled_at: enrollmentStatus?.createdAt,
        progress: Math.round(overallProgress),
        is_in_wishlist: wishlistStatus
      } : null,

      chapters: chaptersWithProgress
    };

    return res.status(200).sendSuccess(res, {
      course: formattedCourse,
      message: "Course details retrieved successfully"
    });

  } catch (err) {
    console.error("[getCourseWithFullDetails] Error:", err);
    return res.status(500).sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};



const calculateOverallProgress = (userProgress: any[], totalChapters: number, totalLessons: number): number => {
  if (totalChapters === 0) return 0;

  const completedChapters = userProgress.filter(progress => progress.completed).length;
  return (completedChapters / totalChapters) * 100;
};

// Additional utility function for duration formatting
export const formatDuration = (minutes: number): string => {
  if (!minutes || minutes === 0) return "No duration set";

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return remainingMinutes > 0
      ? `${hours}h ${remainingMinutes}m`
      : `${hours}h`;
  } else {
    return `${minutes}m`;
  }
};



export const getActiveCoursesathomepage = async (req: Request, res: Response) => {
try {
    const courses = await Course.findAll({
      where: {
        status: 'active',
        is_active: true
      },
      order: [['createdAt', 'DESC']]
    });

    const coursesWithStats = await Promise.all(
      courses.map(async (course) => {
        const courseData = course.toJSON() as any;

        // Get creator details
        let creatorInfo = null;
        if (courseData.creator) {
          const creator = await User.findByPk(courseData.creator, {
            attributes: ['id', 'username', 'email', 'profileImage', 'bio']
          });
          creatorInfo = creator ? creator.toJSON() : null;
        }

        // Get enrollment count
        const totalEnrollments = await Enrollment.count({
          where: { course_id: courseData.id }
        });

        // Get ratings statistics
        const ratingsStats = await Ratings.findAll({
          where: {
            course_id: courseData.id,
            isactive: true,
            status: 'showtoeveryone',
            review_visibility: 'visible'
          },
          attributes: [
            [db.fn('COUNT', db.col('id')), 'total_ratings'],
            [db.fn('AVG', db.col('score')), 'average_rating']
          ],
          raw: true
        });

        return {
          ...courseData,
          creator_info: creatorInfo,
          total_enrollments: totalEnrollments,
          ratings_summary: {
            total_ratings: parseInt(ratingsStats[0]?.total_ratings || '0'),
            average_rating: parseFloat(ratingsStats[0]?.average_rating || '0').toFixed(2)
          }
        };
      })
    );

    return res.status(200).json({
      success: true,
      count: coursesWithStats.length,
      data: coursesWithStats
    });
  } catch (error) {
    console.error('Error fetching courses with stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch courses',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
export const getUserEnrolledCourses = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Validate userId
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Find all enrollments for the user and include course details
    const enrollments = await Enrollment.findAll({
      where: {
        user_id: userId
      },
      include: [
        {
          model: Course,
          as: 'course', // You'll need to set up this association
          attributes: [
            'id',
            'title',
            'subtitle',
            'description',
            'category',
            'additional_categories',
            'image',
            'intro_video',
            'creator',
            'price',
            'price_type',
            'duration',
            'features',
            'ratings',
            'status',
            'createdAt',
            'updatedAt'
          ]
        }
      ],
      order: [['enrolled_at', 'DESC']]
    });

    // Format the response
    const courses = enrollments.map(enrollment => ({
      enrollment_id: enrollment.id,
      enrolled_at: enrollment.enrolled_at,
      course: enrollment.course
    }));

    return res.status(200).json({
      success: true,
      count: courses.length,
      data: courses
    });
  } catch (error) {
    console.error('Error fetching enrolled courses:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch enrolled courses',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export const getCourseEnrolledUsers = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;

    // Validate courseId
    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: 'Course ID is required'
      });
    }

    // Find all enrollments for the course with user details
    const enrollments = await Enrollment.findAll({
      where: {
        course_id: courseId
      },
      include: [
        {
          model: User,
          as: 'user', // You'll need to set up this association
          attributes: ['id', 'username', 'email', 'profileImage']
        }
      ],
      order: [['enrolled_at', 'DESC']]
    });

    // Format the response
    const enrolledUsers = enrollments.map(enrollment => ({
      enrollment_id: enrollment.id,
      enrolled_at: enrollment.enrolled_at,
      user: enrollment.user
    }));

    return res.status(200).json({
      success: true,
      course_id: courseId,
      enrollment_count: enrolledUsers.length,
      data: enrolledUsers
    });
  } catch (error) {
    console.error('Error fetching enrolled users:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch enrolled users',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};














