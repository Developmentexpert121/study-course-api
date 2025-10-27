// routes/progress.routes.ts
import {
    getChapterStatus,
    getUserCourseProgress,
    initializeCourseProgress,
    markLessonAsCompleted,
    submitMCQAnswers
} from '../../controllers/progress/progress.controller';
import express from 'express';

const router = express.Router();

router.post('/initialize', initializeCourseProgress);
// Use consistent approach - all data in request body
router.post('/mark-lesson-complete', markLessonAsCompleted);
router.post('/submit-mcq', submitMCQAnswers);
router.get('/:courseId/progress', getUserCourseProgress);
router.get('/:courseId/chapters/:chapterId/status', getChapterStatus);

export default router;