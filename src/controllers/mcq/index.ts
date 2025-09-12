import { Request, Response } from "express";
import Mcq from "../../models/mcq.model";

import Course from "../../models/course.model"; 
import UserProgress from "../../models/userProgress.model";
import Chapter from "../../models/chapter.model";
import { Op, Sequelize } from "sequelize";
import McqSubmission from "../../models/mcqSubmission.model"

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



export const getStudentMcqsByChapterId = async (req: Request, res: Response) => {
  try {
    const { chapter_id } = req.params;

    if (!chapter_id) {
      return res.sendError(res, "Chapter ID is required.");
    }

    // Verify chapter exists and belongs to an active course
    const chapter = await Chapter.findByPk(chapter_id);
    if (!chapter) {
      return res.sendError(res, "Chapter not found.");
    }

    const course = await Course.findOne({
      where: { 
        id: chapter.course_id,
        is_active: true 
      }
    });

    if (!course) {
      return res.sendError(res, "Course not found or is inactive.");
    }

    // Get MCQs for the chapter (only active MCQs)
    const mcqs = await Mcq.findAll({
      where: { 
        chapter_id: parseInt(chapter_id),
        is_active: true 
      },
      attributes: ["id", "question", "options"], // Only include question and options, exclude answer
      order: [["createdAt", "ASC"]], // Order by creation time
    });

    if (mcqs.length === 0) {
      return res.sendError(res, "No active MCQs found for this chapter.");
    }

    return res.sendSuccess(res, {
      chapter: {
        id: chapter.id,
        title: chapter.title,
        course: {
          id: course.id,
          title: course.title
        }
      },
      mcqs,
      total: mcqs.length,
    });
  } catch (err) {
    console.error("[getStudentMcqsByChapterId] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};



export const submitAllMcqAnswers = async (req: Request, res: Response) => {
  try {
    const { user_id, chapter_id, answers } = req.body;
    
    // Validation
    if (!user_id || !chapter_id || !Array.isArray(answers)) {
      return res.sendError(res, "user_id, chapter_id, and answers array are required.");
    }

    // Check if chapter exists and get course_id
    const chapter = await Chapter.findByPk(chapter_id);
    if (!chapter) {
      return res.sendError(res, "Chapter not found.");
    }

    const course_id = chapter.course_id;

    // Check if user has access to this chapter
    const userProgress = await UserProgress.findOne({
      where: { user_id, chapter_id }
    });

    // if (!userProgress || userProgress.locked) {
    //   return res.sendError(res, "Chapter is locked. Complete the previous chapter first.");
    // }

    // Get all MCQs for this chapter
    const mcqs = await Mcq.findAll({
      where: { 
        chapter_id,
        is_active: true 
      }
    });

    if (mcqs.length === 0) {
      return res.sendError(res, "No active MCQs found for this chapter.");
    }

    // Validate that all answers correspond to MCQs in this chapter
    const mcqIds = mcqs.map(mcq => mcq.id);
    const invalidAnswers = answers.filter(answer => !mcqIds.includes(answer.mcq_id));
    
    if (invalidAnswers.length > 0) {
      return res.sendError(res, "Some answers are for invalid MCQs.");
    }

    // Calculate results
    let correctCount = 0;
    const results = answers.map(answer => {
      const mcq = mcqs.find(m => m.id === answer.mcq_id);
      const isCorrect = mcq!.answer === answer.selected_option;
      
      if (isCorrect) correctCount++;
      
      return {
        mcq_id: answer.mcq_id,
        question: mcq!.question, // Add question text
        selected_option: answer.selected_option,
        correct_option: mcq!.answer,
        is_correct: isCorrect
      };
    });

    const totalQuestions = mcqs.length;
    const percentage = (correctCount / totalQuestions) * 100;
    const passed = percentage >= 70; // Assuming 70% is passing

    // Save the submission
    const submission = await McqSubmission.create({
      user_id,
      chapter_id,
      course_id,
      answers: results,
      score: correctCount,
      total_questions: totalQuestions,
      percentage,
      passed,
      submitted_at: new Date()
    });

    // Update user progress
    await UserProgress.update(
      {
        completed: true,
        mcq_passed: passed,
        score: correctCount,
        total_questions: totalQuestions
      },
      {
        where: { user_id, chapter_id }
      }
    );

    // If passed, unlock next chapter
    if (passed) {
      const nextChapter = await Chapter.findOne({
        where: {
          course_id,
          order: chapter.order + 1
        }
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

    // Return detailed results to the user
    return res.sendSuccess(res, {
      message: passed ? 
        "Congratulations! You passed the quiz. Next chapter unlocked." : 
        "You didn't pass the quiz. Please try again.",
      data: {
        score: correctCount,
        total_questions: totalQuestions,
        percentage: percentage.toFixed(2),
        passed,
        passing_threshold: 70, // Let user know the passing threshold
        results: results // This contains detailed info about each question
      }
    });
  } catch (err) {
    console.error("[submitAllMcqAnswers] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};


// Get user's submission history for a chapter
export const getUserMcqSubmissions = async (req: Request, res: Response) => {
  try {
    const { user_id, chapter_id } = req.query;

    if (!user_id || !chapter_id) {
      return res.sendError(res, "user_id and chapter_id are required.");
    }

    const submissions = await McqSubmission.findAll({
      where: {
        user_id: user_id as string,
        chapter_id: chapter_id as string
      },
      order: [["submitted_at", "DESC"]]
    });

    return res.sendSuccess(res, {
      data: submissions,
      total: submissions.length
    });
  } catch (err) {
    console.error("[getUserMcqSubmissions] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERRORsss");
  }
};

// Get user's best submission for a chapter
export const getUserBestSubmission = async (req: Request, res: Response) => {
  try {
    const { user_id, chapter_id } = req.query;

    if (!user_id || !chapter_id) {
      return res.sendError(res, "user_id and chapter_id are required.");
    }

    const bestSubmission = await McqSubmission.findOne({
      where: {
        user_id: user_id as string,
        chapter_id: chapter_id as string
      },
      order: [["score", "DESC"], ["submitted_at", "DESC"]]
    });

    return res.sendSuccess(res, {
      data: bestSubmission
    });
  } catch (err) {
    console.error("[getUserBestSubmission] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

// Get chapter statistics for a user
export const getChapterStats = async (req: Request, res: Response) => {
  try {
    const { user_id, chapter_id } = req.query;

    if (!user_id || !chapter_id) {
      return res.sendError(res, "user_id and chapter_id are required.");
    }

    const submissions = await McqSubmission.findAll({
      where: {
        user_id: user_id as string,
        chapter_id: chapter_id as string
      },
      order: [["submitted_at", "DESC"]]
    });

    const bestSubmission = await McqSubmission.findOne({
      where: {
        user_id: user_id as string,
        chapter_id: chapter_id as string
      },
      order: [["score", "DESC"], ["submitted_at", "DESC"]]
    });

    const totalAttempts = submissions.length;
    const highestScore = bestSubmission ? bestSubmission.score : 0;
    const bestPercentage = bestSubmission ? bestSubmission.percentage : 0;
    const passed = bestSubmission ? bestSubmission.passed : false;

    return res.sendSuccess(res, {
      data: {
        total_attempts: totalAttempts,
        highest_score: highestScore,
        best_percentage: bestPercentage,
        passed: passed,
        submissions: submissions
      }
    });
  } catch (err) {
    console.error("[getChapterStats] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};




//22


export const getStudentMcqsWithPrevious = async (req: Request, res: Response) => {
  try {
    const chapter_id = req.query.chapter_id;
    const user_id = req.query.user_id;


    if (!chapter_id || !user_id) {
      return res.sendError(res, "chapter_id and user_id are required.");
    }

    // Verify chapter and course
    const chapter = await Chapter.findByPk(chapter_id);
    if (!chapter) return res.sendError(res, "Chapter not found.");

    const course = await Course.findByPk(chapter.course_id);
    if (!course || !course.is_active) {
      return res.sendError(res, "Course not found or inactive.");
    }

    // Get active MCQs for this chapter
    const mcqs = await Mcq.findAll({
      where: { chapter_id: parseInt(chapter_id as string), is_active: true },
      attributes: ["id", "question", "options"],
      order: [["createdAt", "ASC"]],
    });

    if (mcqs.length === 0) {
      return res.sendError(res, "No active MCQs found.");
    }

    // Get user's latest submission (if any)
    const submission = await McqSubmission.findOne({
      where: {
        user_id: parseInt(user_id as string),
        chapter_id: parseInt(chapter_id as string),
      },
      order: [["submitted_at", "DESC"]],
    });

    let previousAnswers = [];

    if (submission) {
      previousAnswers = submission.answers;
    }

    return res.sendSuccess(res, {
      chapter: {
        id: chapter.id,
        title: chapter.title,
      },
      course: {
        id: course.id,
        title: course.title,
      },
      mcqs,
      previousAnswers,
    });
  } catch (err) {
    console.error("[getStudentMcqsWithPrevious] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};





export const getChapterMcqStatus = async (req: Request, res: Response) => {
  try {
    const { user_id, chapter_id } = req.query;

    if (!user_id || !chapter_id) {
      return res.sendError(res, "user_id and chapter_id are required.");
    }

    // Verify chapter exists
    const chapter = await Chapter.findByPk(chapter_id as string);
    if (!chapter) {
      return res.sendError(res, "Chapter not found.");
    }

    // Check user progress for this chapter
    const userProgress = await UserProgress.findOne({
      where: {
        user_id: user_id as string,
        chapter_id: chapter_id as string
      }
    });

    // If no progress record exists or MCQ not passed, check submissions
    let passed = false;
    
    if (userProgress && userProgress.mcq_passed) {
      passed = true;
    } else {
      // Check if user has any passing submission for this chapter
      const passingSubmission = await McqSubmission.findOne({
        where: {
          user_id: user_id as string,
          chapter_id: chapter_id as string,
          passed: true
        }
      });
      
      passed = !!passingSubmission;
    }

    return res.sendSuccess(res, {
      data: {
        chapter_id: chapter_id,
        passed: passed,
        progress_exists: !!userProgress
      }
    });
  } catch (err) {
    console.error("[getChapterMcqStatus] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};





export const getUserCourseMcqStatus = async (req: Request, res: Response) => {
  try {
    const { user_id, course_id } = req.query;

    if (!user_id || !course_id) {
      return res.sendError(res, "user_id and course_id are required.");
    }

    // Get all chapters for the course in order
    const chapters = await Chapter.findAll({
      where: { course_id: course_id as string },
      attributes: ['id', 'title', 'order'],
      order: [['order', 'ASC']]
    });

    if (!chapters.length) {
      return res.sendError(res, "No chapters found for this course.");
    }

    // Get user progress for all chapters in this course
    const userProgress = await UserProgress.findAll({
      where: {
        user_id: user_id as string,
        course_id: course_id as string
      }
    });

    // Get all MCQ submissions for this user and course
    const submissions = await McqSubmission.findAll({
      where: {
        user_id: user_id as string,
        course_id: course_id as string
      }
    });

    // Prepare response with status for each chapter
    const chapterStatus = chapters.map((chapter, index) => {
      const progress = userProgress.find(up => up.chapter_id === chapter.id);
      const chapterSubmissions = submissions.filter(sub => sub.chapter_id === chapter.id);
      
      // Check if user passed this chapter
      let passed = false;
      let attempted = false;

      if (progress && progress.mcq_passed) {
        passed = true;
        attempted = true;
      } else if (chapterSubmissions.length > 0) {
        passed = chapterSubmissions.some(sub => sub.passed);
        attempted = true;
      }

      // Determine if chapter is locked
      let locked = false;
      
      if (index === 0) {
        // First chapter is always unlocked
        locked = false;
      } else {
        // Check if previous chapter was passed
        const previousChapter = chapters[index - 1];
        const previousProgress = userProgress.find(up => up.chapter_id === previousChapter.id);
        const previousSubmissions = submissions.filter(sub => sub.chapter_id === previousChapter.id);
        
        let previousPassed = false;
        if (previousProgress && previousProgress.mcq_passed) {
          previousPassed = true;
        } else if (previousSubmissions.length > 0) {
          previousPassed = previousSubmissions.some(sub => sub.passed);
        }
        
        // Current chapter is locked if previous chapter is not passed
        locked = !previousPassed;
      }

      return {
        chapter_id: chapter.id,
        chapter_title: chapter.title,
        chapter_order: chapter.order,
        passed,
        attempted,
        locked,
        total_attempts: chapterSubmissions.length,
        best_score: chapterSubmissions.length > 0 
          ? Math.max(...chapterSubmissions.map(sub => sub.score)) 
          : 0
      };
    });

    return res.sendSuccess(res, chapterStatus);

  } catch (err) {
    console.error("[getUserCourseMcqStatus] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};