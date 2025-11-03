// helpers/courseCompletion.helper.ts
import UserProgress from '../models/userProgress.model';
import Chapter from '../models/chapter.model';

export const checkCourseCompletion = async (user_id: string, course_id: string) => {
    try {
        // Get all chapters for this course
        const chapters = await Chapter.findAll({
            where: { course_id },
            attributes: ['id']
        });

        // Get progress for all chapters
        const progressRecords = await UserProgress.findAll({
            where: {
                user_id,
                course_id,
                chapter_id: chapters.map(ch => ch.id)
            }
        });

        // Check if all chapters are completed (mcq_passed)
        const allChaptersCompleted = chapters.every(chapter => {
            const chapterProgress = progressRecords.find(p => p.chapter_id === chapter.id);
            return chapterProgress && chapterProgress.mcq_passed === true;
        });

        return {
            completed: allChaptersCompleted,
            totalChapters: chapters.length,
            completedChapters: progressRecords.filter(p => p.mcq_passed).length
        };
    } catch (error) {
        console.error('Error checking course completion:', error);
        return { completed: false, totalChapters: 0, completedChapters: 0 };
    }
};