import { Request, Response } from "express";
import Course from "../../models/course.model";
import { Op } from "sequelize";
import UserProgress from "../../models/userProgress.model";
import Chapter from "../../models/chapter.model";
import Enrollment from "../../models/enrollment.model";
import Lesson from "../../models/lesson.model";
import Mcq from "../../models/mcq.model";
import User from "../../models/user.model";

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
      categories
    } = req.body;

    // Required field validation
    if (!title) return res.sendError(res, "Title is required");
    if (!category) return res.sendError(res, "Category is required");
    if (!creator) return res.sendError(res, "Creator Name is required");
    if (!duration) return res.sendError(res, "Duration is required");
    if (!status) return res.sendError(res, "Status is required");

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

    if (!userId) {
      console.error("No userId found in request");
      return res.sendError(res, "User authentication required");
    }

    const existingByTitle = await Course.findOne({ where: { title } });
    if (existingByTitle) {
      return res.sendError(res, `A course with the title '${title}' already exists.`);
    }

    // Sync is_active with status
    // Only set is_active to true if status is 'active'
    const is_active = status === 'active';

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
      status: status || 'draft',
      is_active, // Sync with status
      features: features || [],
      userId
    });

    return res.sendSuccess(res, {
      message: "Course created successfully",
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
      search,
      include_chapters,
      page,
      limit,
      category,
      sort
    } = req.query;

    console.log("Request query parameters:", req.query);

    const where: any = {};

    // Active filter
    if (active !== undefined) {
      where.is_active = active === "true";
      console.log("Applied active filter:", where.is_active);
    }

    // Search filter
    if (search && typeof search === "string" && search.trim() !== "") {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search.trim()}%` } },
        { description: { [Op.iLike]: `%${search.trim()}%` } },
        { category: { [Op.iLike]: `%${search.trim()}%` } },
      ];
      console.log("Applied search filter:", search.trim());
    }

    // Category filter
    if (category && typeof category === "string" && category !== "all") {
      where.category = { [Op.iLike]: `%${category}%` };
      console.log("Applied category filter:", category);
    }

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const finalPage = Math.max(1, pageNum);
    const finalLimit = Math.min(50, Math.max(1, limitNum));
    const offset = (finalPage - 1) * finalLimit;

    let order: any[] = [["createdAt", "DESC"]];

    if (sort && typeof sort === "string") {
      const sortParam = sort.toLowerCase().trim();
      console.log("Processing sort parameter:", sortParam);

      const sortMap: { [key: string]: any[] } = {
        "newest": [["createdAt", "DESC"]],
        "-createdat": [["createdAt", "DESC"]],
        "oldest": [["createdAt", "ASC"]],
        "createdat": [["createdAt", "ASC"]],
        "popular": [["enrollment_count", "DESC"], ["createdAt", "DESC"]],
        "-enrollment_count": [["enrollment_count", "DESC"], ["createdAt", "DESC"]],
        "enrollment_count": [["enrollment_count", "ASC"], ["createdAt", "DESC"]],
        "ratings": [["ratings", "DESC"], ["createdAt", "DESC"]],
        "-ratings": [["ratings", "DESC"], ["createdAt", "DESC"]],
        "title": [["title", "ASC"]],
        "-title": [["title", "DESC"]],
        "price": [["price", "ASC"]],
        "-price": [["price", "DESC"]],
      };

      if (sortMap[sortParam]) {
        order = sortMap[sortParam];
        console.log("Applied sorting:", order);
      } else {
        console.log("Unknown sort parameter, using default");
      }
    }

    // Include chapters with lessons and MCQs
    const include = [
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

    console.log("Final query conditions:", { where, order, limit: finalLimit, offset });

    const { count, rows: courses } = await Course.findAndCountAll({
      where,
      order,
      limit: finalLimit,
      offset,
      include,
      distinct: true,
      col: "id",
    });

    // Process courses to include detailed chapter information
    const processedCourses = courses.map(course => {
      const courseData = course.toJSON();
      const enrollments = courseData.enrollments || [];

      // Calculate totals for the course
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

      const chaptersWithoutMCQs = courseData.chapters?.filter((chapter: any) =>
        (chapter.mcqs?.length || 0) === 0
      ).length || 0;

      // Count chapters with and without lessons
      const chaptersWithLessons = courseData.chapters?.filter((chapter: any) =>
        (chapter.lessons?.length || 0) > 0
      ).length || 0;

      const chaptersWithoutLessons = courseData.chapters?.filter((chapter: any) =>
        (chapter.lessons?.length || 0) === 0
      ).length || 0;

      // Check if all chapters have lessons
      const allChaptersHaveLessons = chaptersWithoutLessons === 0;
      const someChaptersMissingLessons = chaptersWithoutLessons > 0;

      // Check if course is complete (has chapters and all chapters have lessons)
      const isCourseComplete = courseData.chapters?.length > 0 && allChaptersHaveLessons;

      // Process chapters with detailed information
      const processedChapters = include_chapters === "true" ? courseData.chapters?.map((chapter: any) => ({
        id: chapter.id,
        title: chapter.title,
        order: chapter.order,
        description: chapter.description,
        duration: chapter.duration,

        // Lesson information - CLEARLY IDENTIFIED
        has_lessons: (chapter.lessons?.length || 0) > 0,
        total_lessons: chapter.lessons?.length || 0,
        lessons_required: (chapter.lessons?.length || 0) > 0,
        lesson_status: (chapter.lessons?.length || 0) > 0 ? "has_lessons" : "no_lessons",

        // MCQ information - CLEARLY IDENTIFIED
        has_mcqs: (chapter.mcqs?.length || 0) > 0,
        total_mcqs: chapter.mcqs?.length || 0,
        mcq_required: (chapter.mcqs?.length || 0) > 0,
        mcq_status: (chapter.mcqs?.length || 0) > 0 ? "required" : "not_required",

        // Chapter completeness status
        is_ready: (chapter.lessons?.length || 0) > 0, // Chapter is ready if it has lessons

        // Include lessons if needed
        lessons: chapter.lessons?.map((lesson: any) => ({
          id: lesson.id,
          title: lesson.title,
          duration: lesson.duration,
          order: lesson.order,
          is_preview: lesson.is_preview
        })) || [],

        // Include MCQ preview if needed
        mcqs_preview: chapter.mcqs?.slice(0, 2).map((mcq: any) => ({
          id: mcq.id,
          question: mcq.question
        })) || []
      })) : undefined;

      return {
        ...courseData,
        // Course statistics
        has_chapters: courseData.chapters?.length > 0,
        totalChapters: courseData.chapters?.length || 0,
        totalLessons: totalLessons,
        totalMCQs: totalMCQs,
        totalDuration: totalDuration,
        has_content: totalLessons > 0 || totalMCQs > 0,

        // Lesson distribution across chapters
        chapters_with_lessons: chaptersWithLessons,
        chapters_without_lessons: chaptersWithoutLessons,
        all_chapters_have_lessons: allChaptersHaveLessons,
        some_chapters_missing_lessons: someChaptersMissingLessons,
        is_course_complete: isCourseComplete,

        // MCQ distribution across chapters
        chapters_with_mcqs: chaptersWithMCQs,
        chapters_without_mcqs: chaptersWithoutMCQs,
        all_chapters_have_mcqs: chaptersWithoutMCQs === 0,
        some_chapters_missing_mcqs: chaptersWithoutMCQs > 0,

        // Chapter information
        chapters: processedChapters,

        // Enrollment information
        enrollment_count: enrollments.length,
        enrolled_users: enrollments.map((enrollment: any) => ({
          user_id: enrollment.user_id,
          enrolled_at: enrollment.enrolled_at,
          user: enrollment.user
        })),

        // Clean up
        enrollments: undefined
      };
    });

    const totalPages = Math.ceil(count / finalLimit);

    console.log(`Query results: ${courses.length} courses found, ${count} total`);

    return res.sendSuccess(res, {
      total: count,
      page: finalPage,
      totalPages,
      courses: processedCourses,
      appliedFilters: {
        search: search || null,
        category: category || null,
        sort: sort || 'newest',
        active: active || null
      }
    });
  } catch (err) {
    console.error("[listCourses] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

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

    const course = await Course.findByPk(id);
    if (!course) {
      return res.sendError(res, "COURSE_NOT_FOUND");
    }

    const chapterCount = await Chapter.count({
      where: { course_id: id }
    });

    // Define status flow: draft → active → inactive → draft (cycle)
    let newStatus: string;
    let statusMessage: string;

    switch (course.status) {
      case 'draft':
        if (chapterCount === 0) {
          return res.sendError(res, "Cannot activate a course that has no chapters");
        }
        newStatus = 'active';
        statusMessage = "activated and published";
        break;

      case 'active':
        newStatus = 'inactive';
        statusMessage = "deactivated";
        break;

      case 'inactive':
        newStatus = 'draft';
        statusMessage = "moved to draft";
        break;

      default:
        newStatus = 'draft';
        statusMessage = "reset to draft";
    }

    // Update both status and is_active fields
    await course.update({
      status: newStatus,
      is_active: newStatus === 'active' // Only true when status is 'active'
    });

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

    // Find the course with all related data
    const course = await Course.findByPk(id, {
      include: [
        {
          model: Chapter,
          as: "chapters",
          include: [
            {
              model: Lesson,
              as: "lessons",
              attributes: ["id", "title", "content", "video_url", "duration", "order", "is_preview"],
              order: [["order", "ASC"]] // This should work but let's double check
            },
            {
              model: Mcq,
              as: "mcqs",
              attributes: ["id", "question", "options"],
              order: [["id", "ASC"]] // Use ID or createdAt for MCQs since they might not have order field
            }
          ],
          order: [["order", "ASC"]]
        }
      ]
    });

    if (!course) {
      return res.status(404).sendError(res, "Course not found");
    }

    // Get enrollment count for this course
    const enrollmentCount = await Enrollment.count({
      where: {
        course_id: course.id
      }
    });

    // Get user progress if user_id is provided
    let userProgress = null;
    let enrollmentStatus = null;

    if (user_id) {
      // Check enrollment status
      enrollmentStatus = await Enrollment.findOne({
        where: {
          user_id: parseInt(user_id as string),
          course_id: course.id
        }
      });

      // Get user progress for chapters and lessons
      userProgress = await UserProgress.findAll({
        where: {
          user_id: parseInt(user_id as string),
          course_id: course.id
        }
      });
    }

    // Calculate course statistics
    const totalChapters = course.chapters?.length || 0;
    const totalLessons = course.chapters?.reduce((total, chapter) =>
      total + (chapter.lessons?.length || 0), 0
    ) || 0;
    const totalMCQs = course.chapters?.reduce((total, chapter) =>
      total + (chapter.mcqs?.length || 0), 0
    ) || 0;

    const totalDuration = course.chapters?.reduce((total, chapter) => {
      const chapterDuration = chapter.lessons?.reduce((lessonTotal, lesson) =>
        lessonTotal + (lesson.duration || 0), 0
      ) || 0;
      return total + chapterDuration;
    }, 0) || 0;

    // Format the response with PROPER SORTING
    const formattedCourse = {
      id: course.id,
      title: course.title,
      subtitle: course.subtitle,
      description: course.description,
      category: course.category,
      additional_categories: course.additional_categories,
      image: course.image,
      intro_video: course.intro_video,
      creator: course.creator,
      price: course.price,
      price_type: course.price_type,
      duration: course.duration,
      status: course.status,
      features: course.features,
      is_active: course.is_active,
      ratings: course.ratings,
      enrollment_count: enrollmentCount,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,

      // Statistics
      statistics: {
        total_chapters: totalChapters,
        total_lessons: totalLessons,
        total_mcqs: totalMCQs,
        total_duration: totalDuration,
        has_content: totalChapters > 0,
        total_enrolled: enrollmentCount
      },

      // User-specific data
      user_data: user_id ? {
        is_enrolled: !!enrollmentStatus,
        enrollment_date: enrollmentStatus?.enrolled_at,
        enrolled_at: enrollmentStatus?.createdAt,
        progress: userProgress ? calculateOverallProgress(userProgress, totalChapters, totalLessons) : null
      } : null,

      // Chapters with detailed content - PROPERLY SORTED
      chapters: course.chapters
        ?.sort((a, b) => a.order - b.order) // Sort chapters by order
        .map(chapter => {
          const chapterProgress = userProgress?.filter(progress =>
            progress.chapter_id === chapter.id
          ) || [];

          // Sort lessons by order ASC
          const sortedLessons = chapter.lessons
            ?.sort((a, b) => a.order - b.order)
            .map(lesson => ({
              id: lesson.id,
              title: lesson.title,
              content: lesson.content,
              video_url: lesson.video_url,
              duration: lesson.duration,
              order: lesson.order,
              is_preview: lesson.is_preview,
              type: "lesson"
            })) || [];

          // Sort MCQs by ID ASC (or use order field if you have one)
          const sortedMCQs = chapter.mcqs
            ?.sort((a, b) => a.id - b.id) // Using ID as fallback
            .map(mcq => ({
              id: mcq.id,
              question: mcq.question,
              options: mcq.options,
              type: "mcq"
            })) || [];

          return {
            id: chapter.id,
            title: chapter.title,
            description: chapter.description,
            order: chapter.order,
            duration: sortedLessons.reduce((total, lesson) => total + (lesson.duration || 0), 0) || 0,

            // User progress for this chapter
            user_progress: user_id ? {
              completed: chapterProgress.some(p => p.completed),
              locked: chapterProgress.some(p => p.locked) || false,
              mcq_passed: chapterProgress.some(p => p.mcq_passed),
              started_at: chapterProgress[0]?.createdAt,
              completed_at: chapterProgress.find(p => p.completed)?.updatedAt
            } : null,

            // Lessons - PROPERLY SORTED
            lessons: sortedLessons,

            // MCQs - PROPERLY SORTED
            mcqs: sortedMCQs
          };
        }) || []
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

// Helper function to calculate overall progress
function calculateOverallProgress(userProgress: any[], totalChapters: number, totalLessons: number) {
  const completedChapters = userProgress.filter(p => p.completed).length;
  const completedLessons = userProgress.filter(p => p.lesson_completed).length;

  return {
    chapters_completed: completedChapters,
    total_chapters: totalChapters,
    chapters_progress: totalChapters > 0 ? (completedChapters / totalChapters) * 100 : 0,
    lessons_completed: completedLessons,
    total_lessons: totalLessons,
    lessons_progress: totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0,
    overall_progress: totalChapters > 0 ? (completedChapters / totalChapters) * 100 : 0
  };
}
