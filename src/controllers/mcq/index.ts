import { Request, Response } from "express";
import Mcq from "../../models/mcq.model";

import Course from "../../models/course.model"; 
import UserProgress from "../../models/userProgress.model";
import Chapter from "../../models/chapter.model";
import { Op, Sequelize } from "sequelize";

export const createMcq = async (req: Request, res: Response) => {
  try {
    const { question, options, answer, course_id, chapter_id } = req.body;

    if (!question || !options || !answer || !course_id || !chapter_id) {
      return res.sendError(res, "All fields (question, options, answer, course_id, chapter_id) are required.");
    }

    const course = await Course.findByPk(course_id);
    if (!course) {
      return res.sendError(res, "Course not found.");
    }

    const chapter = await Chapter.findByPk(chapter_id);
    if (!chapter || chapter.course_id !== course_id) {
      return res.sendError(res, "Invalid chapter ID for the selected course.");
    }

    const mcq = await Mcq.create({ question, options, answer, course_id, chapter_id });

    return res.sendSuccess(res, { message: "MCQ created successfully", mcq });
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
    const where: any = {}; // ✅ No is_active filter here

    if (req.query.course_id) {
      where.course_id = req.query.course_id;
    }

    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    // Count total MCQs with active courses
    const totalCount = await Mcq.count({
      where,
      include: [
        {
          model: Course,
          where: { is_active: true },
          required: true,
        },
      ],
    });

    // Fetch MCQs with active course
    const mcqs = await Mcq.findAll({
      where,
      include: [
        {
          model: Course,
          attributes: ["id", "title"],
          where: { is_active: true },
          required: true,
        },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    return res.sendSuccess(res, {
      data: mcqs,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
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

export const submitMcqAndUnlockNext = async (req: Request, res: Response) => {
  try {
    const { user_id, course_id, chapter_id, selectedAnswer } = req.body;

    const mcq = await Mcq.findOne({ where: { course_id, chapter_id } });
    if (!mcq) return res.sendError(res, "MCQ not found for this chapter");

    const isCorrect = mcq.answer === selectedAnswer;

    await UserProgress.update(
      { mcq_passed: isCorrect },
      { where: { user_id, course_id, chapter_id } }
    );

    if (isCorrect) {
      const nextChapter = await Chapter.findOne({
        where: {
          course_id,
          order: {
            [Op.gt]: Sequelize.literal(`(
              SELECT "order" FROM "chapters"
              WHERE id = ${chapter_id}
              LIMIT 1
            )`)
          }
        },
        order: [["order", "ASC"]],
      });

      if (nextChapter) {
        await UserProgress.findOrCreate({
          where: {
            user_id,
            course_id,
            chapter_id: nextChapter.id
          },
          defaults: {
            completed: false,
            mcq_passed: false,
            locked: false 
          }
        });
      }
    }

    return res.sendSuccess(res, {
      message: isCorrect ? "Correct answer! Next chapter unlocked." : "Wrong answer. Try again.",
    });
  } catch (err) {
    console.error("[submitMcqAnswer] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

export const submitMcqAnswers = async (req: Request, res: Response) => {
  try {
    const { user_id, course_id, chapter_id, answers } = req.body;

    if (!user_id || !course_id || !chapter_id || !Array.isArray(answers)) {
      return res.sendError(res, "Missing or invalid input.");
    }

    // ✅ Step 1: Check if chapter is unlocked for user
    const userProgress = await UserProgress.findOne({
      where: { user_id, course_id, chapter_id },
    });

    if (!userProgress || userProgress.locked) {
      return res.sendError(res, "Chapter is locked. Complete the previous chapter first.");
    }

    // ✅ Step 2: Fetch MCQs and compare answers
    const mcqIds = answers.map((a: any) => a.mcq_id);
    const mcqs = await Mcq.findAll({
      where: { id: mcqIds, course_id, chapter_id },
    });

    let correctCount = 0;
    for (const mcq of mcqs) {
      const userAnswer = answers.find((a: any) => a.mcq_id === mcq.id);
      if (userAnswer && userAnswer.selected === mcq.answer) {
        correctCount++;
      }
    }

    const passed = correctCount === mcqs.length;

    // ✅ Step 3: Mark current chapter as completed
    await UserProgress.update(
      {
        completed: true,
        mcq_passed: passed,
      },
      {
        where: { user_id, course_id, chapter_id },
      }
    );

    // ✅ Step 4: Unlock next chapter
    const currentChapter = await Chapter.findOne({ where: { id: chapter_id, course_id } });

    if (currentChapter) {
      const nextChapter = await Chapter.findOne({
        where: { course_id, order: currentChapter.order + 1 },
      });

      if (nextChapter) {
        const [progress, created] = await UserProgress.findOrCreate({
          where: {
            user_id,
            course_id,
            chapter_id: nextChapter.id,
          },
          defaults: {
            completed: false,
            mcq_passed: false,
            locked: false, // Unlock directly
          },
        });

        // If record already exists and is still locked, unlock it
        if (!created && progress.locked) {
          await progress.update({ locked: false });
        }
      }
    }

    return res.sendSuccess(res, {
      message: "MCQs submitted. Next chapter unlocked.",
      correctCount,
      total: mcqs.length,
      passed,
    });
  } catch (err) {
    console.error("[submitMcqAnswers] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

