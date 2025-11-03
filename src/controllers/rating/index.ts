import { Request, Response } from "express";
import Ratings from "../../models/rating.model";
import User from "../../models/user.model";
import Course from "../../models/course.model";



export const createRating = async (req: Request, res: Response) => {
  try {
    const { user_id, course_id, score, review } = req.body;

    // Validation
    if (!user_id || !course_id || !score) {
      return res.status(400).json({
        success: false,
        message: 'user_id, course_id, and score are required fields',
      });
    }

    // Validate score range
    if (score < 1 || score > 5) {
      return res.status(400).json({
        success: false,
        message: 'Score must be between 1 and 5',
      });
    }

    // Check if user already rated this course
    const existingRating = await Ratings.findOne({
      where: { user_id, course_id },
    });

    if (existingRating) {
      return res.status(409).json({
        success: false,
        message: 'You have already rated this course. Use update instead.',
      });
    }

    // Create new rating
    const newRating = await Ratings.create({
      user_id,
      course_id,
      score,
      review: review || null,
      status: 'showtoeveryone',
      isactive: true,
    });

    return res.status(201).json({
      success: true,
      message: 'Rating created successfully',
      data: newRating,
    });
  } catch (error: any) {
    console.error('Error creating rating:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
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



export const deleteRating = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const rating = await Ratings.findByPk(id);

    if (!rating) {
      return res.status(404).json({
        success: false,
        message: 'Rating not found',
      });
    }

    await rating.destroy();

    return res.status(200).json({
      success: true,
      message: 'Rating deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting rating:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};


// Add this to your rating.controller.js
export const getRatingByUserAndCourse = async (req: Request, res: Response) => {
  try {
    const { course_id } = req.params;
    const { user_id } = req.query;

    // Validation
    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
    }

    if (!course_id) {
      return res.status(400).json({
        success: false,
        message: 'Course ID is required',
      });
    }

    // Find the rating
    const rating = await Ratings.findOne({
      where: {
        user_id: user_id,
        course_id: course_id,
        isactive: true
      },
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'email', 'profileImage']
        },
        {
          model: Course,
          attributes: ['id', 'title']
        }
      ]
    });

    if (!rating) {
      return res.status(200).json({
        success: true,
        message: 'No rating found for this user and course',
        data: null
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Rating fetched successfully',
      data: rating
    });

  } catch (error: any) {
    console.error('Error fetching rating:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};
export const editUserReview = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { score, review } = req.body;
    // const userId = req.user?.id; // Uncomment when using auth middleware

    // Validation: At least one field must be provided
    if (score === undefined && review === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least score or review to update',
      });
    }

    // Find the rating
    const rating = await Ratings.findByPk(id);

    if (!rating) {
      return res.status(404).json({
        success: false,
        message: 'Rating not found',
      });
    }


    if (score !== undefined) {
      if (typeof score !== 'number' || score < 1 || score > 5) {
        return res.status(400).json({
          success: false,
          message: 'Score must be a number between 1 and 5',
        });
      }
    }

    // Validate review if provided
    if (review !== undefined && typeof review !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Review must be a string',
      });
    }

    // Update only allowed fields (score and review)
    const updateData: any = {};
    if (score !== undefined) updateData.score = score;
    if (review !== undefined) updateData.review = review.trim();

    await rating.update(updateData);

    return res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      data: {
        id: rating.id,
        user_id: rating.user_id,
        course_id: rating.course_id,
        score: rating.score,
        review: rating.review,
        status: rating.status,
        isactive: rating.isactive,
        updatedAt: rating.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Error editing review:', error);

    // Handle foreign key constraint violations
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      if (error.message.includes('course_id_fkey')) {
        return res.status(404).json({
          success: false,
          message: 'Course not found. Please provide a valid course_id.',
        });
      }
      if (error.message.includes('user_id_fkey')) {
        return res.status(404).json({
          success: false,
          message: 'User not found. Please provide a valid user_id.',
        });
      }
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

export const getCourseRatingsWithUserRating = async (req: Request, res: Response) => {
  try {
    const { course_id } = req.params;
    const { user_id } = req.query;

    if (!course_id) {
      return res.status(400).json({
        success: false,
        message: 'Course ID is required',
      });
    }

    // Get all ratings for the course
    const allRatings = await Ratings.findAll({
      where: {
        course_id: course_id as string,
        isactive: true,
        status: 'showtoeveryone' // Only show ratings that are visible to everyone
      },
      include: [
        {
          model: User,
          as: 'user', // Add the alias here - check your model for the correct alias name
          attributes: ['id', 'username', 'email', 'profileImage']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Get user's specific rating if user_id is provided
    let userRating = null;
    if (user_id) {
      userRating = await Ratings.findOne({
        where: {
          user_id: user_id as string,
          course_id: course_id as string,
          isactive: true
        },
        include: [
          {
            model: User,
            as: 'user', // Add the alias here too
            attributes: ['id', 'username', 'email', 'profileImage']
          }
        ]
      });
    }

    // Calculate statistics
    const totalRatings = allRatings.length;
    const averageRating = totalRatings > 0
      ? allRatings.reduce((sum, rating) => sum + rating.score, 0) / totalRatings
      : 0;

    // Calculate rating distribution
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    allRatings.forEach(rating => {
      ratingDistribution[rating.score as keyof typeof ratingDistribution]++;
    });

    // Calculate percentage distribution
    const percentageDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    Object.keys(ratingDistribution).forEach(key => {
      const score = parseInt(key);
      percentageDistribution[score as keyof typeof percentageDistribution] =
        totalRatings > 0 ? (ratingDistribution[score as keyof typeof ratingDistribution] / totalRatings) * 100 : 0;
    });

    return res.status(200).json({
      success: true,
      message: 'Course ratings fetched successfully',
      data: {
        statistics: {
          average_rating: parseFloat(averageRating.toFixed(1)),
          total_ratings: totalRatings,
          rating_distribution: ratingDistribution,
          percentage_distribution: percentageDistribution
        },
        user_rating: userRating,
        has_rated: !!userRating,
        all_ratings: allRatings
      }
    });

  } catch (error: any) {
    console.error('Error fetching course ratings:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};