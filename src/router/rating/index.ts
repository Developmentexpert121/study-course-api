// router/rating.js
import { addRating, createRating, deleteRating, editUserReview, getAllRatings, getCourseRatingsWithUserRating, getRatingByUserAndCourse, hideRatingByAdmin, hideRatingBySuperAdmin, softDeleteRating, unhideRatingByAdmin, unhideRatingBySuperAdmin } from '../../controllers/rating';
import express from 'express';


const router = express.Router();

// GET all ratings
router.get('/', getAllRatings);

// GET rating by user and course
router.get('/course/:course_id', getRatingByUserAndCourse);

// GET course ratings with statistics and user rating
router.get('/course/:course_id/details', getCourseRatingsWithUserRating);

// POST create rating
router.post('/', createRating);

// PATCH update rating
router.patch('/:id', editUserReview);

// DELETE rating
router.delete('delete/:id', deleteRating);

// Admin routes
router.patch('/:ratingId/hide-by-superadmin', hideRatingBySuperAdmin);
router.patch('/:ratingId/unhide-by-superadmin', unhideRatingBySuperAdmin);
router.patch('/:ratingId/soft-delete', softDeleteRating);
router.patch('/:ratingId/add', addRating);
router.patch('/:ratingId/hide-by-admin', hideRatingByAdmin);
router.patch('/:ratingId/unhide-by-admin', unhideRatingByAdmin);

export default router; // Change to default export