import { Request, Response } from "express";
import Chapter from "../../models/chapter.model";
import Course from "../../models/course.model";
import { Op } from "sequelize";
import Mcq from "../../models/mcq.model";

export const createChapter = async (req: Request, res: Response) => {
  try {
    const { title, content, course_id, order, images, videos } = req.body;

    if (!title || !content || !course_id || !order) {
      return res.sendError(res, "All fields (title, content, course_id, order) are required");
    }

    const course = await Course.findByPk(course_id);
    if (!course) {
      return res.sendError(res, "Course not found");
    }

    const existing = await Chapter.findOne({ where: { course_id, order } });
    if (existing) {
      return res.sendError(res, `A chapter with order ${order} already exists for this course`);
    }

    const allPreviousOrders = await Chapter.findAll({
      where: {
        course_id,
        order: {
          [Op.lt]: order,
        },
      },
      attributes: ['order'],
    });

    const existingOrders = allPreviousOrders.map((ch) => ch.order);
    const missingOrders: number[] = [];

    for (let i = 1; i < order; i++) {
      if (!existingOrders.includes(i)) {
        missingOrders.push(i);
      }
    }

    if (missingOrders.length > 0) {
      return res.sendError(
        res,
        `Cannot create chapter with order ${order}. Missing chapter(s) for order: ${missingOrders.join(", ")}`
      );
    }

    const chapter = await Chapter.create({
      title,
      content,
      course_id,
      order,
      images: images || [],
      videos: videos || [],
    });

    return res.sendSuccess(res, {
      message: "Chapter created successfully",
      chapter,
    });
  } catch (err) {
    console.error("[createChapter] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

export const getAllChapters = async (req: Request, res: Response) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const whereClause: any = {};

    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { content: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows: chapters } = await Chapter.findAndCountAll({
      where: whereClause,
      offset,
      limit: Number(limit),
      include: [
        {
          model: Course,
          as: "course",
          attributes: ["id", "title"],
          where: { is_active: true }, // ✅ Filter
          required: true, // ✅ Only chapters with active course
        },
      ],
      order: [
        [{ model: Course, as: "course" }, "title", "ASC"],
        ["order", "ASC"],
      ],
    });

    return res.sendSuccess(res, {
      data: chapters,
      pagination: {
        total: count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / Number(limit)),
      },
    });
  } catch (err) {
    console.error("[getAllChapters] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

export const editChapter = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, content, course_id, order, images, videos } = req.body;

    if (!id || !title || !content || !course_id || !order) {
      return res.sendError(res, "All fields (id, title, content, course_id, order) are required");
    }

    const chapter = await Chapter.findByPk(id);
    if (!chapter) {
      return res.sendError(res, "Chapter not found");
    }

    const course = await Course.findByPk(course_id);
    if (!course) {
      return res.sendError(res, "Course not found");
    }

    const existing = await Chapter.findOne({
      where: {
        course_id,
        order,
        id: { [Op.ne]: id },
      },
    });

    if (existing) {
      return res.sendError(res, `Another chapter with order ${order} already exists for this course`);
    }

    chapter.title = title;
    chapter.content = content;
    chapter.course_id = course_id;
    chapter.order = order;
    chapter.images = images || [];
    chapter.videos = videos || [];

    await chapter.save();

    return res.sendSuccess(res, {
      message: "Chapter updated successfully",
      chapter,
    });
  } catch (err) {
    console.error("[editChapter] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

export const getChaptersByCourseId = async (req: Request, res: Response) => {
  try {
    const { course_id, page = "1", limit = "10" } = req.query;

    if (!course_id) {
      return res.sendError(res, "course_id is required in query");
    }

    // Convert page and limit to numbers
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    // Fetch total count for pagination info
    const total = await Chapter.count({ where: { course_id } });

    // Fetch paginated chapters
    const chapters = await Chapter.findAll({
      where: { course_id },
      order: [["order", "ASC"]],
      limit: limitNum,
      offset,
    });

    return res.sendSuccess(res, {
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      chapters,
    });
  } catch (err) {
    console.error("[getChaptersByCourseId] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};


export const getChapterById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.sendError(res, "Chapter ID is required");
    }

    const chapterId = parseInt(id);
    if (isNaN(chapterId)) {
      return res.sendError(res, "Invalid chapter ID. Must be a number.");
    }

    const chapter = await Chapter.findByPk(chapterId);

    if (!chapter) {
      return res.sendError(res, "Chapter not found");
    }

    return res.sendSuccess(res, { chapter });
  } catch (err) {
    console.error("[getChapterById] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

export const deleteChapter = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.sendError(res, "Chapter ID is required");
    }
    const chapter = await Chapter.findByPk(id);

    if (!chapter) {
      return res.sendError(res, "Chapter not found");
    }

    const { course_id, order } = chapter;

    const higherOrderChapters = await Chapter.findOne({
      where: {
        course_id,
        order: {
          [Op.gt]: order,
        },
      },
    });

    if (higherOrderChapters) {
      return res.sendError(
        res,
        `Cannot delete chapter with order ${order} because chapters with higher order exist in the course.`
      );
    }

    await chapter.destroy();

    return res.sendSuccess(res, {
      message: "Chapter deleted successfully",
    });
  } catch (err) {
    console.error("[deleteChapter] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

export const getNextChapter = async (req: Request, res: Response) => {
  try {
    const { current_chapter_id, course_id } = req.query;

    if (!current_chapter_id || !course_id) {
      return res.sendError(res, "current_chapter_id and course_id are required");
    }

    const currentChapter = await Chapter.findByPk(current_chapter_id as string);
    if (!currentChapter) {
      return res.sendError(res, "Current chapter not found");
    }

    const nextChapter = await Chapter.findOne({
      where: {
        course_id,
        order: {
          [Op.gt]: currentChapter.order,
        },
      },
      order: [["order", "ASC"]],
      attributes: ["id", "order", "title"],
    });

    if (!nextChapter) {
      return res.sendSuccess(res, {
        message: "No next chapter available",
        nextChapterId: null,
        isLastChapter: true,
      });
    }

    return res.sendSuccess(res, {
      nextChapterId: nextChapter.id,
      nextChapterOrder: nextChapter.order,
      nextChapterTitle: nextChapter.title,
      isLastChapter: false,
    });
  } catch (err) {
    console.error("[getNextChapter] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

export const getChapterNavigation = async (req: Request, res: Response) => {
  try {
    const { chapter_id } = req.query;

    if (!chapter_id) {
      return res.sendError(res, "chapter_id is required");
    }

    // Find the current chapter
    const currentChapter = await Chapter.findByPk(chapter_id as string);

    if (!currentChapter) {
      return res.sendError(res, "Chapter not found");
    }

    // Find the previous chapter (immediate lower order)
    const previousChapter = await Chapter.findOne({
      where: {
        course_id: currentChapter.course_id,
        order: {
          [Op.lt]: currentChapter.order
        }
      },
      order: [['order', 'DESC']],
      attributes: ['id', 'title', 'order']
    });

    // Find all subsequent chapters
    const allNextChapters = await Chapter.findAll({
      where: {
        course_id: currentChapter.course_id,
        order: {
          [Op.gt]: currentChapter.order
        }
      },
      order: [['order', 'ASC']],
      attributes: ['id', 'title', 'order']
    });

    // Check if current chapter has MCQs
    const currentChapterMCQs = await Mcq.count({
      where: {
        chapter_id: currentChapter.id,
        is_active: true
      }
    });

    // Check if previous chapter has MCQs
    let previousChapterMCQs = 0;
    if (previousChapter) {
      previousChapterMCQs = await Mcq.count({
        where: {
          chapter_id: previousChapter.id,
          is_active: true
        }
      });
    }

    // Find the next chapter that has active MCQs
    let nextChapterWithMCQs = null;
    const skippedChapters = [];

    for (const chapter of allNextChapters) {
      // Check if this chapter has active MCQs
      const mcqCount = await Mcq.count({
        where: {
          chapter_id: chapter.id,
          is_active: true
        }
      });

      if (mcqCount > 0) {
        nextChapterWithMCQs = chapter;
        break;
      } else {
        skippedChapters.push({
          id: chapter.id,
          title: chapter.title,
          order: chapter.order,
          reason: "No active MCQs available",
          mcq_count: mcqCount
        });
      }
    }

    return res.sendSuccess(res, {
      message: "Chapter navigation data retrieved successfully",
      data: {
        current_chapter: {
          id: currentChapter.id,
          title: currentChapter.title,
          order: currentChapter.order,
          course_id: currentChapter.course_id,
          has_mcqs: currentChapterMCQs > 0,
          mcq_count: currentChapterMCQs
        },
        previous_chapter: previousChapter ? {
          id: previousChapter.id,
          title: previousChapter.title,
          order: previousChapter.order,
          has_mcqs: previousChapterMCQs > 0,
          mcq_count: previousChapterMCQs
        } : null,
        next_chapter: nextChapterWithMCQs ? {
          id: nextChapterWithMCQs.id,
          title: nextChapterWithMCQs.title,
          order: nextChapterWithMCQs.order,
          has_mcqs: true,
          mcq_count: await Mcq.count({
            where: {
              chapter_id: nextChapterWithMCQs.id,
              is_active: true
            }
          })
        } : null,
        skipped_chapters: skippedChapters,
        has_previous: !!previousChapter,
        has_next: !!nextChapterWithMCQs,
        is_last_chapter: allNextChapters.length === 0,
        total_skipped: skippedChapters.length
      }
    });

  } catch (err) {
    console.error("[getChapterNavigation] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

export const getAllChaptersSimple = async (req: Request, res: Response) => {
  try {
    const chapters = await Chapter.findAll({
      include: [
        {
          model: Course,
          as: "course",
          attributes: ["id", "title"],
          where: { is_active: true },
          required: true,
        },
      ],
      order: [
        [{ model: Course, as: "course" }, "title", "ASC"],
        ["order", "ASC"],
      ],
    });

    return res.sendSuccess(res, {
      message: "All chapters retrieved successfully",
      data: chapters,
      count: chapters.length,
    });
  } catch (err) {
    console.error("[getAllChaptersSimple] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};


export const getChaptersByCourseIdPaginated = async (req: Request, res: Response) => {
  try {
    const { course_id, search, page = 1, limit = 10 } = req.query;

    if (!course_id) {
      return res.sendError(res, "course_id is required");
    }

    // Fetch the course
    const course = await Course.findOne({
      where: { id: Number(course_id) },
      attributes: ['id', 'title', 'is_active'],
    });

    if (!course) {
      return res.sendError(res, "Course not found");
    }

    // Prepare where clause for chapters
    const whereClause: any = { course_id: Number(course_id) };
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { content: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const offset = (Number(page) - 1) * Number(limit);

    // Fetch chapters with count
    const { count, rows: chapters } = await Chapter.findAndCountAll({
      where: whereClause,
      offset,
      limit: Number(limit),
      order: [["order", "ASC"]],
      attributes: ['id', 'title', 'content', 'order', 'images', 'videos', 'createdAt'], // remove images/videos if not exist
    });

    // Send response including chapters
    return res.sendSuccess(res, {
      message: course.is_active
        ? "Chapters retrieved successfully"
        : "Chapters retrieved successfully (Course is inactive)",
      data: {
        course: {
          id: course.id,
          title: course.title,
          is_active: course.is_active,
        },
        chapters,  // ✅ Include chapters here
        pagination: {
          total: count,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(count / Number(limit)),
        },
      },
    });
  } catch (err) {
    console.error("❌ [getChaptersByCourseIdPaginated] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};


export const getChaptersByCourseIdSimple = async (req: Request, res: Response) => {
  try {
    const { course_id } = req.query;

    if (!course_id) {
      return res.sendError(res, "course_id is required in query");
    }

    const course = await Course.findByPk(course_id, {
      attributes: ["id", "title", "is_active"],
    });

    if (!course) {
      return res.sendError(res, "Course not found");
    }

    const chapters = await Chapter.findAll({
      where: { course_id },
      order: [["order", "ASC"]],
      attributes: ["id", "title", "content", "order", "images", "videos", "createdAt"],
    });

    return res.sendSuccess(res, {
      message: "Chapters retrieved successfully",
      data: {
        course: {
          id: course.id,
          title: course.title,
          is_active: course.is_active,
        },
        total: chapters.length,
        chapters,
      },
    });
  } catch (err) {
    console.error("[getChaptersByCourseIdSimple] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

