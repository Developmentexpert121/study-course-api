// controllers/progress.controller.ts
import { Request, Response } from "express";
import UserProgress from "../../models/userProgress.model";
import Enrollment from "../../models/enrollment.model";
import Chapter from "../../models/chapter.model";
import Lesson from "../../models/lesson.model";
import Mcq from "../../models/mcq.model";
import McqSubmission from "../../models/mcqSubmission.model";
import { Op } from "sequelize";

// ✅ 1. Get User Course Progress (ESSENTIAL)
export const getUserCourseProgress = async (req: Request, res: Response) => {
    try {
        const { courseId } = req.params;
        const { user_id } = req.query;

        if (!user_id) {
            return res.status(400).sendError(res, "user_id is required");
        }

        console.log(`Getting course progress:`, { courseId, user_id });

        // Check enrollment
        const enrollment = await Enrollment.findOne({
            where: { user_id, course_id: courseId }
        });

        if (!enrollment) {
            return res.status(400).sendError(res, "User is not enrolled in this course");
        }

        // Get progress data using our helper function
        const progressData = await getUserCourseProgressData(user_id.toString(), courseId);

        return res.status(200).sendSuccess(res, progressData);

    } catch (err) {
        console.error("[getUserCourseProgress] Error:", err);
        return res.status(500).sendError(res, "ERR_INTERNAL_SERVER_ERROR");
    }
};

