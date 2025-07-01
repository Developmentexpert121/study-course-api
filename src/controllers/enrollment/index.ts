import UserProgress from "../../models/userProgress.model";
import Enrollment from "../../models/enrollment.model";
import Chapter from "../../models/chapter.model";
import { Request, Response } from "express";
import User from "../../models/user.model";
import Course from "../../models/course.model";

export const enrollInCourse = async (req: Request, res: Response) => {
  try {
    const { user_id, course_id }: any = req.body;

    if (!user_id || !course_id) {
      return res.sendError(res, "user_id and course_id are required");
    }

    const user = await User.findByPk(user_id);
    if (!user) return res.sendError(res, "User not found");

    const course = await Course.findByPk(course_id);
    if (!course) return res.sendError(res, "Course not found");

    const existing = await Enrollment.findOne({ where: { user_id, course_id } });
    if (existing) return res.sendError(res, "Already enrolled");

    await Enrollment.create({ user_id, course_id });

    const firstChapter = await Chapter.findOne({
      where: { course_id },
      order: [['order', 'ASC']],
    });

    if (firstChapter) {
      await UserProgress.create({
        user_id,
        course_id,
        chapter_id: firstChapter.id,
        completed: false,
        mcq_passed: false,
        locked: false,
      });
    } else {
      return res.sendError(res, "No chapters found in this course");
    }

    return res.sendSuccess(res, {
      message: "Enrolled successfully. First chapter unlocked.",
    });
  } catch (err) {
    console.error("[enrollInCourse] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};



// export const getMyEnrolledCourses = async (req: Request, res: Response) => {
//   try {
//     const userId = req.user.id;

//     const enrollments = await Enrollment.findAll({
//       where: { user_id: userId },
//       include: [{ model: Course }], // Assuming Course is associated
//     });

//     const enrolledCourses = enrollments.map((en) => en.course);

//     return res.sendSuccess(res, {
//       count: enrolledCourses.length,
//       courses: enrolledCourses,
//     });
//   } catch (err) {
//     console.error("[getMyEnrolledCourses] Error:", err);
//     return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
//   }
// };

// const isUserEnrolled = async (userId: number, courseId: number) => {
//   const enrollment = await Enrollment.findOne({ where: { user_id: userId, course_id: courseId } });
//   return !!enrollment;
// };

// export const getCourseChaptersForUser = async (req: Request, res: Response) => {
//   const userId = req.user.id;
//   const courseId = parseInt(req.params.courseId);

//   const enrolled = await isUserEnrolled(userId, courseId);
//   if (!enrolled) return res.sendError(res, "You must enroll in this course first");

//   // rest of your logic (chapter list, progress check, unlock status...)
// };
