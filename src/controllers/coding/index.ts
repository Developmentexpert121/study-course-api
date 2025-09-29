import { Request, Response } from "express";
import { Op } from "sequelize"; // Import Op from sequelize
import CodingQuestion from "../../models/codingQuestion.model";
import Course from "../../models/course.model"; 
import UserProgress from "../../models/userProgress.model";
import Chapter from "../../models/chapter.model";
import axios from 'axios';
import CodingSubmission from "../../models/codingSubmission.model";


// Helper function to evaluate code using Judge0 API
const evaluateCode = async (sourceCode: string, languageId: number, testCases: any[]) => {
  try {
    const results = [];
    
    for (const testCase of testCases) {
      const submission = {
        source_code: sourceCode,
        language_id: languageId,
        stdin: testCase.input || '',
        expected_output: testCase.expected_output
      };

      const response = await axios.post('https://judge0-ce.p.rapidapi.com/submissions', submission, {
        headers: {
          'Content-Type': 'application/json',
          'X-RapidAPI-Key': process.env.RAPIDAPI_KEY, // Add your RapidAPI key
          'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
        }
      });

      // Get result
      const token = response.data.token;
      let result;
      let attempts = 0;
      
      do {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        const resultResponse = await axios.get(`https://judge0-ce.p.rapidapi.com/submissions/${token}`, {
          headers: {
            'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
            'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
          }
        });
        result = resultResponse.data;
        attempts++;
      } while (result.status.id <= 2 && attempts < 10); // Status 1,2 = In Queue, Processing

      const isPassed = result.stdout?.trim() === testCase.expected_output?.trim() && result.status.id === 3;
      
      results.push({
        test_case_id: testCase.id,
        input: testCase.input,
        expected_output: testCase.expected_output,
        actual_output: result.stdout?.trim() || '',
        status: result.status.description,
        passed: isPassed,
        execution_time: result.time,
        memory_used: result.memory,
        error: result.stderr || result.compile_output || null
      });
    }

    return results;
  } catch (error) {
    console.error('Code evaluation error:', error);
    throw new Error('Code evaluation failed');
  }
};

const getLanguageId = (language: string): number => {
  const languageMap: { [key: string]: number } = {
    'javascript': 63,
    'python': 71,
    'java': 62,
    'cpp': 54,
    'c': 50,
    'go': 60,
    'rust': 73,
    'php': 68,
    'ruby': 72,
    'swift': 83,
    'kotlin': 78,
    'scala': 81,
    'csharp': 51
  };
  return languageMap[language.toLowerCase()] || 63; // Default to JavaScript
};