// ✅ 2. Get Chapter Status
export const getChapterStatus = async (req: Request, res: Response) => {
    try {
        const { courseId, chapterId } = req.params;
        const { user_id } = req.query;

        if (!user_id) {
            return res.status(400).sendError(res, "user_id is required");
        }

        console.log(`Getting chapter status:`, { courseId, chapterId, user_id });

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
                lesson_id: { [Op.ne]: null },
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

// ✅ 3. Mark Lesson as Completed (your existing function)
export const markLessonAsCompleted = async (req: Request, res: Response) => {
    try {
        const { courseId } = req.params;
        const { user_id, lesson_id, chapter_id } = req.body;

        if (!user_id || !lesson_id || !chapter_id) {
            return res.status(400).sendError(res, "user_id, lesson_id, and chapter_id are required");
        }

        console.log(`Marking lesson as completed:`, { courseId, user_id, lesson_id, chapter_id });

        // Check enrollment
        const enrollment = await Enrollment.findOne({
            where: { user_id, course_id: courseId }
        });

        if (!enrollment) {
            return res.status(400).sendError(res, "User is not enrolled in this course");
        }

        // Get lesson with chapter info
        const lesson = await Lesson.findByPk(lesson_id, {
            include: [{
                model: Chapter,
                as: 'chapter',
                attributes: ['id', 'course_id', 'order']
            }]
        });

        if (!lesson) {
            return res.status(404).sendError(res, "Lesson not found");
        }

        // ✅ CHECK CHAPTER LOCK STATUS
        const chapterProgress = await UserProgress.findOne({
            where: {
                user_id,
                course_id: courseId,
                chapter_id: chapter_id,
                lesson_id: null // Chapter-level record
            }
        });

        // If chapter progress doesn't exist, create it with correct lock status
        if (!chapterProgress) {
            const isFirstChapter = lesson.chapter.order === 1;
            const locked = !isFirstChapter; // First chapter unlocked, others locked

            await UserProgress.create({
                user_id,
                course_id: courseId,
                chapter_id: chapter_id,
                lesson_id: null,
                completed: false,
                mcq_passed: false,
                locked: locked,
                lesson_completed: false
            });
        } else if (chapterProgress.locked) {
            return res.status(400).sendError(res, "Chapter is locked. Complete previous chapter first.");
        }

        // ✅ MARK LESSON AS COMPLETED (Lesson-level record)
        // Use findOrCreate to handle unique constraint
        const [lessonProgress, created] = await UserProgress.findOrCreate({
            where: {
                user_id,
                course_id: courseId,
                chapter_id: chapter_id,
                lesson_id: lesson_id // Specific lesson
            },
            defaults: {
                completed: false,
                mcq_passed: false,
                locked: false, // Lessons are never locked if chapter is unlocked
                lesson_completed: true,
                completed_at: new Date()
            }
        });

        // If record already existed, update it
        if (!created && !lessonProgress.lesson_completed) {
            await UserProgress.update(
                {
                    lesson_completed: true,
                    completed_at: new Date()
                },
                {
                    where: { id: lessonProgress.id }
                }
            );
        }

        // ✅ CHECK IF ALL LESSONS IN CHAPTER ARE COMPLETED
        const completedLessonsCount = await UserProgress.count({
            where: {
                user_id,
                course_id: courseId,
                chapter_id: chapter_id,
                lesson_id: { [Op.ne]: null }, // Only lesson records
                lesson_completed: true
            }
        });

        const totalLessons = await Lesson.count({
            where: { chapter_id: chapter_id }
        });

        const allLessonsCompleted = completedLessonsCount >= totalLessons;

        // Update chapter progress if all lessons are completed
        if (allLessonsCompleted) {
            await UserProgress.update(
                { lesson_completed: true },
                {
                    where: {
                        user_id,
                        course_id: courseId,
                        chapter_id: chapter_id,
                        lesson_id: null // Chapter-level record
                    }
                }
            );
        }

        // Get updated progress
        const updatedProgress = await getUserCourseProgressData(user_id, courseId);

        return res.status(200).sendSuccess(res, {
            message: "Lesson marked as completed successfully",
            lesson_id: lesson_id,
            chapter_id: chapter_id,
            all_lessons_completed: allLessonsCompleted,
            can_attempt_mcq: allLessonsCompleted, // Can attempt MCQ when all lessons done
            progress: updatedProgress
        });

    } catch (err) {
        console.error("[markLessonAsCompleted] Error:", err);
        return res.status(500).sendError(res, "ERR_INTERNAL_SERVER_ERROR");
    }
};

// ✅ 4. Submit MCQ Answers (your existing function)
export const submitMCQAnswers = async (req: Request, res: Response) => {
    try {
        const { courseId } = req.params;
        const { user_id, chapter_id, answers } = req.body;

        if (!user_id || !chapter_id || !answers) {
            return res.status(400).sendError(res, "user_id, chapter_id and answers are required");
        }

        // ✅ CHECK IF CHAPTER IS UNLOCKED AND ALL LESSONS COMPLETED
        const chapterProgress = await UserProgress.findOne({
            where: {
                user_id,
                course_id: courseId,
                chapter_id: chapter_id,
                lesson_id: null
            }
        });

        if (!chapterProgress || chapterProgress.locked) {
            return res.status(400).sendError(res, "Chapter is locked");
        }

        // Verify all lessons are completed
        const completedLessonsCount = await UserProgress.count({
            where: {
                user_id,
                course_id: courseId,
                chapter_id: chapter_id,
                lesson_id: { [Op.ne]: null },
                lesson_completed: true
            }
        });

        const totalLessons = await Lesson.count({
            where: { chapter_id: chapter_id }
        });

        if (completedLessonsCount < totalLessons) {
            return res.status(400).sendError(res, "Complete all lessons before attempting MCQ");
        }

        // Get MCQs with correct answers
        const mcqs = await Mcq.findAll({
            where: {
                chapter_id: chapter_id,
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
        await McqSubmission.create({
            user_id,
            course_id: courseId,
            chapter_id: chapter_id,
            answers,
            score,
            passed,
            total_questions: mcqs.length,
            correct_answers: correctAnswers,
            submitted_at: new Date()
        });

        // ✅ UPDATE CHAPTER PROGRESS AND UNLOCK NEXT CHAPTER
        if (passed) {
            // Mark current chapter as completed
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
                        chapter_id: chapter_id,
                        lesson_id: null
                    }
                }
            );

            // ✅ UNLOCK NEXT CHAPTER
            const currentChapter = await Chapter.findByPk(chapter_id);
            const nextChapter = await Chapter.findOne({
                where: {
                    course_id: courseId,
                    order: currentChapter.order + 1
                }
            });

            if (nextChapter) {
                // Create or update next chapter progress as UNLOCKED
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
                        locked: false, // ✅ NEXT CHAPTER UNLOCKED!
                        lesson_completed: false
                    }
                });
            }
        }

        // Get updated progress
        const updatedProgress = await getUserCourseProgressData(user_id, courseId);

        return res.status(200).sendSuccess(res, {
            message: passed ? "MCQ passed successfully!" : "MCQ attempt failed",
            passed,
            score: Math.round(score),
            correct_answers: correctAnswers,
            total_questions: mcqs.length,
            results,
            next_chapter_unlocked: passed,
            progress: updatedProgress
        });

    } catch (err) {
        console.error("[submitMCQAnswers] Error:", err);
        return res.status(500).sendError(res, "ERR_INTERNAL_SERVER_ERROR");
    }
};

