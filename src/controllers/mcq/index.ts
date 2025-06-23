import { Request, Response } from "express";
import Mcq from "../../models/mcq.model";

import Course from "../../models/course.model"; // import your course model

export const createMcq = async (req: Request, res: Response) => {
  try {
    const { question, options, answer, course_id } = req.body;

    if (!question || !options || !answer || !course_id) {
      return res.sendError(res, "All fields are required.");
    }
    const course = await Course.findByPk(course_id);
    if (!course) {
      return res.sendError(res, "Course ID not available.");
    }

    const mcq = await Mcq.create({ question, options, answer, course_id });

    return res.sendSuccess(res, { message: "MCQ created", mcq });
  } catch (err) {
    console.error("[createMcq] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};


export const updateMcq = async (req: Request, res: Response) => {
  try {
    const mcq = await Mcq.findByPk(req.params.id);
    if (!mcq) return res.sendError(res, "MCQ not found");

    await mcq.update(req.body);
    return res.sendSuccess(res, { message: "MCQ updated", mcq });
  } catch (err) {
    console.error("[updateMcq] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

export const toggleMcqStatus = async (req: Request, res: Response) => {
  try {
    const mcq = await Mcq.findByPk(req.params.id);
    if (!mcq) return res.sendError(res, "MCQ not found");

    mcq.is_active = !!req.body.is_active;
    await mcq.save();

    return res.sendSuccess(res, {
      message: `MCQ ${mcq.is_active ? "activated" : "deactivated"} successfully`,
      mcq,
    });
  } catch (err) {
    console.error("[toggleMcqStatus] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

export const deleteMcq = async (req: Request, res: Response) => {
  try {
    const deleted = await Mcq.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.sendError(res, "MCQ not found");

    return res.sendSuccess(res, { message: "MCQ deleted successfully" });
  } catch (err) {
    console.error("[deleteMcq] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

export const getMcqs = async (req: Request, res: Response) => {
  try {
    const where: any = { is_active: true };
    if (req.query.course_id) where.course_id = req.query.course_id;

    const mcqs = await Mcq.findAll({ where, order: [["createdAt", "DESC"]] });
    return res.sendSuccess(res, mcqs);
  } catch (err) {
    console.error("[getMcqs] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

export const getMcqById = async (req: Request, res: Response) => {
  try {
    const mcq = await Mcq.findByPk(req.params.id);
    if (!mcq) return res.sendError(res, "MCQ not found");

    return res.sendSuccess(res, mcq);
  } catch (err) {
    console.error("[getMcqById] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

export const getMcqsByCourseId = async (req: Request, res: Response) => {
  try {
    const { course_id } = req.params;

    const course = await Course.findByPk(course_id);
    if (!course) {
      return res.sendError(res, "Course not found");
    }

    const mcqs = await Mcq.findAll({
      where: { course_id, is_active: true },
      order: [["createdAt", "DESC"]],
    });

    return res.sendSuccess(res, mcqs);
  } catch (err) {
    console.error("[getMcqsByCourseId] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};
