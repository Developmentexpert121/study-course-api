import { Request, Response } from "express";
import Ratings from "../../models/rating.model";
import User from "../../models/user.model";
import Course   from "../../models/course.model";



export const createRating = async (req: Request, res: Response) => {
  const { user_id, course_id, score, review } = req.body;

  if (!user_id || !course_id || !score) {
    return res.sendError(res, "MISSING_REQUIRED_FIELDS");
  }

  try {
    const existingRating = await Ratings.findOne({
      where: { user_id, course_id }
    });

    if (existingRating) {
      return res.sendError(res, "RATING_ALREADY_EXISTS");
    }

    const rating = await Ratings.create({ user_id, course_id, score, review });
    return res.sendSuccess(res, rating);
  } catch (err) {
    console.error("[createRating] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};


export const deleteRating = async (req: Request, res: Response) => {
  const ratingId = req.params.id;
  const userId = req.user?.id; 

  console.log(ratingId,userId,"==============================")

  if (!ratingId || !userId) {
    return res.sendError(res, "MISSING_REQUIRED_FIELDS");
  }

  try {
    const rating = await Ratings.findOne({ where: { id: ratingId } });

    if (!rating) {
      return res.sendError(res, "RATING_NOT_FOUND");
    }

    if (rating.user_id !== userId) {
      return res.sendError(res, "UNAUTHORIZED");
    }

    await rating.destroy();
    return res.sendSuccess(res, { message: "Rating deleted successfully." });
  } catch (err) {
    console.error("[deleteRating] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};


export const getAllRatings = async (req: Request, res: Response) => {
  try {
    const ratings = await Ratings.findAll({
      order: [['createdAt', 'DESC']]
    });

    // Get all user IDs and course IDs from ratings
    const userIds = [...new Set(ratings.map(rating => rating.user_id))];
    const courseIds = [...new Set(ratings.map(rating => rating.course_id))];

    // Fetch users separately
    const users = await User.findAll({
      where: {
        id: userIds
      },
      attributes: ['id', 'username', 'email', 'profileImage']
    });

    // Fetch courses separately
    const courses = await Course.findAll({
      where: {
        id: courseIds
      },
      attributes: ['id', 'title'] // Only fetch the fields you need
    });

    // Create a user map for easy lookup
    const userMap = new Map();
    users.forEach(user => {
      userMap.set(user.id, user);
    });

    // Create a course map for easy lookup
    const courseMap = new Map();
    courses.forEach(course => {
      courseMap.set(course.id, course);
    });

    // Combine ratings with user and course data
    const ratingsWithUsersAndCourses = ratings.map(rating => {
      const ratingData = rating.toJSON();
      return {
        ...ratingData,
        user: userMap.get(rating.user_id) || null,
        course: {
          id: rating.course_id,
          title: courseMap.get(rating.course_id)?.title || null
        }
      };
    });

    return res.status(200).json({
      success: true,
      data: ratingsWithUsersAndCourses,
      message: 'Ratings fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching ratings:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const hideRatingBySuperAdmin = async (req, res) => {
  try {
    const { ratingId } = req.params;

    // Validate rating ID
    if (!ratingId) {
      return res.status(400).json({
        success: false,
        message: 'Rating ID is required'
      });
    }

    // Find the rating
    const rating = await Ratings.findByPk(ratingId);

    if (!rating) {
      return res.status(404).json({
        success: false,
        message: 'Rating not found'
      });
    }

    // Update status to hidebysuperadmin
    await rating.update({
      status: 'hidebysuperadmin'
    });

    return res.status(200).json({
      success: true,
      message: 'Rating hidden by super admin successfully',
      data: {
        id: rating.id,
        status: rating.status,
        updatedAt: rating.updatedAt
      }
    });

  } catch (error) {
    console.error('Error hiding rating by super admin:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};



export const unhideRatingBySuperAdmin = async (req, res) => {
  try {
    const { ratingId } = req.params;

    // Validate rating ID
    if (!ratingId) {
      return res.status(400).json({
        success: false,
        message: 'Rating ID is required'
      });
    }

    // Find the rating
    const rating = await Ratings.findByPk(ratingId);

    if (!rating) {
      return res.status(404).json({
        success: false,
        message: 'Rating not found'
      });
    }

    // Update status to hidebysuperadmin
    await rating.update({
      status: 'showtoeveryone'
    });

    return res.status(200).json({
      success: true,
      message: 'Rating hidden by super admin successfully',
      data: {
        id: rating.id,
        status: rating.status,
        updatedAt: rating.updatedAt
      }
    });

  } catch (error) {
    console.error('Error hiding rating by super admin:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};



export const softDeleteRating = async (req, res) => {
  try {
    const { ratingId } = req.params;

    if (!ratingId) {
      return res.status(400).json({
        success: false,
        message: 'Rating ID is required'
      });
    }

    const rating = await Ratings.findByPk(ratingId);

    if (!rating) {
      return res.status(404).json({
        success: false,
        message: 'Rating not found'
      });
    }

    // Soft delete by setting isactive to false
    await rating.update({
      isactive: false
    });

    return res.status(200).json({
      success: true,
      message: 'Rating deleted successfully',
      data: {
        id: rating.id,
        isactive: rating.isactive,
        updatedAt: rating.updatedAt
      }
    });

  } catch (error) {
    console.error('Error soft deleting rating:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};


export const addRating = async (req, res) => {
  try {
    const { ratingId } = req.params;

    if (!ratingId) {
      return res.status(400).json({
        success: false,
        message: 'Rating ID is required'
      });
    }

    const rating = await Ratings.findByPk(ratingId);

    if (!rating) {
      return res.status(404).json({
        success: false,
        message: 'Rating not found'
      });
    }

    // Soft delete by setting isactive to false
    await rating.update({
      isactive: true
    });

    return res.status(200).json({
      success: true,
      message: 'Rating deleted successfully',
      data: {
        id: rating.id,
        isactive: rating.isactive,
        updatedAt: rating.updatedAt
      }
    });

  } catch (error) {
    console.error('Error soft deleting rating:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};






export const hideRatingByAdmin = async (req, res) => {
  try {
    const { ratingId } = req.params;

    // Validate rating ID
    if (!ratingId) {
      return res.status(400).json({
        success: false,
        message: 'Rating ID is required'
      });
    }

    // Find the rating
    const rating = await Ratings.findByPk(ratingId);

    if (!rating) {
      return res.status(404).json({
        success: false,
        message: 'Rating not found'
      });
    }

    // Update status to hidebysuperadmin
    await rating.update({
      status: 'hidebyadmin'
    });

    return res.status(200).json({
      success: true,
      message: 'Rating hidden by super admin successfully',
      data: {
        id: rating.id,
        status: rating.status,
        updatedAt: rating.updatedAt
      }
    });

  } catch (error) {
    console.error('Error hiding rating by super admin:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};



export const unhideRatingByAdmin = async (req, res) => {
  try {
    const { ratingId } = req.params;

    // Validate rating ID
    if (!ratingId) {
      return res.status(400).json({
        success: false,
        message: 'Rating ID is required'
      });
    }

    // Find the rating
    const rating = await Ratings.findByPk(ratingId);

    if (!rating) {
      return res.status(404).json({
        success: false,
        message: 'Rating not found'
      });
    }

    // Update status to hidebysuperadmin
    await rating.update({
      status: 'showtoeveryone'
    });

    return res.status(200).json({
      success: true,
      message: 'Rating hidden by super admin successfully',
      data: {
        id: rating.id,
        status: rating.status,
        updatedAt: rating.updatedAt
      }
    });

  } catch (error) {
    console.error('Error hiding rating by super admin:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};