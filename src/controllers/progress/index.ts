// controllers/progress.controller.ts
import { Request, Response } from "express";
import UserProgress from "../../models/userProgress.model";
import Enrollment from "../../models/enrollment.model";
import Chapter from "../../models/chapter.model";
import Lesson from "../../models/lesson.model";
import Mcq from "../../models/mcq.model";
import { Op } from "sequelize";

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
                chapter_id: chapterId
            }
        });

        // Get completed lessons from JSON array
        const completedLessons = progress?.completed_lessons
            ? JSON.parse(progress.completed_lessons)
            : [];

        const totalLessons = chapter.lessons.length;
        const allLessonsCompleted = completedLessons.length >= totalLessons;

        return res.status(200).sendSuccess(res, {
            chapter_id: chapterId,
            locked: progress?.locked ?? true,
            completed: progress?.completed || false,
            mcq_passed: progress?.mcq_passed || false,
            lesson_completed: progress?.lesson_completed || false,
            lessons: {
                completed: completedLessons.length,
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

export const markLessonAsCompleted = async (req: Request, res: Response) => {
    try {
        const { courseId } = req.params;
        const { user_id, lesson_id, chapter_id } = req.body;

        console.log('🎯 [BACKEND] Marking lesson as completed:', {
            user_id,
            lesson_id,
            chapter_id,
            courseId
        });

        // 1. First, get or create the chapter progress record
        console.log('📝 [BACKEND] Getting/Creating chapter progress record...');
        const [chapterProgress, created] = await UserProgress.findOrCreate({
            where: {
                user_id: user_id,
                course_id: courseId,
                chapter_id: chapter_id
            },
            defaults: {
                user_id: user_id,
                course_id: courseId,
                chapter_id: chapter_id,
                lesson_id: null,
                completed: false,
                mcq_passed: false,
                locked: false,
                lesson_completed: false,
                completed_lessons: JSON.stringify([lesson_id]) // Start with first lesson
            }
        });

        console.log('📝 [BACKEND] Chapter progress result:', {
            created,
            chapterId: chapterProgress.chapter_id,
            existingCompletedLessons: chapterProgress.completed_lessons
        });

        // 2. Safely parse the completed_lessons array
        let completedLessons: number[] = [];

        if (chapterProgress.completed_lessons) {
            try {
                completedLessons = JSON.parse(chapterProgress.completed_lessons);
                console.log('📝 [BACKEND] Parsed completed lessons:', completedLessons);
            } catch (parseError) {
                console.error('❌ [BACKEND] Error parsing completed_lessons, starting fresh:', parseError);
                completedLessons = [];
            }
        } else {
            console.log('📝 [BACKEND] No completed_lessons found, starting fresh array');
            completedLessons = [];
        }

        // 3. Add the lesson if it's not already in the list
        if (!completedLessons.includes(lesson_id)) {
            completedLessons.push(lesson_id);
            console.log('✅ [BACKEND] Added lesson to completed list. New list:', completedLessons);
        } else {
            console.log('ℹ️ [BACKEND] Lesson already in completed list');
        }

        // 4. Update the chapter record with the new completed lessons
        console.log('📝 [BACKEND] Updating chapter progress...');
        await chapterProgress.update({
            completed_lessons: JSON.stringify(completedLessons),
            lesson_completed: false,
            // Ensure these fields are always set to avoid conflicts
            locked: false,
            completed: false,
            mcq_passed: false
        });

        // 5. Verify the update worked by fetching the record again
        const updatedProgress = await UserProgress.findOne({
            where: {
                user_id: user_id,
                course_id: courseId,
                chapter_id: chapter_id
            }
        });

        console.log('🔍 [BACKEND] Verified update - completed_lessons:', updatedProgress?.completed_lessons);

        // 6. Count completed lessons and check if all are done
        const totalLessons = await Lesson.count({
            where: { chapter_id: chapter_id }
        });

        const allLessonsCompleted = completedLessons.length >= totalLessons;

        console.log('📊 [BACKEND] Final progress status:', {
            completedLessonsCount: completedLessons.length,
            totalLessons,
            completedLessons,
            allLessonsCompleted
        });

        // 7. Return detailed response
        return res.status(200).sendSuccess(res, {
            message: "Lesson marked as completed successfully",
            lesson_id: lesson_id,
            chapter_id: chapter_id,
            all_lessons_completed: allLessonsCompleted,
            can_attempt_mcq: allLessonsCompleted,
            completed_lessons: completedLessons.length,
            total_lessons: totalLessons,
            debug: {
                chapter_record_updated: !created,
                completed_lessons_list: completedLessons,
                total_lessons_count: totalLessons
            }
        });

    } catch (err) {
        console.error('❌ [BACKEND] markLessonAsCompleted Error:', err);
        return res.status(500).sendError(res, "ERR_INTERNAL_SERVER_ERROR");
    }
};
export const submitMCQAnswers = async (req: Request, res: Response) => {
    try {
        const { courseId } = req.params;
        const { user_id, chapter_id, answers } = req.body;

        if (!user_id || !chapter_id || !answers) {
            return res.status(400).sendError(res, "user_id, chapter_id and answers are required");
        }

        console.log(`🔍 [DEBUG] Submitting MCQ for:`, {
            user_id,
            courseId,
            chapter_id,
            total_answers: Object.keys(answers).length
        });

        const chapterProgress = await UserProgress.findOne({
            where: {
                user_id,
                course_id: courseId,
                chapter_id: chapter_id
            }
        });

        if (!chapterProgress) {
            return res.status(400).sendError(res, "Chapter progress not found");
        }

        // Safely get completed lessons from JSON array
        let completedLessons: number[] = [];
        if (chapterProgress.completed_lessons) {
            try {
                completedLessons = JSON.parse(chapterProgress.completed_lessons);
            } catch (error) {
                console.error('❌ [DEBUG] Error parsing completed_lessons:', error);
                completedLessons = [];
            }
        }

        const totalLessons = await Lesson.count({
            where: { chapter_id: chapter_id }
        });

        console.log(`🔍 [DEBUG] Lesson completion check:`, {
            completedLessonsCount: completedLessons.length,
            totalLessons,
            completedLessons,
            allLessonsCompleted: completedLessons.length >= totalLessons
        });

        if (completedLessons.length < totalLessons) {
            return res.status(400).sendError(res,
                `Complete all lessons before attempting MCQ. Completed: ${completedLessons.length}/${totalLessons}`
            );
        }

        if (chapterProgress.locked) {
            return res.status(400).sendError(res, "Chapter is locked");
        }

        // ✅ MCQ VALIDATION AND SCORING LOGIC
        console.log(`📊 [MCQ] Validating answers for chapter ${chapter_id}`);

        // 1. Get all MCQs for this chapter
        const chapterMCQs = await Mcq.findAll({
            where: {
                chapter_id: chapter_id,
                is_active: true
            },
            attributes: ['id', 'question', 'correct_answer', 'options']
        });

        console.log(`📊 [MCQ] Found ${chapterMCQs.length} active MCQs for chapter ${chapter_id}`);

        // 2. Calculate score
        let correctAnswers = 0;
        const totalQuestions = chapterMCQs.length;

        const answerResults = chapterMCQs.map(mcq => {
            const userAnswer = answers[mcq.id];
            const isCorrect = userAnswer === mcq.correct_answer;

            if (isCorrect) {
                correctAnswers++;
            }

            // ✅ FIX: Safe options parsing
            let optionsArray: string[] = [];
            try {
                // Try to parse as JSON first
                optionsArray = JSON.parse(mcq.options);
            } catch (jsonError) {
                // If JSON parsing fails, try to split by comma as fallback
                console.log(`⚠️ [MCQ] JSON parse failed for MCQ ${mcq.id}, using fallback parsing`);
                try {
                    // Split by comma but be careful with commas inside options
                    optionsArray = mcq.options.split(',').map((opt: string) => opt.trim());
                } catch (splitError) {
                    console.error(`❌ [MCQ] Fallback parsing also failed for MCQ ${mcq.id}:`, splitError);
                    optionsArray = ["Error loading options"];
                }
            }

            return {
                mcq_id: mcq.id,
                user_answer: userAnswer,
                correct_answer: mcq.correct_answer,
                is_correct: isCorrect,
                question: mcq.question,
                options: optionsArray
            };
        });

        const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
        const passed = score >= 75; // 75% passing threshold

        console.log(`📊 [MCQ] Score calculation:`, {
            correctAnswers,
            totalQuestions,
            score,
            passed,
            passingThreshold: 75
        });

        // 3. Update chapter progress based on result
        if (passed) {
            // User passed - mark chapter as completed and unlock next chapter
            await chapterProgress.update({
                mcq_passed: true,
                completed: true,
                locked: false
            });

            console.log(`✅ [MCQ] User passed! Chapter ${chapter_id} marked as completed.`);

            // ✅ Unlock next chapter if exists
            try {
                const currentChapter = await Chapter.findByPk(chapter_id);
                if (currentChapter) {
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
                                chapter_id: nextChapter.id
                            },
                            defaults: {
                                user_id,
                                course_id: courseId,
                                chapter_id: nextChapter.id,
                                lesson_id: null,
                                completed: false,
                                mcq_passed: false,
                                locked: false, // Unlock next chapter
                                lesson_completed: false,
                                completed_lessons: JSON.stringify([])
                            }
                        });
                        console.log(`🔓 [MCQ] Next chapter ${nextChapter.id} unlocked`);
                    }
                }
            } catch (unlockError) {
                console.error('❌ [MCQ] Error unlocking next chapter:', unlockError);
            }

        } else {
            // User failed - don't mark as completed but allow reattempts
            await chapterProgress.update({
                mcq_passed: false,
                completed: false
                // Keep chapter unlocked for reattempts
            });

            console.log(`❌ [MCQ] User failed. Score: ${score}% (needed 75%)`);
        }

        // 4. Return detailed results with reattempt information
        return res.status(200).sendSuccess(res, {
            message: passed
                ? "🎉 Congratulations! MCQ passed successfully! Next chapter unlocked."
                : `❌ MCQ failed. You scored ${score}% but need 75% to pass. You can reattempt the test.`,
            chapter_id: chapter_id,
            passed: passed,
            score: score,
            correct_answers: correctAnswers,
            total_questions: totalQuestions,
            passing_threshold: 75,
            completed_lessons: completedLessons.length,
            total_lessons: totalLessons,
            can_reattempt: !passed, // Allow reattempt if failed
            attempts_remaining: 3, // You can track actual attempts if needed
            answer_breakdown: answerResults,
            next_chapter_unlocked: passed
        });

    } catch (err) {
        console.error("[submitMCQAnswers] Error:", err);
        return res.status(500).sendError(res, "ERR_INTERNAL_SERVER_ERROR");
    }
};

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
            p.chapter_id === chapter.id
        );

        // Get completed lessons from JSON array
        const completedLessons = chapterProgress?.completed_lessons
            ? JSON.parse(chapterProgress.completed_lessons)
            : [];

        const completedLessonsCount = completedLessons.length;
        const allLessonsCompleted = completedLessonsCount >= chapter.lessons.length;

        // ✅ PROPER LOCK LOGIC:
        let locked = true;
        if (index === 0) {
            locked = false; // First chapter always unlocked
        } else {
            const previousChapter = chapters[index - 1];
            const previousChapterProgress = userProgress.find(p =>
                p.chapter_id === previousChapter.id
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
                completed_lessons: completedLessonsCount,
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
                completed: completedLessons.includes(lesson.id), // Check if lesson is in completed_lessons array
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

export const debugUserProgress = async (req: Request, res: Response) => {
    try {
        const { courseId } = req.params;
        const { user_id } = req.query;

        console.log(`🔍 [DEBUG] Checking progress for user ${user_id}, course ${courseId}`);

        const allProgress = await UserProgress.findAll({
            where: {
                user_id,
                course_id: courseId
            }
        });

        console.log(`🔍 [DEBUG] Found ${allProgress.length} progress records:`);
        allProgress.forEach(record => {
            console.log(`  - ID: ${record.id}, Chapter: ${record.chapter_id}, Lesson: ${record.lesson_id}, Completed Lessons: ${record.completed_lessons}`);
        });

        return res.status(200).sendSuccess(res, {
            total_records: allProgress.length,
            records: allProgress.map(r => ({
                id: r.id,
                chapter_id: r.chapter_id,
                lesson_id: r.lesson_id,
                completed_lessons: r.completed_lessons,
                lesson_completed: r.lesson_completed,
                completed: r.completed,
                mcq_passed: r.mcq_passed,
                locked: r.locked
            }))
        });

    } catch (err) {
        console.error("[debugUserProgress] Error:", err);
        return res.status(500).sendError(res, "ERR_INTERNAL_SERVER_ERROR");
    }
};