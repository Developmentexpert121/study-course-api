// routes/progress.routes.ts
import {
    getChapterStatus,
    getUserCourseProgress,
    markLessonAsCompleted,
    submitMCQAnswers
} from '../../controllers/progress/progress.controller';
import express from 'express';

const router = express.Router();

// Essential APIs for course learning flow
router.post('/:courseId/complete-lesson', markLessonAsCompleted);
router.post('/:courseId/submit-mcq', submitMCQAnswers);
router.get('/:courseId/progress', getUserCourseProgress); // ✅ NEED THIS!
router.get('/:courseId/chapters/:chapterId/status', getChapterStatus); // ✅ NEED THIS!

export default router;