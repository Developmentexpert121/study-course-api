import { Request, Response } from "express";
import Course from "../../models/course.model";

export const createCourse = async (req: Request, res: Response) => {
  try {
    const { title, description, category,image } = req.body;
    if (!title) return res.sendError(res, "Title is required");

    if (!category) return res.sendError(res, "Category is required");

    const existing = await Course.findOne({ where: { category } });

    if (existing) {
      return res.sendError(res, `A course for '${category}' already exists.`);
    }

    const course = await Course.create({ title, description, category,image });

    return res.sendSuccess(res, { message: "Course created", course });
  } catch (err) {
    console.error("[createCourse] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

export const listCourses = async (req: Request, res: Response) => {
  try {
    const where: any = {};
    if (req.query.active !== undefined) where.is_active = req.query.active === "true";
    const courses = await Course.findAll({ where, order: [["createdAt", "DESC"]] });
    return res.sendSuccess(res, courses);
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

    const { title, description, category } = req.body;
    await course.update({ title, description, category });
    return res.sendSuccess(res, { message: "Course updated", course });
  } catch (err) {
    console.error("[updateCourse] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

export const toggleCourseStatus = async (req: Request, res: Response) => {
  try {
    const { is_active } = req.body;
    const course = await Course.findByPk(req.params.id);
    if (!course) return res.sendError(res, "Course not found");

    course.is_active = !!is_active;
    await course.save();

    return res.sendSuccess(res, {
      message: `Course ${course.is_active ? "activated" : "deactivated"} successfully`,
      course,
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
