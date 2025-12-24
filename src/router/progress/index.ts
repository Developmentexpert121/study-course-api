// routes/progress.routes.ts
import {
    debugUserProgress,
    getChapterStatus,
    getUserCourseProgress,
    markLessonAsCompleted,
    submitMCQAnswers,
    markChapterComplete
} from '../../controllers/progress';
import express from 'express';

const router = express.Router();

// Essential APIs for course learning flow
router.post('/:courseId/complete-lesson', markLessonAsCompleted);
router.post('/:courseId/submit-mcq', submitMCQAnswers);
router.get('/:courseId/progress', getUserCourseProgress); // ✅ NEED THIS!
router.get('/:courseId/chapters/:chapterId/status', getChapterStatus); // ✅ NEED THIS!
router.get('/:courseId/debug-progress', debugUserProgress);

router.post('/chaspter/completed',markChapterComplete)

export default router;