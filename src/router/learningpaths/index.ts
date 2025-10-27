// routes/learningPathRoutes.ts
import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import {
    createLearningPath,
    getLearningPaths,
    getLearningPathById,
    updateLearningPath,
    deleteLearningPath,
    getRecommendedPaths
} from '../../controllers/learningPathController';

const router = Router();

// Public routes
router.get('/', getLearningPaths);
router.get('/:id', getLearningPathById);

// Protected routes
router.post('/', authenticate, createLearningPath);
router.put('/:id', authenticate, updateLearningPath);
router.delete('/:id', authenticate, deleteLearningPath);
router.get('/user/recommended', authenticate, getRecommendedPaths);

export default router;