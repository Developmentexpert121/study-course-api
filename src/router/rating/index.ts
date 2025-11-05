// router/rating.js
import express from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import {
    createRating,
    getAllRatings,
    getRatingByUserAndCourse,
    getCourseRatingsWithUserRating,
    editUserReview,
    hideRating,
    unhideRating,
    deleteUserRating,
    deleteRating,
    getRatingsByCourse, // ADD THIS IMPORT
    hideReview,
    unhideReview,
    getPublicRatings
} from '../../controllers/rating';

const router = express.Router();
router.get('/public/home-ratings', getPublicRatings);

// Apply authentication to ALL rating routes
router.use(authenticate);

// GET all ratings - Only admin and superadmin
router.get('/', authorize(['admin', 'Super-Admin']), getAllRatings);

// GET all ratings by course ID - For admin and superadmin
router.get('/course/:courseId', authorize(['admin', 'Super-Admin']), getRatingsByCourse);

// GET rating by user and course - All authenticated users
router.get('/course/:course_id/user', getRatingByUserAndCourse);

// GET course ratings with statistics and user rating - All authenticated users  
router.get('/course/:course_id/details', getCourseRatingsWithUserRating);

// POST create rating - All authenticated users
router.post('/', createRating);

// PATCH update rating - All authenticated users
router.patch('/:id', editUserReview);

// Hide rating - Only admin and superadmin
router.patch('/:ratingId/hide', authorize(['admin', 'Super-Admin']), hideRating);

// Unhide rating - Only admin and superadmin  
router.patch('/:ratingId/unhide', authorize(['admin', 'Super-Admin']), unhideRating);
router.patch('/:ratingId/hide-review', authorize(['admin', 'Super-Admin']), hideReview);
router.patch('/:ratingId/unhide-review', authorize(['admin', 'Super-Admin']), unhideReview);
// User deletes their own rating - All authenticated users
router.delete('/user/:ratingId', deleteUserRating);

// Admin/Superadmin delete any rating - Only admin and superadmin
router.delete('/:ratingId', authorize(['admin', 'Super-Admin']), deleteRating);

export default router;