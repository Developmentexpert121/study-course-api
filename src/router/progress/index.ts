// routes/progress.routes.ts
import {
    debugUserProgress,
    getChapterStatus,
    getUserCourseProgress,
    markLessonAsCompleted,
    submitMCQAnswers
} from '../../controllers/progress';
import express from 'express';

const router = express.Router();

// Essential APIs for course learning flow
router.post('/:courseId/complete-lesson', markLessonAsCompleted);
router.post('/:courseId/submit-mcq', submitMCQAnswers);
router.get('/:courseId/progress', getUserCourseProgress); // ✅ NEED THIS!
router.get('/:courseId/chapters/:chapterId/status', getChapterStatus); // ✅ NEED THIS!
router.get('/:courseId/debug-progress', debugUserProgress);

export default router;