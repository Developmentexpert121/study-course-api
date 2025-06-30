import { Request, Response } from "express";
import Chapter from "../../models/chapter.model";
import Course from "../../models/course.model";

export const createChapter = async (req: Request, res: Response) => {
  try {
    const { title, content, course_id, order } = req.body;

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

    const chapter = await Chapter.create({ title, content, course_id, order });

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
    const chapters = await Chapter.findAll({
      order: [["createdAt", "DESC"]], // or use [["order", "ASC"]] if you prefer logical chapter sequence
    });

    return res.sendSuccess(res, chapters);
  } catch (err) {
    console.error("[getAllChapters] Error:", err);
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