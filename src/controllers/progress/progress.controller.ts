// controllers/progress.controller.ts
import { Request, Response } from "express";
import UserProgress from "../../models/userProgress.model";
import Enrollment from "../../models/enrollment.model";
import Chapter from "../../models/chapter.model";
import Lesson from "../../models/lesson.model";
import Mcq from "../../models/mcq.model";
import McqSubmission from "../../models/mcqSubmission.model";
import { Op } from "sequelize";

// Initialize course progress when user enrolls
export const initializeCourseProgress = async (req: Request, res: Response) => {
    try {
        const { user_id, course_id } = req.body;

        if (!user_id || !course_id) {
            return res.status(400).sendError(res, "user_id and course_id are required");
        }

        // Check enrollment
        const enrollment = await Enrollment.findOne({
            where: { user_id, course_id }
        });

        if (!enrollment) {
            return res.status(400).sendError(res, "User is not enrolled in this course");
        }

        // Get first chapter
        const firstChapter = await Chapter.findOne({
            where: { course_id },
            order: [['order', 'ASC']],
        });

        if (!firstChapter) {
            return res.status(400).sendError(res, "No chapters found in this course");
        }

        // Initialize first chapter (unlocked)
        const [progress, created] = await UserProgress.findOrCreate({
            where: {
                user_id,
                course_id,
                chapter_id: firstChapter.id,
                lesson_id: null // Main chapter record
            },
            defaults: {
                completed: false,
                mcq_passed: false,
                locked: false,
                lesson_completed: false
            }
        });

        return res.status(200).sendSuccess(res, {
            message: "Course progress initialized successfully",
            progress
        });

    } catch (err) {
        console.error("[initializeCourseProgress] Error:", err);
        return res.status(500).sendError(res, "ERR_INTERNAL_SERVER_ERROR");
    }
};


export const markLessonAsCompleted = async (req: Request, res: Response) => {
    try {
        // Get data from URL parameters
        const { courseId, lessonId } = req.params;
        const { user_id } = req.body;

        if (!user_id) {
            return res.status(400).sendError(res, "user_id is required");
        }

        // Get lesson with chapter info
        const lesson = await Lesson.findByPk(lessonId, {
            include: [{
                model: Chapter,
                as: 'chapter',
                attributes: ['id', 'course_id', 'order']
            }]
        });

        if (!lesson) {
            return res.status(404).sendError(res, "Lesson not found");
        }

        // Verify course matches
        if (lesson.chapter.course_id !== parseInt(courseId)) {
            return res.status(400).sendError(res, "Lesson does not belong to this course");
        }

        // Check enrollment
        const enrollment = await Enrollment.findOne({
            where: { user_id, course_id: courseId }
        });

        if (!enrollment) {
            return res.status(400).sendError(res, "User is not enrolled in this course");
        }

        // Check if chapter is unlocked
        const chapterProgress = await UserProgress.findOne({
            where: {
                user_id,
                course_id: courseId,
                chapter_id: lesson.chapter.id,
                lesson_id: null
            }
        });

        if (!chapterProgress || chapterProgress.locked) {
            return res.status(400).sendError(res, "Chapter is locked");
        }

        // Mark lesson as completed
        const [lessonProgress, created] = await UserProgress.findOrCreate({
            where: {
                user_id,
                course_id: courseId,
                chapter_id: lesson.chapter.id,
                lesson_id: lessonId
            },
            defaults: {
                completed: false,
                mcq_passed: false,
                locked: false,
                lesson_completed: true,
                completed_at: new Date()
            }
        });

        if (!created) {
            await lessonProgress.update({
                lesson_completed: true,
                completed_at: new Date()
            });
        }

        // Check if all lessons in chapter are completed
        const chapter = await Chapter.findByPk(lesson.chapter.id, {
            include: [{
                model: Lesson,
                as: 'lessons',
                attributes: ['id']
            }]
        });

        const totalLessons = chapter?.lessons?.length || 0;

        const completedLessonsCount = await UserProgress.count({
            where: {
                user_id,
                course_id: courseId,
                chapter_id: lesson.chapter.id,
                lesson_completed: true
            }
        });

        const allLessonsCompleted = completedLessonsCount >= totalLessons;

        // Update chapter's lesson_completed status
        if (allLessonsCompleted) {
            await UserProgress.update(
                { lesson_completed: true },
                {
                    where: {
                        user_id,
                        course_id: courseId,
                        chapter_id: lesson.chapter.id,
                        lesson_id: null
                    }
                }
            );
        }

        return res.status(200).sendSuccess(res, {
            message: "Lesson marked as completed",
            all_lessons_completed: allLessonsCompleted,
            completed_lessons: completedLessonsCount,
            total_lessons: totalLessons,
            mcq_unlocked: allLessonsCompleted
        });

    } catch (err) {
        console.error("[markLessonAsCompleted] Error:", err);
        return res.status(500).sendError(res, "ERR_INTERNAL_SERVER_ERROR");
    }
};

