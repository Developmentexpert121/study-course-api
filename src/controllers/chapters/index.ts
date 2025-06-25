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