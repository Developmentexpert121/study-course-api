import { Request, Response } from "express";
import Mcq from "../../models/mcq.model";

import Course from "../../models/course.model"; 
import UserProgress from "../../models/userProgress.model";
import Chapter from "../../models/chapter.model";
import { Op, Sequelize } from "sequelize";
import McqSubmission from "../../models/mcqSubmission.model"
import Enrollment from "../../models/enrollment.model";
import User from "../../models/user.model";

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
        passing_threshold: 75, // Let user know the passing threshold
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






export const getPassedMcqsByCourse = async (req: Request, res: Response) => {
  try {
    const { course_id } = req.params;
    const { user_id } = req.query;

    if (!user_id) {
      return res.sendError(res, "user_id is required as query parameter.");
    }

    if (!course_id) {
      return res.sendError(res, "course_id is required as path parameter.");
    }

    // Verify course exists
    const course = await Course.findByPk(course_id);
    if (!course) {
      return res.sendError(res, "Course not found.");
    }

    // Get all chapters for this specific course
    const chapters = await Chapter.findAll({
      where: { course_id: course_id },
      attributes: ['id', 'title', 'order'],
      order: [['order', 'ASC']]
    });

    if (!chapters.length) {
      return res.sendSuccess(res, {
        course_id: course_id,
        course_title: course.title,
        total_passed: 0,
        total_chapters: 0,
        passed_chapters: [],
        message: "No chapters found for this course."
      });
    }

    const chapterIds = chapters.map(chapter => chapter.id);

    // Get user's passing submissions for this specific course only
    const passingSubmissions = await McqSubmission.findAll({
      where: {
        user_id: user_id as string,
        course_id: course_id,
        passed: true
      },
      order: [["submitted_at", "DESC"]]
    });

    // Get all MCQs count for this course
    const totalMcqs = await Mcq.count({
      where: {
        course_id: course_id,
        is_active: true
      }
    });

    // Get chapter counts for this course
    const totalChapters = chapters.length;

    // Extract unique chapter IDs from passing submissions
    const passedChapterIds = [...new Set(passingSubmissions.map(sub => sub.chapter_id))];

    // Get details of passed chapters within this course
    const passedChapters = await Chapter.findAll({
      where: {
        id: passedChapterIds,
        course_id: course_id // Ensure we only get chapters from this course
      },
      attributes: ['id', 'title', 'order'],
      include: [{
        model: Course,
        attributes: ['id', 'title']
      }]
    });

    // Format the response with course context
    const passedMcqs = passedChapters.map(chapter => {
      const submission = passingSubmissions.find(sub => sub.chapter_id === chapter.id);
      return {
        chapter_id: chapter.id,
        chapter_title: chapter.title,
        chapter_order: chapter.order,
        course_id: chapter.course.id,
        course_title: chapter.course.title,
        passed_at: submission?.submitted_at,
        score: submission?.score,
        total_questions: submission?.total_questions,
        percentage: submission?.percentage,
        submission_id: submission?.id
      };
    });

    // Sort by chapter order
    passedMcqs.sort((a, b) => a.chapter_order - b.chapter_order);

    return res.sendSuccess(res, {
      course_id: course_id,
      course_title: course.title,
      total_passed: passedMcqs.length,
      total_mcqs: totalMcqs,
      total_chapters: totalChapters,
      passed_chapters: passedMcqs,
      progress_percentage: totalChapters > 0 ? Math.round((passedMcqs.length / totalChapters) * 100) : 0,
      message: `User has passed ${passedMcqs.length} out of ${totalChapters} chapters in course "${course.title}".`
    });

  } catch (err) {
    console.error("[getPassedMcqsByCourse] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};



//date 16/092025

export const getUserCompleteDetails = async (req: Request, res: Response) => {
  try {
    const { user_id } = req.params;

    if (!user_id) {
      return res.sendError(res, "user_id is required as path parameter.");
    }

    // Get user basic information
    const user = await User.findByPk(user_id, {
      attributes: ['id', 'username', 'email', 'role', 'verified', 'createdAt']
    });
    
    if (!user) {
      return res.sendError(res, "User not found.");
    }
    
    // Get all courses the user is enrolled in
    const enrolledCourses = await Enrollment.findAll({
      where: { user_id: user_id },
      include: [{
        model: Course,
        attributes: ['id', 'title', 'image', 'description'],
        where: { is_active: true }
      }],
      attributes: ['course_id', 'createdAt']
    });
    
    if (!enrolledCourses.length) {
      return res.sendSuccess(res, {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          verified: user.verified,
          created_at: user.createdAt
        },
        total_enrolled_courses: 0,
        enrolled_courses: [],
        overall_progress: {
          total_chapters: 0,
          total_passed_chapters: 0,
          overall_percentage: 0
        },
        mcq_statistics: {
          total_mcq_attempts: 0,
          total_passed_mcqs: 0,
          total_failed_mcqs: 0,
          pass_rate: 0
        },
        all_passed_mcqs: [],
        course_summary: {
          completed_courses: 0,
          in_progress_courses: 0,
          not_started_courses: 0
        },
        message: "User has not enrolled in any courses."
      });
    }

    const courseIds = enrolledCourses.map(enrollment => enrollment.course_id);
    
    // Get all chapters for enrolled courses
    const allChapters = await Chapter.findAll({
      where: { course_id: courseIds },
      attributes: ['id', 'title', 'course_id', 'order'],
      order: [['course_id', 'ASC'], ['order', 'ASC']]
    });

    // Get courses details for mapping
    const courses = await Course.findAll({
      where: { id: courseIds },
      attributes: ['id', 'title']
    });

    // Create course lookup map
    const courseMap = {};
    courses.forEach(course => {
      courseMap[course.id] = course;
    });

    // Create chapter lookup map
    const chapterMap = {};
    allChapters.forEach(chapter => {
      chapterMap[chapter.id] = chapter;
    });

    console.log("All chapters found:", allChapters.length);

    // Get ALL MCQ submissions WITHOUT nested includes to avoid association errors
    const allSubmissions = await McqSubmission.findAll({
      where: {
        user_id: user_id,
        course_id: courseIds
      },
      attributes: ['id', 'course_id', 'chapter_id', 'score', 'total_questions', 'percentage', 'passed', 'submitted_at'],
      order: [["submitted_at", "DESC"]]
    });

    console.log("All submissions found:", allSubmissions.length);

    // Get only passing submissions for chapter progress calculation
    const passingSubmissions = allSubmissions.filter(sub => sub.passed === true);

    // Process each enrolled course with detailed information
    const coursesWithDetails = await Promise.all(
      enrolledCourses.map(async (enrollment) => {
        const course = enrollment.course;
        const courseChapters = allChapters.filter(ch => ch.course_id === course.id);
        const courseSubmissions = allSubmissions.filter(sub => sub.course_id === course.id);
        const coursePassingSubmissions = passingSubmissions.filter(sub => sub.course_id === course.id);
        
        // Get unique passed chapters for this course
        const passedChapterIds = [...new Set(coursePassingSubmissions.map(sub => sub.chapter_id))];
        const passedChapters = courseChapters.filter(ch => passedChapterIds.includes(ch.id));

        // Get total MCQs count for this course
        const totalMcqs = await Mcq.count({
          where: {
            course_id: course.id,
            is_active: true
          }
        });

        // Format passed chapters with submission details
        const passedChapterDetails = passedChapters.map(chapter => {
          const submission = coursePassingSubmissions.find(sub => sub.chapter_id === chapter.id);
          return {
            chapter_id: chapter.id,
            chapter_title: chapter.title,
            chapter_order: chapter.order,
            course_id: course.id,
            course_title: course.title,
            passed_at: submission?.submitted_at || null,
            score: submission?.score || 0,
            total_questions: submission?.total_questions || 0,
            percentage: submission?.percentage || 0,
            submission_id: submission?.id || null
          };
        });

        // Get all MCQ attempts for this course (passed and failed) - using lookup maps
        const allMcqAttempts = courseSubmissions.map(submission => {
          const chapter = chapterMap[submission.chapter_id];
          const courseData = courseMap[submission.course_id];
          
          return {
            mcq_submission_id: submission.id,
            course_id: submission.course_id,
            course_title: courseData?.title || 'Unknown Course',
            chapter_id: submission.chapter_id,
            chapter_title: chapter?.title || 'Unknown Chapter',
            chapter_order: chapter?.order || 0,
            score: submission.score,
            total_questions: submission.total_questions,
            percentage: submission.percentage,
            passed: submission.passed,
            submitted_at: submission.submitted_at,
            status: submission.passed ? 'PASSED' : 'FAILED'
          };
        });

        // Sort by submission date (newest first)
        allMcqAttempts.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());

        // Sort passed chapters by chapter order
        passedChapterDetails.sort((a, b) => a.chapter_order - b.chapter_order);

        const totalChapters = courseChapters.length;
        const totalPassedChapters = passedChapterDetails.length;
        const completionPercentage = totalChapters > 0 ? Math.round((totalPassedChapters / totalChapters) * 100) : 0;

        return {
          course_id: course.id,
          course_title: course.title,
          course_image: course.image,
          course_description: course.description,
          enrollment_date: enrollment.createdAt,
          total_chapters: totalChapters,
          total_passed_chapters: totalPassedChapters,
          total_mcqs_in_course: totalMcqs,
          completion_percentage: completionPercentage,
          progress_status: completionPercentage === 100 ? 'completed' : 
                          completionPercentage > 0 ? 'in_progress' : 'not_started',
          passed_chapters: passedChapterDetails,
          all_mcq_attempts: allMcqAttempts,
          total_mcq_attempts: allMcqAttempts.length,
          passed_mcq_attempts: allMcqAttempts.filter(attempt => attempt.passed).length,
          failed_mcq_attempts: allMcqAttempts.filter(attempt => !attempt.passed).length
        };
      })
    );

    // Calculate overall statistics
    const totalChaptersAcrossAllCourses = coursesWithDetails.reduce((sum, course) => sum + course.total_chapters, 0);
    const totalPassedChaptersAcrossAllCourses = coursesWithDetails.reduce((sum, course) => sum + course.total_passed_chapters, 0);
    const totalMcqAttempts = coursesWithDetails.reduce((sum, course) => sum + course.total_mcq_attempts, 0);
    const totalPassedMcqs = coursesWithDetails.reduce((sum, course) => sum + course.passed_mcq_attempts, 0);
    const totalFailedMcqs = coursesWithDetails.reduce((sum, course) => sum + course.failed_mcq_attempts, 0);
    const overallPercentage = totalChaptersAcrossAllCourses > 0 ? 
      Math.round((totalPassedChaptersAcrossAllCourses / totalChaptersAcrossAllCourses) * 100) : 0;

    // Sort courses by enrollment date (newest first)
    coursesWithDetails.sort((a, b) => new Date(b.enrollment_date).getTime() - new Date(a.enrollment_date).getTime());

    // Get all MCQ attempts with details (both passed and failed, flattened from all courses)
    const allMcqAttempts = coursesWithDetails.flatMap(course => 
      course.all_mcq_attempts
    ).sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());

    // Get only passed MCQs for the all_passed_mcqs field
    const allPassedMcqs = allMcqAttempts.filter(attempt => attempt.passed);

    return res.sendSuccess(res, {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        verified: user.verified,
        created_at: user.createdAt
      },
      total_enrolled_courses: coursesWithDetails.length,
      enrolled_courses: coursesWithDetails,
      overall_progress: {
        total_chapters: totalChaptersAcrossAllCourses,
        total_passed_chapters: totalPassedChaptersAcrossAllCourses,
        overall_percentage: overallPercentage
      },
      mcq_statistics: {
        total_mcq_attempts: totalMcqAttempts,
        total_passed_mcqs: totalPassedMcqs,
        total_failed_mcqs: totalFailedMcqs,
        pass_rate: totalMcqAttempts > 0 ? Math.round((totalPassedMcqs / totalMcqAttempts) * 100) : 0
      },
      all_passed_mcqs: allPassedMcqs,
      all_mcq_attempts: allMcqAttempts,
      course_summary: {
        completed_courses: coursesWithDetails.filter(c => c.progress_status === 'completed').length,
        in_progress_courses: coursesWithDetails.filter(c => c.progress_status === 'in_progress').length,
        not_started_courses: coursesWithDetails.filter(c => c.progress_status === 'not_started').length
      },
      message: `Complete details for user ${user.username}: ${coursesWithDetails.length} courses, ${totalPassedMcqs} passed MCQs, ${overallPercentage}% overall progress.`
    });

  } catch (err) {
    console.error("[getUserCompleteDetails] Error:", err);
    console.error("Error stack:", err.stack); // Add this for better debugging
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};