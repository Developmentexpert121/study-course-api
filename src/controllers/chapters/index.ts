import { Request, Response } from "express";
import Chapter from "../../models/chapter.model";
import Course from "../../models/course.model";
import { Op } from "sequelize";

export const createChapter = async (req: Request, res: Response) => {
  try {
    const { title, content, course_id, order, images, videos } = req.body;

    // Basic required field validation
    if (!title || !content || !course_id || !order) {
      return res.sendError(res, "All fields (title, content, course_id, order) are required");
    }

    // Check course existence
    const course = await Course.findByPk(course_id);
    if (!course) {
      return res.sendError(res, "Course not found");
    }

    // Check for existing chapter with the same order
    const existing = await Chapter.findOne({ where: { course_id, order } });
    if (existing) {
      return res.sendError(res, `A chapter with order ${order} already exists for this course`);
    }

    // ✅ Check for missing intermediate order(s)
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

    // Create chapter
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
    const { course_id } = req.query;

    if (!course_id) {
      return res.sendError(res, "course_id is required in query");
    }

    const chapters = await Chapter.findAll({
      where: { course_id },
      order: [["order", "ASC"]],
    });

    return res.sendSuccess(res, chapters);
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

    const chapter = await Chapter.findByPk(id);

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

    // 1. Find the chapter to be deleted
    const chapter = await Chapter.findByPk(id);

    if (!chapter) {
      return res.sendError(res, "Chapter not found");
    }

    const { course_id, order } = chapter;

    // 2. Check if there are chapters with higher order in the same course
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

    // 3. Safe to delete
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

    // Get current chapter to determine its order
    const currentChapter = await Chapter.findByPk(current_chapter_id as string);
    if (!currentChapter) {
      return res.sendError(res, "Current chapter not found");
    }

    // Get next chapter by order in the same course
    const nextChapter = await Chapter.findOne({
      where: {
        course_id,
        order: {
          [Op.gt]: currentChapter.order,
        },
      },
      order: [["order", "ASC"]], // Get the immediate next chapter
      attributes: ["id", "order", "title"], // Only return essential fields
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





// Add this to your chapter controller
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
      order: [['order', 'DESC']], // Get the highest order that's lower than current
      attributes: ['id', 'title', 'order']
    });

    // Find the next chapter (immediate higher order)
    const nextChapter = await Chapter.findOne({
      where: {
        course_id: currentChapter.course_id,
        order: {
          [Op.gt]: currentChapter.order
        }
      },
      order: [['order', 'ASC']], // Get the lowest order that's higher than current
      attributes: ['id', 'title', 'order']
    });

    return res.sendSuccess(res, {
      message: "Chapter navigation data retrieved successfully",
      data: {
        current_chapter: {
          id: currentChapter.id,
          title: currentChapter.title,
          order: currentChapter.order,
          course_id: currentChapter.course_id
        },
        previous_chapter: previousChapter ? {
          id: previousChapter.id,
          title: previousChapter.title,
          order: previousChapter.order
        } : null,
        next_chapter: nextChapter ? {
          id: nextChapter.id,
          title: nextChapter.title,
          order: nextChapter.order
        } : null,
        has_previous: !!previousChapter,
        has_next: !!nextChapter
      }
    });

  } catch (err) {
    console.error("[getChapterNavigation] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};