// ✅ Helper function to get progress data (your existing function)
const getUserCourseProgressData = async (user_id: string, courseId: string) => {
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
            attributes: ['id'],
            where: { is_active: true },
            required: false
        }]
    });

    const userProgress = await UserProgress.findAll({
        where: {
            user_id,
            course_id: courseId
        }
    });

    const chaptersWithProgress = await Promise.all(chapters.map(async (chapter, index) => {
        const chapterProgress = userProgress.find(p =>
            p.chapter_id === chapter.id && p.lesson_id === null
        );

        const lessonProgress = userProgress.filter(p =>
            p.chapter_id === chapter.id && p.lesson_id !== null
        );

        const completedLessons = lessonProgress.filter(p => p.lesson_completed);
        const allLessonsCompleted = completedLessons.length >= chapter.lessons.length;

        // ✅ PROPER LOCK LOGIC:
        let locked = true;
        if (index === 0) {
            locked = false; // First chapter always unlocked
        } else {
            const previousChapter = chapters[index - 1];
            const previousChapterProgress = userProgress.find(p =>
                p.chapter_id === previousChapter.id && p.lesson_id === null
            );
            // Locked if previous chapter not completed (mcq_passed)
            locked = !(previousChapterProgress && previousChapterProgress.mcq_passed);
        }

        // Can attempt MCQ only if:
        // 1. Chapter is unlocked AND
        // 2. All lessons are completed AND  
        // 3. MCQ not already passed
        const canAttemptMCQ = !locked && allLessonsCompleted && !chapterProgress?.mcq_passed;

        return {
            id: chapter.id,
            title: chapter.title,
            order: chapter.order,
            locked: locked,
            completed: chapterProgress?.completed || false,
            mcq_passed: chapterProgress?.mcq_passed || false,
            lesson_completed: chapterProgress?.lesson_completed || false,
            progress: {
                total_lessons: chapter.lessons.length,
                completed_lessons: completedLessons.length,
                all_lessons_completed: allLessonsCompleted,
                has_mcqs: chapter.mcqs.length > 0,
                total_mcqs: chapter.mcqs.length,
                can_attempt_mcq: canAttemptMCQ
            },
            lessons: chapter.lessons.map(lesson => ({
                id: lesson.id,
                title: lesson.title,
                order: lesson.order,
                duration: lesson.duration,
                completed: lessonProgress.some(p => p.lesson_id === lesson.id && p.lesson_completed),
                locked: locked // Lessons inherit chapter lock status
            }))
        };
    }));

    // Calculate overall progress
    const totalChapters = chapters.length;
    const completedChapters = chaptersWithProgress.filter(ch => ch.completed).length;
    const overallProgress = totalChapters > 0 ? (completedChapters / totalChapters) * 100 : 0;

    return {
        course_id: courseId,
        user_id,
        overall_progress: Math.round(overallProgress),
        total_chapters: totalChapters,
        completed_chapters: completedChapters,
        chapters: chaptersWithProgress
    };
};