// Submit MCQ answers
export const submitMCQAnswers = async (req: Request, res: Response) => {
    try {
        const { courseId, chapterId } = req.params;
        const { user_id, answers } = req.body;

        if (!user_id || !answers) {
            return res.status(400).sendError(res, "user_id and answers are required");
        }

        // Check if user can attempt MCQ
        const chapterProgress = await UserProgress.findOne({
            where: {
                user_id,
                course_id: courseId,
                chapter_id: chapterId,
                lesson_id: null
            }
        });

        if (!chapterProgress || chapterProgress.locked) {
            return res.status(400).sendError(res, "Chapter is locked");
        }

        // Verify all lessons are completed
        if (!chapterProgress.lesson_completed) {
            const completedLessonsCount = await UserProgress.count({
                where: {
                    user_id,
                    course_id: courseId,
                    chapter_id: chapterId,
                    lesson_completed: true
                }
            });

            const totalLessons = await Lesson.count({
                where: { chapter_id: chapterId }
            });

            if (completedLessonsCount < totalLessons) {
                return res.status(400).sendError(res, "Complete all lessons before attempting MCQ");
            }
        }

        // Get MCQs with correct answers
        const mcqs = await Mcq.findAll({
            where: {
                chapter_id: chapterId,
                is_active: true
            },
            attributes: ['id', 'question', 'options', 'correct_answer']
        });

        if (mcqs.length === 0) {
            return res.status(400).sendError(res, "No MCQs available for this chapter");
        }

        // Calculate score
        let correctAnswers = 0;
        const results = [];

        for (const mcq of mcqs) {
            const userAnswer = answers[mcq.id];
            const isCorrect = userAnswer === mcq.correct_answer;

            if (isCorrect) correctAnswers++;

            results.push({
                mcq_id: mcq.id,
                question: mcq.question,
                user_answer: userAnswer,
                correct_answer: mcq.correct_answer,
                is_correct: isCorrect
            });
        }

        const score = (correctAnswers / mcqs.length) * 100;
        const passed = score >= 50; // 50% passing threshold

        // Record submission
        const submission = await McqSubmission.create({
            user_id,
            course_id: courseId,
            chapter_id: chapterId,
            answers,
            score,
            passed,
            total_questions: mcqs.length,
            correct_answers: correctAnswers,
            submitted_at: new Date()
        });

        // Update chapter progress
        // In submitMCQAnswers - ensure next chapter is unlocked
        if (passed) {
            await UserProgress.update(
                {
                    mcq_passed: true,
                    completed: true,
                    completed_at: new Date()
                },
                {
                    where: {
                        user_id,
                        course_id: courseId,
                        chapter_id: chapterId,
                        lesson_id: null
                    }
                }
            );

            // Unlock next chapter - CREATE PROGRESS RECORD
            const currentChapter = await Chapter.findByPk(chapterId);
            const nextChapter = await Chapter.findOne({
                where: {
                    course_id: courseId,
                    order: currentChapter.order + 1
                }
            });

            if (nextChapter) {
                await UserProgress.findOrCreate({
                    where: {
                        user_id,
                        course_id: courseId,
                        chapter_id: nextChapter.id,
                        lesson_id: null
                    },
                    defaults: {
                        completed: false,
                        mcq_passed: false,
                        locked: false, // Next chapter should be unlocked when created
                        lesson_completed: false
                    }
                });
            }
        }

        return res.status(200).sendSuccess(res, {
            message: passed ? "MCQ passed successfully!" : "MCQ attempt failed",
            passed,
            score: Math.round(score),
            correct_answers: correctAnswers,
            total_questions: mcqs.length,
            results,
            next_chapter_unlocked: passed
        });

    } catch (err) {
        console.error("[submitMCQAnswers] Error:", err);
        return res.status(500).sendError(res, "ERR_INTERNAL_SERVER_ERROR");
    }
};