export const createCodingQuestion = async (req: Request, res: Response) => {
  try {
    const { 
      title, 
      description, 
      difficulty, 
      test_cases, 
      starter_code, 
      solution_code, 
      allowed_languages, 
      time_limit, 
      memory_limit, 
      course_id, 
      chapter_id,
      hints,
      tags
    } = req.body;

    if (!title || !description || !test_cases || !course_id || !chapter_id) {
      return res.sendError(res, "Required fields: title, description, test_cases, course_id, chapter_id");
    }

    const course = await Course.findByPk(course_id);
    if (!course) {
      return res.sendError(res, "Course not found.");
    }

    const chapter = await Chapter.findByPk(chapter_id);
    if (!chapter || chapter.course_id !== course_id) {
      return res.sendError(res, "Invalid chapter ID for the selected course.");
    }

    // Validate test cases format
    if (!Array.isArray(test_cases) || test_cases.length === 0) {
      return res.sendError(res, "Test cases must be a non-empty array.");
    }

    const codingQuestion = await CodingQuestion.create({ 
      title,
      description,
      difficulty: difficulty || 'medium',
      test_cases,
      starter_code: starter_code || {},
      solution_code: solution_code || {},
      allowed_languages: allowed_languages || ['javascript', 'python', 'java', 'cpp'],
      time_limit: time_limit || 2000, // 2 seconds default
      memory_limit: memory_limit || 128000, // 128MB default
      course_id,
      chapter_id,
      hints: hints || [],
      tags: tags || [],
      is_active: true
    });

    return res.sendSuccess(res, { 
      message: "Coding question created successfully", 
      codingQuestion 
    });
  } catch (err) {
    console.error("[createCodingQuestion] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

export const updateCodingQuestion = async (req: Request, res: Response) => {
  try {
    const codingQuestion = await CodingQuestion.findByPk(req.params.id);
    if (!codingQuestion) return res.sendError(res, "Coding question not found");

    await codingQuestion.update(req.body);
    return res.sendSuccess(res, { 
      message: "Coding question updated", 
      codingQuestion 
    });
  } catch (err) {
    console.error("[updateCodingQuestion] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

export const toggleCodingQuestionStatus = async (req: Request, res: Response) => {
  try {
    const codingQuestion = await CodingQuestion.findByPk(req.params.id);
    if (!codingQuestion) return res.sendError(res, "Coding question not found");

    codingQuestion.is_active = !!req.body.is_active;
    await codingQuestion.save();

    return res.sendSuccess(res, {
      message: `Coding question ${codingQuestion.is_active ? "activated" : "deactivated"} successfully`,
      codingQuestion,
    });
  } catch (err) {
    console.error("[toggleCodingQuestionStatus] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

export const deleteCodingQuestion = async (req: Request, res: Response) => {
  try {
    const deleted = await CodingQuestion.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.sendError(res, "Coding question not found");

    return res.sendSuccess(res, { message: "Coding question deleted successfully" });
  } catch (err) {
    console.error("[deleteCodingQuestion] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};



export const submitCodingQuestion = async (req: Request, res: Response) => {
  try {
    const { user_id, chapter_id, coding_question_id, source_code, language } = req.body;
    
    if (!user_id || !chapter_id || !coding_question_id || !source_code || !language) {
      return res.sendError(res, "user_id, chapter_id, coding_question_id, source_code, and language are required.");
    }

    // Get coding question with test cases
    const codingQuestion = await CodingQuestion.findByPk(coding_question_id);
    if (!codingQuestion) {
      return res.sendError(res, "Coding question not found.");
    }

    // Check if language is allowed
    if (!codingQuestion.allowed_languages.includes(language)) {
      return res.sendError(res, `Language ${language} is not allowed for this question.`);
    }

    // Get chapter and course info
    const chapter = await Chapter.findByPk(chapter_id);
    if (!chapter) {
      return res.sendError(res, "Chapter not found.");
    }

    // Evaluate code against test cases
    const languageId = getLanguageId(language);
    const testResults = await evaluateCode(source_code, languageId, codingQuestion.test_cases);
    
    // Calculate results
    const totalTestCases = testResults.length;
    const passedTestCases = testResults.filter(result => result.passed).length;
    const passed = passedTestCases === totalTestCases;
    const score = Math.round((passedTestCases / totalTestCases) * 100);

    // Save submission
    const submission = await CodingSubmission.create({
      user_id,
      chapter_id,
      course_id: chapter.course_id,
      coding_question_id,
      source_code,
      language,
      test_results: testResults,
      total_test_cases: totalTestCases,
      passed_test_cases: passedTestCases,
      score,
      passed,
      execution_time: Math.max(...testResults.map(r => r.execution_time || 0)),
      memory_used: Math.max(...testResults.map(r => r.memory_used || 0)),
      submitted_at: new Date()
    });

    // Update user progress if passed
    if (passed) {
      await UserProgress.update(
        {
          coding_completed: true,
          coding_passed: true,
          completed: true
        },
        {
          where: { user_id, chapter_id }
        }
      );

      // Unlock next chapter
      const nextChapter = await Chapter.findOne({
        where: {
          course_id: chapter.course_id,
          order: chapter.order + 1
        }
      });

      if (nextChapter) {
        await UserProgress.findOrCreate({
          where: {
            user_id,
            course_id: chapter.course_id,
            chapter_id: nextChapter.id
          },
          defaults: {
            completed: false,
            coding_passed: false,
            locked: false
          }
        });
      }
    }

    return res.sendSuccess(res, {
      message: passed ? 
        "Congratulations! All test cases passed. Next chapter unlocked." : 
        `${passedTestCases}/${totalTestCases} test cases passed. Keep trying!`,
      data: {
        submission_id: submission.id,
        score,
        passed,
        total_test_cases: totalTestCases,
        passed_test_cases: passedTestCases,
        test_results: testResults.map(r => ({
          test_case_id: r.test_case_id,
          passed: r.passed,
          execution_time: r.execution_time,
          memory_used: r.memory_used,
          // Don't expose expected output or actual output for security
          status: r.status,
          error: r.error
        }))
      }
    });
  } catch (err) {
    console.error("[submitCodingQuestion] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

export const getUserCodingSubmissions = async (req: Request, res: Response) => {
  try {
    const { user_id, chapter_id, coding_question_id } = req.query;

    if (!user_id) {
      return res.sendError(res, "user_id is required.");
    }

    const where: any = { user_id: user_id as string };
    
    if (chapter_id) where.chapter_id = chapter_id as string;
    if (coding_question_id) where.coding_question_id = coding_question_id as string;

    const submissions = await CodingSubmission.findAll({
      where,
      include: [
        {
          model: CodingQuestion,
          attributes: ['id', 'title', 'difficulty']
        },
        {
          model: Chapter,
          attributes: ['id', 'title']
        }
      ],
      order: [["submitted_at", "DESC"]]
    });

    return res.sendSuccess(res, {
      data: submissions,
      total: submissions.length
    });
  } catch (err) {
    console.error("[getUserCodingSubmissions] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

export const getUserBestCodingSubmission = async (req: Request, res: Response) => {
  try {
    const { user_id, coding_question_id } = req.query;

    if (!user_id || !coding_question_id) {
      return res.sendError(res, "user_id and coding_question_id are required.");
    }

    const bestSubmission = await CodingSubmission.findOne({
      where: {
        user_id: user_id as string,
        coding_question_id: coding_question_id as string
      },
      order: [["score", "DESC"], ["submitted_at", "DESC"]]
    });

    return res.sendSuccess(res, {
      data: bestSubmission
    });
  } catch (err) {
    console.error("[getUserBestCodingSubmission] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

export const getCodingQuestionStats = async (req: Request, res: Response) => {
  try {
    const { user_id, coding_question_id } = req.query;

    if (!user_id || !coding_question_id) {
      return res.sendError(res, "user_id and coding_question_id are required.");
    }

    const submissions = await CodingSubmission.findAll({
      where: {
        user_id: user_id as string,
        coding_question_id: coding_question_id as string
      },
      order: [["submitted_at", "DESC"]]
    });

    const bestSubmission = await CodingSubmission.findOne({
      where: {
        user_id: user_id as string,
        coding_question_id: coding_question_id as string
      },
      order: [["score", "DESC"], ["submitted_at", "DESC"]]
    });

    const totalAttempts = submissions.length;
    const bestScore = bestSubmission ? bestSubmission.score : 0;
    const passed = bestSubmission ? bestSubmission.passed : false;
    const languageStats = submissions.reduce((acc: { [key: string]: number }, sub) => {
      acc[sub.language] = (acc[sub.language] || 0) + 1;
      return acc;
    }, {});

    return res.sendSuccess(res, {
      data: {
        total_attempts: totalAttempts,
        best_score: bestScore,
        passed: passed,
        language_stats: languageStats,
        submissions: submissions
      }
    });
  } catch (err) {
    console.error("[getCodingQuestionStats] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};
export const updateCodingQuestionStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (!id) {
      return res.sendError(res, "Coding question ID is required.");
    }

    if (typeof is_active !== 'boolean') {
      return res.sendError(res, "is_active must be a boolean value.");
    }

    // Find and update the coding question
    const codingQuestion = await CodingQuestion.findByPk(id);
    
    if (!codingQuestion) {
      return res.sendError(res, "Coding question not found.");
    }

    // Update the status
    await codingQuestion.update({ is_active });

    return res.sendSuccess(res, {
      id: codingQuestion.id,
      is_active: codingQuestion.is_active,
      message: `Coding question ${is_active ? 'activated' : 'deactivated'} successfully`
    });

  } catch (err) {
    console.error("[updateCodingQuestionStatus] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};


export const getAllCodingQuestions = async (req: Request, res: Response) => {
  try {
    const { course_id } = req.query;

    console.log("🔍 getAllCodingQuestions called with query:", req.query);

    if (!course_id) {
      console.log("❌ No course_id provided");
      return res.sendError(res, "course_id is required");
    }

    console.log("🔍 Searching for course_id:", course_id, typeof course_id);

    // Simple query first
    console.log("🔍 About to execute database query...");
    const codingQuestions = await CodingQuestion.findAll({
      where: { course_id: course_id as string }
    });

    console.log("🔍 Database query completed successfully");
    console.log("🔍 Found questions count:", codingQuestions.length);
    
    if (codingQuestions.length > 0) {
      console.log("🔍 First question sample:", {
        id: codingQuestions[0].id,
        title: codingQuestions[0].title,
        course_id: codingQuestions[0].course_id,
        difficulty: codingQuestions[0].difficulty
      });
    }

    console.log("🔍 About to send response...");

    const response = {
      message: "Coding questions retrieved successfully",
      data: codingQuestions
    };

    console.log("🔍 Response prepared:", {
      message: response.message,
      dataCount: response.data.length
    });

    return res.sendSuccess(res, response);

  } catch (err) {
    console.error("❌ [getAllCodingQuestions] Error occurred:");
    console.error("❌ Error name:", err.name);
    console.error("❌ Error message:", err.message);
    console.error("❌ Error stack:", err.stack);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};











// date - 29/09/2025

export const getCodingQuestionById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    console.log("🔍 getCodingQuestionById called with ID:", id);

    if (!id) {
      console.log("❌ No ID provided");
      return res.status(400).json({
        success: false,
        message: "Coding question ID is required."
      });
    }

    // Simple findByPk without any includes
    const codingQuestion = await CodingQuestion.findByPk(id);

    console.log("🔍 Query completed, found:", codingQuestion ? "YES" : "NO");

    if (!codingQuestion) {
      console.log("❌ Coding question not found with ID:", id);
      return res.status(404).json({
        success: false,
        message: "Coding question not found."
      });
    }

    console.log("✅ Returning question data");

    // Return the plain dataValues
    return res.status(200).json({
      success: true,
      message: "Coding question retrieved successfully",
      data: codingQuestion.toJSON()
    });

  } catch (err: any) {
    console.error("❌ [getCodingQuestionById] FULL ERROR:");
    console.error(err);
    
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};
