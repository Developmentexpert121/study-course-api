import { Request, Response } from "express";
import Chapter from "../../models/chapter.model";
import Course from "../../models/course.model";
import { Op } from "sequelize";

export const createChapter = async (req: Request, res: Response) => {
  try {
    const { title, content, course_id, order,images, videos } = req.body;

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

    const chapter = await Chapter.create({ title, content, course_id, order,images: images || [],
      videos: videos || [], });

    return res.sendSuccess(res, {
      message: "Chapter created Successfully",
      chapter
    });
  } catch (err) {
    console.error("[createChapter] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

export const getAllChapters = async (req: Request, res: Response) => {
  try {
    const { search } = req.query;

    const whereClause: any = {};

    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { content: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const chapters = await Chapter.findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: Course,
          as: "course",
          attributes: ["id", "title"], // Only fetch course name & id
        },
      ],
    });

    return res.sendSuccess(res, chapters);
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

    const chapter = await Chapter.findByPk(id);
    if (!chapter) {
      return res.sendError(res, "Chapter not found");
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