// Get user progress for a course
export const getUserCourseProgress = async (req: Request, res: Response) => {
    try {
        const { courseId } = req.params;
        const { user_id } = req.query;

        if (!user_id) {
            return res.status(400).sendError(res, "user_id is required");
        }

        // Get all chapters for the course
        const chapters = await Chapter.findAll({
            where: { course_id: courseId },
            order: [['order', 'ASC']],
            include: [{
                model: Lesson,
                as: 'lessons',
                attributes: ['id', 'title', 'order', 'duration'],
                order: [['order', 'ASC']]
            }, {
                model: Mcq,
                as: 'mcqs',
                attributes: ['id', 'question'],
                where: { is_active: true },
                required: false
            }]
        });

        // Get user progress for all chapters
        const userProgress = await UserProgress.findAll({
            where: {
                user_id,
                course_id: courseId,
                lesson_id: null // Only chapter-level progress
            }
        });

        // Format response with progress status
        // FIXED chapter locking logic in getUserCourseProgress
        const chaptersWithProgress = chapters.map((chapter, index) => {
            const progress = userProgress.find(p => p.chapter_id === chapter.id);

            // Determine chapter lock status - FIXED
            let locked = true;

            if (index === 0) {
                locked = false; // First chapter always unlocked
            } else {
                // Check if previous chapter is completed (mcq_passed)
                const prevChapter = chapters[index - 1];
                const prevProgress = userProgress.find(p => p.chapter_id === prevChapter.id);
                locked = !(prevProgress && prevProgress.mcq_passed); // Lock if previous chapter MCQ not passed
            }

            // Rest of your code remains the same...
            const lessonProgress = userProgress.filter(p =>
                p.chapter_id === chapter.id && p.lesson_id !== null
            );

            const completedLessons = lessonProgress.filter(p => p.lesson_completed);
            const allLessonsCompleted = completedLessons.length >= chapter.lessons.length;

            return {
                id: chapter.id,
                title: chapter.title,
                order: chapter.order,
                locked, // This should now be correct
                completed: progress?.completed || false,
                mcq_passed: progress?.mcq_passed || false,
                lesson_completed: progress?.lesson_completed || false,
                progress: {
                    total_lessons: chapter.lessons.length,
                    completed_lessons: completedLessons.length,
                    all_lessons_completed: allLessonsCompleted,
                    has_mcqs: chapter.mcqs.length > 0,
                    total_mcqs: chapter.mcqs.length,
                    can_attempt_mcq: allLessonsCompleted && !progress?.mcq_passed
                },
                lessons: chapter.lessons.map(lesson => ({
                    id: lesson.id,
                    title: lesson.title,
                    order: lesson.order,
                    duration: lesson.duration,
                    completed: lessonProgress.some(p => p.lesson_id === lesson.id && p.lesson_completed)
                }))
            };
        });

        // Calculate overall progress
        const totalChapters = chapters.length;
        const completedChapters = chaptersWithProgress.filter(ch => ch.completed).length;
        const overallProgress = totalChapters > 0 ? (completedChapters / totalChapters) * 100 : 0;

        return res.status(200).sendSuccess(res, {
            course_id: courseId,
            user_id,
            overall_progress: Math.round(overallProgress),
            total_chapters: totalChapters,
            completed_chapters: completedChapters,
            chapters: chaptersWithProgress
        });

    } catch (err) {
        console.error("[getUserCourseProgress] Error:", err);
        return res.status(500).sendError(res, "ERR_INTERNAL_SERVER_ERROR");
    }
};

// Get chapter status (for frontend to check lock status)
export const getChapterStatus = async (req: Request, res: Response) => {
    try {
        const { courseId, chapterId } = req.params;
        const { user_id } = req.query;

        if (!user_id) {
            return res.status(400).sendError(res, "user_id is required");
        }

        const chapter = await Chapter.findByPk(chapterId, {
            include: [{
                model: Lesson,
                as: 'lessons',
                attributes: ['id']
            }]
        });

        if (!chapter) {
            return res.status(404).sendError(res, "Chapter not found");
        }

        const progress = await UserProgress.findOne({
            where: {
                user_id,
                course_id: courseId,
                chapter_id: chapterId,
                lesson_id: null
            }
        });

        const completedLessonsCount = await UserProgress.count({
            where: {
                user_id,
                course_id: courseId,
                chapter_id: chapterId,
                lesson_completed: true
            }
        });

        const totalLessons = chapter.lessons.length;
        const allLessonsCompleted = completedLessonsCount >= totalLessons;

        return res.status(200).sendSuccess(res, {
            chapter_id: chapterId,
            locked: progress?.locked ?? true,
            completed: progress?.completed || false,
            mcq_passed: progress?.mcq_passed || false,
            lesson_completed: progress?.lesson_completed || false,
            lessons: {
                completed: completedLessonsCount,
                total: totalLessons,
                all_completed: allLessonsCompleted
            },
            can_attempt_mcq: allLessonsCompleted && !progress?.mcq_passed
        });

    } catch (err) {
        console.error("[getChapterStatus] Error:", err);
        return res.status(500).sendError(res, "ERR_INTERNAL_SERVER_ERROR");
    }
};



// Submit MCQ answers - USING URL PARAMETERS
