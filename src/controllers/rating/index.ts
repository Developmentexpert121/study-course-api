import { Request, Response } from "express";
import Ratings from "../../models/rating.model";
import User from "../../models/user.model";
import Course from "../../models/course.model";
import { Op, Sequelize } from "sequelize";

export const createRating = async (req: Request, res: Response) => {
  try {
    const { user_id, course_id, score, review } = req.body;

    if (!user_id || !course_id || !score) {
      return res.status(400).json({
        success: false,
        message: 'user_id, course_id, and score are required fields',
      });
    }

    if (score < 1 || score > 5) {
      return res.status(400).json({
        success: false,
        message: 'Score must be between 1 and 5',
      });
    }

    const existingRating = await Ratings.findOne({
      where: { user_id, course_id },
    });

    if (existingRating) {
      return res.status(409).json({
        success: false,
        message: 'You have already rated this course. Use update instead.',
      });
    }

    const newRating = await Ratings.create({
      user_id,
      course_id,
      score,
      review: review || null,
      status: 'showtoeveryone',
      review_visibility: 'visible', // ADDED: default review visibility
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
export const getPublicRatings = async (req: Request, res: Response) => {
  try {
    const {
      limit = '20',
      page = '1',
      course_id,
      min_rating = '3', // Changed to 3 as default for home page
      sort_by = 'highest' // Default to highest rating first
    } = req.query;

    const pageNumber = parseInt(page as string);
    const limitNumber = parseInt(limit as string);
    const minRating = parseInt(min_rating as string);
    const offset = (pageNumber - 1) * limitNumber;

    // Build where condition - only show ratings 3 and above for home page
    let whereCondition: any = {
      status: 'showtoeveryone',
      isactive: true,
      review_visibility: 'visible',
      score: { [Op.gte]: 3 } // Only show ratings 3 stars and above
    };

    // Filter by course if provided
    if (course_id) {
      whereCondition.course_id = course_id;
    }

    // Override min rating if specifically provided in query
    if (min_rating && minRating !== 3) {
      whereCondition.score = { [Op.gte]: minRating };
    }

    // Build order condition
    let orderCondition: any[] = [];
    switch (sort_by) {
      case 'recent':
        orderCondition = [['createdAt', 'DESC']];
        break;
      case 'highest':
        orderCondition = [['score', 'DESC'], ['createdAt', 'DESC']]; // Highest rating first, then most recent
        break;
      case 'lowest':
        orderCondition = [['score', 'ASC'], ['createdAt', 'DESC']];
        break;
      default:
        orderCondition = [['score', 'DESC'], ['createdAt', 'DESC']]; // Default to highest first
    }

    // First get all ratings with course info - FIXED ALIAS
    const { count, rows: ratings } = await Ratings.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: User,
          as: 'rating_user', // The user who wrote the rating
          attributes: ['id', 'username', 'profileImage']
        },
        {
          model: Course,
          as: 'rating_course', // Changed from 'course' to 'rating_course'
          attributes: ['id', 'title', 'image', 'description', 'price', 'creator'] // Removed username, added creator_id
        }
      ],
      order: orderCondition,
      limit: limitNumber,
      offset: offset
    });

    // Get all creator IDs from the courses
    const creatorIds = [...new Set(ratings.map(rating => rating.rating_course.creator).filter(Boolean))];

    // Fetch all creators in one query
    const creators = await User.findAll({
      where: {
        id: creatorIds
      },
      attributes: ['id', 'username', 'profileImage'],
      raw: true
    });

    // Create a map for quick creator lookup
    const creatorMap = creators.reduce((map, creator) => {
      map[creator.id] = creator;
      return map;
    }, {} as any);

    // Process ratings for public display - UPDATED REFERENCES
    const processedRatings = ratings.map(rating => {
      const ratingData = rating.toJSON();
      const course = ratingData.rating_course; // Updated reference
      const creator = creatorMap[course.creator];

      return {
        id: ratingData.id,
        score: ratingData.score,
        review: ratingData.review,
        createdAt: ratingData.createdAt,
        user: {
          id: ratingData.rating_user.id, // Updated reference
          username: ratingData.rating_user.username, // Updated reference
          profileImage: ratingData.rating_user.profileImage, // Updated reference
        },
        course: {
          id: course.id,
          title: course.title,
          image: course.image,
          description: course.description,
          price: course.price,
          creator: creator ? {
            id: creator.id,
            username: creator.username,
            profileImage: creator.profileImage
          } : null
        }
      };
    });

    // Get overall statistics (for ratings 3+ only)
    const totalRatingsCount = await Ratings.count({
      where: {
        status: 'showtoeveryone',
        isactive: true,
        score: { [Op.gte]: 3 } // Only count ratings 3+
      }
    });

    const totalReviewsCount = await Ratings.count({
      where: {
        status: 'showtoeveryone',
        isactive: true,
        review: { [Op.ne]: null },
        review_visibility: 'visible',
        score: { [Op.gte]: 3 } // Only count reviews 3+
      }
    });

    const averageRatingResult = await Ratings.findOne({
      where: {
        status: 'showtoeveryone',
        isactive: true,
        score: { [Op.gte]: 3 } // Only average ratings 3+
      },
      attributes: [
        [Sequelize.fn('AVG', Sequelize.col('score')), 'average']
      ],
      raw: true
    });

    const averageRating = parseFloat(averageRatingResult?.average || 0).toFixed(1);

    // Rating distribution (for ratings 3+ only)
    const ratingDistribution = await Ratings.findAll({
      where: {
        status: 'showtoeveryone',
        isactive: true,
        score: { [Op.gte]: 3 } // Only distribution for ratings 3+
      },
      attributes: [
        'score',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      group: ['score'],
      raw: true
    });

    const distribution = { 3: 0, 4: 0, 5: 0 }; // Only 3,4,5 stars for home page
    ratingDistribution.forEach(item => {
      if (item.score >= 3) {
        distribution[item.score as keyof typeof distribution] = parseInt(item.count as string);
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        ratings: processedRatings,
        pagination: {
          current_page: pageNumber,
          total_pages: Math.ceil(count / limitNumber),
          total_items: count,
          items_per_page: limitNumber,
          has_next: pageNumber < Math.ceil(count / limitNumber),
          has_prev: pageNumber > 1
        },
        statistics: {
          total_ratings: totalRatingsCount,
          total_reviews: totalReviewsCount,
          average_rating: averageRating,
          rating_distribution: distribution,
          filter_note: "Showing only ratings 3 stars and above" // Added note for clarity
        }
      },
      message: 'Public ratings fetched successfully'
    });

  } catch (error: any) {
    console.error('Error fetching public ratings:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};
export const getAllRatings = async (req: Request, res: Response) => {
  try {
    const { role } = req.user;

    let whereCondition: any = {};

    // Role-based filtering
    if (role === 'user') {
      whereCondition = {
        isactive: true,
        status: 'showtoeveryone'
      };
    }

    const ratings = await Ratings.findAll({
      where: whereCondition,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'rating_user', // Use the correct alias defined in your association
          attributes: ['id', 'username', 'email', 'profileImage']
        },
        {
          model: Course,
          as: 'rating_course',
          attributes: ['id', 'title']
        }
      ]
    });

    // Process ratings to handle review visibility
    const processedRatings = processRatingsForVisibility(ratings, role);

    return res.status(200).json({
      success: true,
      data: processedRatings,
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

export const getRatingByUserAndCourse = async (req: Request, res: Response) => {
  try {
    const { course_id } = req.params;
    const { user_id } = req.query;
    const { role } = req.user;

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

    let whereCondition: any = {
      user_id: user_id,
      course_id: course_id
    };

    // Users can only see their own active ratings
    if (role === 'user') {
      whereCondition.isactive = true;
    }

    const rating = await Ratings.findOne({
      where: whereCondition,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'profileImage']
        },
        {
          model: Course,
          as: 'course',
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

    // Process rating for review visibility
    const processedRating = processSingleRatingForVisibility(rating, role);

    return res.status(200).json({
      success: true,
      message: 'Rating fetched successfully',
      data: processedRating
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

// export const getRatingsByCourse = async (req: Request, res: Response) => {
//   try {
//     const { courseId } = req.params;
//     const { role } = req.user;

//     if (!courseId) {
//       return res.status(400).json({
//         success: false,
//         message: 'Course ID is required',
//       });
//     }

//     let whereCondition: any = {
//       course_id: courseId
//     };

//     // Role-based filtering - only show visible ratings to regular users
//     if (role === 'user') {
//       whereCondition.status = 'showtoeveryone';
//       whereCondition.isactive = true;
//     }

//     const ratings = await Ratings.findAll({
//       where: whereCondition,
//       include: [
//         {
//           model: User,
//           as: 'user',
//           attributes: ['id', 'username', 'email', 'profileImage']
//         },
//         {
//           model: Course,
//           as: 'course',
//           attributes: ['id', 'title']
//         }
//       ],
//       order: [['createdAt', 'DESC']]
//     });

//     // Process ratings for review visibility
//     const processedRatings = processRatingsForVisibility(ratings, role);

//     // Calculate statistics
//     const totalRatings = ratings.length;
//     const averageRating = totalRatings > 0
//       ? ratings.reduce((sum, rating) => sum + rating.score, 0) / totalRatings
//       : 0;
//     const visibleRatings = ratings.filter(r => r.status === 'showtoeveryone').length;
//     const hiddenRatings = ratings.filter(r => r.status !== 'showtoeveryone').length;
//     const hiddenReviews = ratings.filter(r => r.review_visibility !== 'visible').length;

//     return res.status(200).json({
//       success: true,
//       data: {
//         ratings: processedRatings,
//         statistics: {
//           total_ratings: totalRatings,
//           average_rating: parseFloat(averageRating.toFixed(1)),
//           visible_ratings: visibleRatings,
//           hidden_ratings: hiddenRatings,
//           hidden_reviews: hiddenReviews // ADDED: hidden reviews count
//         }
//       },
//       message: 'Course ratings fetched successfully'
//     });

//   } catch (error: any) {
//     console.error('Error fetching course ratings:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Internal server error',
//       error: error.message,
//     });
//   }
// };

export const getCourseRatingsWithUserRating = async (req: Request, res: Response) => {
  try {
    const { course_id } = req.params;
    const { user_id } = req.query;
    const { role } = req.user;

    if (!course_id) {
      return res.status(400).json({
        success: false,
        message: 'Course ID is required',
      });
    }

    let whereCondition: any = { course_id };

    // Role-based filtering for all ratings
    if (role === 'user') {
      whereCondition.status = 'showtoeveryone';
      whereCondition.isactive = true;
    }

    // Get all ratings for the course - FIXED ALIAS
    const allRatings = await Ratings.findAll({
      where: whereCondition,
      include: [
        {
          model: User,
          as: 'rating_user', // Changed from 'user' to 'rating_user'
          attributes: ['id', 'username', 'email', 'profileImage']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Process ratings for review visibility
    const processedRatings = processRatingsForVisibility(allRatings, role);

    // Get user's specific rating if user_id is provided
    let userRating = null;
    if (user_id) {
      let userWhereCondition: any = {
        user_id: user_id as string,
        course_id: course_id as string
      };

      // Users can only see their own active ratings
      if (role === 'user') {
        userWhereCondition.isactive = true;
      }

      userRating = await Ratings.findOne({
        where: userWhereCondition,
        include: [
          {
            model: User,
            as: 'rating_user', // Changed from 'user' to 'rating_user'
            attributes: ['id', 'username', 'email', 'profileImage']
          }
        ]
      });

      // Process user rating for visibility
      if (userRating) {
        userRating = processSingleRatingForVisibility(userRating, role);
      }
    }

    // ... rest of your code remains the same
    // Filter active ratings for statistics (only count active ones)
    const activeRatings = allRatings.filter(rating => rating.isactive);

    // Calculate statistics based on active ratings only
    const totalRatings = activeRatings.length;
    const averageRating = totalRatings > 0
      ? activeRatings.reduce((sum, rating) => sum + rating.score, 0) / totalRatings
      : 0;

    // Calculate rating distribution
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    activeRatings.forEach(rating => {
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
        all_ratings: processedRatings,
        total_all_ratings: allRatings.length
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

// UPDATED: Both Admin and Superadmin can hide ratings
export const hideRating = async (req: Request, res: Response) => {
  try {
    const { ratingId } = req.params;
    const { role } = req.user;

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

    let status = '';
    let message = '';

    if (role === 'admin') {
      status = 'hidebyadmin';
      message = 'Rating hidden by admin successfully';
    } else if (role === 'superadmin' || role === "Super-Admin" || role === "super-admin") {
      status = 'hidebysuperadmin';
      message = 'Rating hidden by superadmin successfully';
    } else {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to hide ratings'
      });
    }

    await rating.update({ status });

    return res.status(200).json({
      success: true,
      message,
      data: {
        id: rating.id,
        status: rating.status,
        updatedAt: rating.updatedAt
      }
    });

  } catch (error: any) {
    console.error('Error hiding rating:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// UPDATED: Both Admin and Superadmin can unhide ratings
export const unhideRating = async (req: Request, res: Response) => {
  try {
    const { ratingId } = req.params;
    const { role } = req.user;

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

    await rating.update({ status: 'showtoeveryone' });

    return res.status(200).json({
      success: true,
      message: 'Rating unhidden successfully',
      data: {
        id: rating.id,
        status: rating.status,
        updatedAt: rating.updatedAt
      }
    });

  } catch (error: any) {
    console.error('Error unhiding rating:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// NEW: Hide only the review (keep rating visible)
export const hideReview = async (req: Request, res: Response) => {
  try {
    const { ratingId } = req.params;
    const { role } = req.user;

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

    let reviewVisibility = '';
    let message = '';

    if (role === 'admin') {
      reviewVisibility = 'hidden_by_admin';
      message = 'Review hidden by admin successfully';
    } else if (role === 'superadmin' || role === "Super-Admin" || role === "super-admin") {
      reviewVisibility = 'hidden_by_superadmin';
      message = 'Review hidden by superadmin successfully';
    } else {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to hide reviews'
      });
    }

    // Only hide the review, keep rating and status as is
    await rating.update({ review_visibility: reviewVisibility });

    return res.status(200).json({
      success: true,
      message,
      data: {
        id: rating.id,
        review_visibility: rating.review_visibility,
        score: rating.score, // Rating remains visible
        status: rating.status, // Overall rating status remains same
        updatedAt: rating.updatedAt
      }
    });

  } catch (error: any) {
    console.error('Error hiding review:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// NEW: Unhide the review
export const unhideReview = async (req: Request, res: Response) => {
  try {
    const { ratingId } = req.params;
    const { role } = req.user;

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

    // Check permissions - admin can't unhide reviews hidden by superadmin
    if (role === 'admin' && rating.review_visibility === 'hidden_by_superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Admin cannot unhide reviews hidden by superadmin'
      });
    }

    // Make review visible again
    await rating.update({ review_visibility: 'visible' });

    return res.status(200).json({
      success: true,
      message: 'Review shown successfully',
      data: {
        id: rating.id,
        review_visibility: rating.review_visibility,
        updatedAt: rating.updatedAt
      }
    });

  } catch (error: any) {
    console.error('Error unhiding review:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

export const activereview = async (req: Request, res: Response) => {
  try {
    const { ratingId } = req.params;
   
    // Find the rating
    const rating = await Ratings.findByPk(ratingId);

    if (!rating) {
      return res.status(404).json({ 
        error: 'Rating not found' 
      });
    }

    // Set review visibility to visible (activate)
    const review_visibility = 'visible';

    // Update the rating
    await rating.update({ review_visibility });

    return res.status(200).json({
      message: 'Review activated successfully',
      data: {
        ratingId: rating.id,
        review_visibility: rating.review_visibility,
      },
    });
  } catch (error) {
    console.error('Error activating review:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};




export const updateReviewVisibility = async (req: Request, res: Response) => {
  try {
    const { ratingId } = req.params;
    const { role } = req.body;

    // Validate role
    if (!role) {
      return res.status(400).json({ 
        error: 'Role is required' 
      });
    }

    // Determine visibility based on role
    let review_visibility: string;

    switch (role.toLowerCase()) {
      case 'super-admin':
      case 'superadmin':
        review_visibility = 'hidden_by_superadmin';
        break;
      case 'admin':
        review_visibility = 'hidden_by_admin';
        break;
      default:
        review_visibility = 'visible';
        break;
    }

    // Find and update the rating
    const rating = await Ratings.findByPk(ratingId);

    if (!rating) {
      return res.status(404).json({ 
        error: 'Rating not found' 
      });
    }

    await rating.update({ review_visibility });

    return res.status(200).json({
      message: 'Review visibility updated successfully',
      data: {
        ratingId: rating.id,
        review_visibility: rating.review_visibility,
        updatedBy: role,
      },
    });
  } catch (error) {
    console.error('Error updating review visibility:', error);
    return res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
};



// UPDATED: Both Admin and Superadmin can delete any rating
export const deleteRating = async (req: Request, res: Response) => {
  try {
    const { ratingId } = req.params;
    const { role } = req.user;

    if (!ratingId) {
      return res.status(400).json({
        success: false,
        message: 'Rating ID is required'
      });
    }

    if (role !== 'admin' && role !== "Super-Admin") {
      return res.status(403).json({
        success: false,
        message: 'Only admin and superadmin can delete ratings'
      });
    }

    const rating = await Ratings.findByPk(ratingId);
    if (!rating) {
      return res.status(404).json({
        success: false,
        message: 'Rating not found'
      });
    }

    await rating.destroy();

    return res.status(200).json({
      success: true,
      message: 'Rating permanently deleted successfully'
    });

  } catch (error: any) {
    console.error('Error deleting rating:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};




// User can edit their own rating
export const editUserReview = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { score, review } = req.body;
    const userId = req.user.id;

    if (score === undefined && review === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least score or review to update',
      });
    }

    const rating = await Ratings.findByPk(id);
    if (!rating) {
      return res.status(404).json({
        success: false,
        message: 'Rating not found',
      });
    }

    if (rating.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own ratings'
      });
    }

    const updateData: any = {};
    if (score !== undefined) updateData.score = score;
    if (review !== undefined) {
      updateData.review = review.trim();
      // When user edits their review, make it visible again
      updateData.review_visibility = 'visible';
    }

    await rating.update(updateData);

    return res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      data: rating
    });
  } catch (error: any) {
    console.error('Error editing review:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

export const getRatingsByCourseId = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const { role } = req.user;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: 'Course ID is required',
      });
    }

    let whereCondition: any = { course_id: courseId };

    if (role === 'user') {
      whereCondition.status = 'showtoeveryone';
      whereCondition.isactive = true;
    }

    const ratings = await Ratings.findAll({
      where: whereCondition,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'profileImage']
        },
        {
          model: Course,
          as: 'course',
          attributes: ['id', 'title']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Process ratings for review visibility
    const processedRatings = processRatingsForVisibility(ratings, role);

    return res.status(200).json({
      success: true,
      data: processedRatings,
      message: 'Course ratings fetched successfully'
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

// HELPER FUNCTIONS
const processRatingsForVisibility = (ratings: any[], role: string) => {
  return ratings.map(rating => processSingleRatingForVisibility(rating, role));
};

const processSingleRatingForVisibility = (rating: any, role: string) => {
  const ratingData = rating.toJSON ? rating.toJSON() : rating;

  // If review is hidden and user is not admin/superadmin, hide the review
  if (ratingData.review_visibility !== 'visible' && role === 'user') {
    return {
      ...ratingData,
      review: null,
      review_hidden: true,
      review_hidden_reason: 'This review has been hidden by administration'
    };
  } else if (ratingData.review_visibility !== 'visible') {
    // For admins/superadmins, show that review is hidden but keep the actual review
    return {
      ...ratingData,
      review_hidden: true,
      review_hidden_by: ratingData.review_visibility === 'hidden_by_admin' ? 'admin' : 'superadmin',
      // Still include the actual review for admins to see
      original_review: ratingData.review
    };
  }

  return ratingData;
};


export const deleteRatinguser = async (req: Request, res: Response) => {
  try {
    const { rating_id } = req.params;

    // Validate rating_id
    if (!rating_id) {
      return res.status(400).sendError(res, "Rating ID is required");
    }

    // Convert to integer and validate
    const ratingId = parseInt(rating_id as string);
    if (isNaN(ratingId)) {
      return res.status(400).sendError(res, "Rating ID must be a valid number");
    }

    // Find the rating
    const rating = await Ratings.findByPk(ratingId);

    if (!rating) {
      return res.status(404).sendError(res, "Rating not found");
    }

    // Delete the rating
    await rating.destroy();

    return res.status(200).sendSuccess(res, {
      message: "Rating deleted successfully",
      deleted_rating_id: ratingId
    });

  } catch (err) {
    console.error("[deleteRating] Error:", err);
    return res.status(500).sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};



// export const getRatingsBy_CourseId = async (req: Request, res: Response) => {
//   try {
//     const { courseId } = req.params;
//     const { sort = 'recent', limit = 10, offset = 0 } = req.query;

//     const ratings = await Ratings.findAndCountAll({
//       where: {
//         course_id: courseId,
//         isactive: true,
//         review_visibility: 'visible',
//         status: 'showtoeveryone',
//       },
//       order: sort === 'recent' ? [['createdAt', 'DESC']] : [['score', 'DESC']],
//       limit: parseInt(limit as string),
//       offset: parseInt(offset as string),
//     });

//     res.status(200).json({
//       success: true,
//       data: ratings.rows,
//       pagination: {
//         total: ratings.count,
//         limit: parseInt(limit as string),
//         offset: parseInt(offset as string),
//       },
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, error: error.message });
//   }
// };



export const getRatingsBy_CourseId = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const { sort = 'recent', limit = 10, offset = 0 } = req.query;

    const ratings = await Ratings.findAndCountAll({
      where: {
        course_id: courseId,
        isactive: true,
        review_visibility: 'visible',
        status: 'showtoeveryone',
      },
      include: [
        {
          model: User,
          as: 'rating_user',
          attributes: ['id', 'username', 'email'],
          required: true,
        },
      ],
      order: sort === 'recent' ? [['createdAt', 'DESC']] : [['score', 'DESC']],
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      distinct: true,
    });

    res.status(200).json({
      success: true,
      data: ratings.rows,
      pagination: {
        total: ratings.count,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};