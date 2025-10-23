import { Request, Response } from "express";
import Course from "../../models/course.model";
import { Op } from "sequelize";
import UserProgress from "../../models/userProgress.model";
import Chapter from "../../models/chapter.model";
import Enrollment from "../../models/enrollment.model";

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
    const { active, search, include_chapters, page, limit } = req.query;

    const where: any = {};

    if (active !== undefined) {
      where.is_active = active === "true";
    }

    if (search && typeof search === "string") {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { category: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const finalPage = Math.max(1, pageNum);
    const finalLimit = Math.min(50, Math.max(1, limitNum));
    const offset = (finalPage - 1) * finalLimit;

    const include = include_chapters === "true"
      ? [{ model: Chapter, as: "chapters", attributes: ["id", "title", "order"], required: false }]
      : [{ model: Chapter, as: "chapters", attributes: ["id"], required: false }];

    const { count, rows: courses } = await Course.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit: finalLimit,
      offset,
      include,
      distinct: true,
      col: "id",
    });

    const processedCourses = courses.map(course => ({
      ...course.toJSON(),
      has_chapters: course.chapters?.length > 0
    }));

    const totalPages = Math.ceil(count / finalLimit);

    return res.sendSuccess(res, {
      total: count,
      page: finalPage,
      totalPages,
      courses: processedCourses,
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
    if (!course) return res.sendError(res, "Course not found");

    const { title, description, category, image, creator } = req.body;

    if (!title) return res.sendError(res, "Title is required");
    if (!category) return res.sendError(res, "Category is required");
    if (!creator) return res.sendError(res, "Creator is required");

    await course.update({
      title,
      description,
      category,
      image,
      creator,
    });

    return res.sendSuccess(res, { message: "Course updated", course });
  } catch (err) {
    console.error("[updateCourse] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
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

    const newStatus = !course.is_active;

    if (newStatus === true && chapterCount === 0) {
      return res.sendError(res, "Cannot activate a course that has no chapters");
    }

    await course.update({ is_active: newStatus });

    const statusMessage = newStatus ? "activated" : "deactivated";

    return res.sendSuccess(res, {
      message: `Course ${statusMessage} successfully`,
      course: {
        ...course.get({ plain: true }),
        totalChapters: chapterCount,
        is_active: newStatus
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
