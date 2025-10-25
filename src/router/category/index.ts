import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { createCategory, deleteCategory, getCategories, getCategoryById, updateCategory } from '../../controllers/categorys/categoryController';

const router = Router();

router.post('/', authenticate, createCategory);
router.get('/', authenticate, getCategories);
router.get('/:id', authenticate, getCategoryById);
router.put('/:id', authenticate, updateCategory);
router.delete('/:id', authenticate, deleteCategory);

export default router;