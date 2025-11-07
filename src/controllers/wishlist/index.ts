// controllers/wishlist.controller.ts
import { Request, Response } from "express";
import Wishlist from "../../models/wishlist.model";
import Course from "../../models/course.model";
import User from "../../models/user.model";
import { Op } from "sequelize";
import Enrollment from "../../models/enrollment.model";


export const getUserWishlist = async (req: Request, res: Response) => {
    try {
        const { user_id } = req.params;
        const { page = 1, limit = 10 } = req.query;

        if (!user_id) {
            return res.status(400).json({
                success: false,
                message: "user_id is required"
            });
        }

        const pageNum = parseInt(String(page));
        const limitNum = parseInt(String(limit));
        const offset = (pageNum - 1) * limitNum;

        const { count, rows: wishlist } = await Wishlist.findAndCountAll({
            where: { user_id },
            limit: limitNum,
            offset,
            order: [['createdAt', 'DESC']],
            include: [
                {
                    model: Course,
                    as: 'wishlist_course', // ✅ Use the correct alias defined in your association
                    attributes: ['id', 'title', 'description', 'image', 'duration', 'price_type', 'category', 'creator', 'ratings']
                }
            ]
        });

        // Calculate enrollment count for each course
        const wishlistWithEnrollmentCount = await Promise.all(
            wishlist.map(async (item: any) => {
                const enrollmentCount = await Enrollment.count({
                    where: {
                        course_id: item.course_id // Use course_id from wishlist item
                    }
                });

                return {
                    id: item.id,
                    user_id: item.user_id,
                    course_id: item.course_id,
                    createdAt: item.createdAt,
                    updatedAt: item.updatedAt,
                    course: {
                        ...item.wishlist_course.toJSON(), // ✅ Use the correct alias
                        enrollment_count: enrollmentCount
                    }
                };
            })
        );

        return res.status(200).json({
            success: true,
            data: {
                wishlist: wishlistWithEnrollmentCount,
                total: count,
                page: pageNum,
                totalPages: Math.ceil(count / limitNum),
            }
        });

    } catch (err) {
        console.error("[getUserWishlist] Error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Other wishlist functions remain the same...
export const addToWishlist = async (req: Request, res: Response) => {
    try {
        const { user_id, course_id } = req.body;

        if (!user_id || !course_id) {
            return res.status(400).json({
                success: false,
                message: "user_id and course_id are required"
            });
        }

        // Check if user exists
        const user = await User.findByPk(user_id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Check if course exists
        const course = await Course.findByPk(course_id);
        if (!course) {
            return res.status(404).json({
                success: false,
                message: "Course not found"
            });
        }

        // Check if already in wishlist
        const existingWishlist = await Wishlist.findOne({
            where: { user_id, course_id }
        });

        if (existingWishlist) {
            return res.status(400).json({
                success: false,
                message: "Course already in wishlist"
            });
        }

        // Add to wishlist
        const wishlistItem = await Wishlist.create({
            user_id,
            course_id
        });

        return res.status(201).json({
            success: true,
            message: "Course added to wishlist successfully",
            data: {
                wishlist: wishlistItem
            }
        });

    } catch (err) {
        console.error("[addToWishlist] Error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

export const removeFromWishlist = async (req: Request, res: Response) => {
    try {
        const { user_id, course_id } = req.body;

        if (!user_id || !course_id) {
            return res.status(400).json({
                success: false,
                message: "user_id and course_id are required"
            });
        }

        // Remove from wishlist
        const deleted = await Wishlist.destroy({
            where: { user_id, course_id }
        });

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: "Course not found in wishlist"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Course removed from wishlist successfully"
        });

    } catch (err) {
        console.error("[removeFromWishlist] Error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

export const checkWishlistStatus = async (req: Request, res: Response) => {
    try {
        const { user_id, course_id } = req.query;

        if (!user_id || !course_id) {
            return res.status(400).json({
                success: false,
                message: "user_id and course_id are required"
            });
        }

        const wishlistItem = await Wishlist.findOne({
            where: {
                user_id: String(user_id),
                course_id: String(course_id)
            }
        });

        return res.status(200).json({
            success: true,
            data: {
                in_wishlist: !!wishlistItem,
                wishlist_item: wishlistItem
            }
        });

    } catch (err) {
        console.error("[checkWishlistStatus] Error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

export const getWishlistCount = async (req: Request, res: Response) => {
    try {
        const { user_id } = req.params;

        if (!user_id) {
            return res.status(400).json({
                success: false,
                message: "user_id is required"
            });
        }

        const count = await Wishlist.count({
            where: { user_id }
        });

        return res.status(200).json({
            success: true,
            data: {
                user_id: parseInt(user_id),
                wishlist_count: count
            }
        });

    } catch (err) {
        console.error("[getWishlistCount] Error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};