import { authenticate, authorizeAdmin } from '../../middleware/auth';
import { addComment, deleteComment, getCommentsByCourse, updateComment } from '../../controllers/comments';
import express from 'express';
// import {
//   addComment,
//   getCommentsByCourse,
//   updateComment,
//   deleteComment,
// } from '../controllers/commentController.js';

const router = express.Router();

router.post("/:courseId", authenticate, addComment);
router.get('/:courseId', authenticate, authorizeAdmin, getCommentsByCourse); 
router.put('/:commentId',updateComment);
router.delete('/:commentId',  deleteComment);

export default router;