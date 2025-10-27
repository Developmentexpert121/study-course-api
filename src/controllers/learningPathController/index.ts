// controllers/learningPathController/index.ts
import { Request, Response } from "express";
import LearningPath from "../../models/learningPath.model";
import Course from "../../models/course.model";
import Enrollment from "../../models/enrollment.model";
import UserProgress from "../../models/userProgress.model";
import { Op } from "sequelize";
import Chapter from "../../models/chapter.model";

// Add interface for the learning path with courses
interface LearningPathWithCourses extends LearningPath {
    courses: typeof Course[];
}

// Create a new learning path
export const createLearningPath = async (req: Request, res: Response) => {
    try {
        const {
            title,
            description,
            category,
            difficulty,
            estimated_duration,
            courses_order,
            image
        } = req.body;

        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "User authentication required",
            });
        }

        // Convert userId to number
        const userIdNum = Number(userId);
        if (isNaN(userIdNum)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID",
            });
        }

        // Validate required fields
        if (!title || !description || !category || !difficulty || !estimated_duration) {
            return res.status(400).json({
                success: false,
                message: "All fields are required",
            });
        }

        // Validate courses exist
        if (courses_order && courses_order.length > 0) {
            const courses = await Course.findAll({
                where: { id: courses_order },
                attributes: ['id']
            });

            if (courses.length !== courses_order.length) {
                return res.status(400).json({
                    success: false,
                    message: "Some courses in the path do not exist",
                });
            }
        }

        const learningPath = await LearningPath.create({
            title,
            description,
            category,
            difficulty,
            estimated_duration,
            courses_order: courses_order || [],
            image,
            created_by: userIdNum,
        });

        return res.status(201).json({
            success: true,
            message: "Learning path created successfully",
            data: {
                learningPath,
            },
        });
    } catch (error) {
        console.error("[createLearningPath] Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

// Get all learning paths
export const getLearningPaths = async (req: Request, res: Response) => {
    try {
        const {
            category,
            difficulty,
            search,
            page = 1,
            limit = 10
        } = req.query;

        const where: any = { is_active: true };

        // Apply filters
        if (category) where.category = category;
        if (difficulty) where.difficulty = difficulty;

        if (search) {
            where[Op.or] = [
                { title: { [Op.iLike]: `%${search}%` } },
                { description: { [Op.iLike]: `%${search}%` } },
                { category: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);
        const offset = (pageNum - 1) * limitNum;

        const { count, rows: learningPaths } = await LearningPath.findAndCountAll({
            where,
            limit: limitNum,
            offset,
            order: [['created_at', 'DESC']],
            include: [
                {
                    model: Course,
                    as: 'courses',
                    attributes: ['id', 'title', 'description', 'image', 'duration', 'price_type'],
                    through: { attributes: [] }
                }
            ]
        });

        return res.json({
            success: true,
            data: {
                learningPaths,
                total: count,
                page: pageNum,
                totalPages: Math.ceil(count / limitNum),
            },
        });
    } catch (error) {
        console.error("[getLearningPaths] Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

// Get learning path by ID with detailed course information
export const getLearningPathById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        const learningPath = await LearningPath.findByPk(id, {
            include: [
                {
                    model: Course,
                    as: 'courses',
                    attributes: ['id', 'title', 'description', 'image', 'duration', 'price_type', 'category', 'creator'],
                    through: { attributes: [] }
                }
            ]
        });

        if (!learningPath) {
            return res.status(404).json({
                success: false,
                message: "Learning path not found",
            });
        }

        // Type assertion for the learning path with courses
        const learningPathWithCourses = learningPath as unknown as LearningPathWithCourses;

        // Get user progress if userId is provided
        let userProgress = null;
        if (userId) {
            const courseIds = learningPathWithCourses.courses_order;
            const enrollments = await Enrollment.findAll({
                where: {
                    user_id: userId,
                    course_id: courseIds
                }
            });

            const progressData = await UserProgress.findAll({
                where: {
                    user_id: userId,
                    course_id: courseIds
                }
            });

            userProgress = {
                enrollments: enrollments.map(e => ({
                    course_id: e.course_id,
                    enrolled_at: e.enrolled_at
                })),
                progress: progressData
            };
        }

        // Calculate overall progress for the learning path
        const coursesWithProgress = await Promise.all(
            learningPathWithCourses.courses_order.map(async (courseId, index) => {
                // Access courses from the typed learning path
                const course = learningPathWithCourses.courses.find((c: any) => c.id === courseId);
                if (!course) return null;

                const courseProgress = userProgress?.progress?.filter((p: any) => p.course_id === courseId) || [];
                const isEnrolled = userProgress?.enrollments?.some((e: any) => e.course_id === courseId) || false;

                // Calculate completion percentage
                const chapterCount = await Chapter.count({ where: { course_id: courseId } });
                const completedChapters = courseProgress.filter((p: any) => p.completed).length;
                const completionPercentage = chapterCount > 0 ? (completedChapters / chapterCount) * 100 : 0;

                return {
                    ...course.toJSON(),
                    order: index + 1,
                    is_enrolled: isEnrolled,
                    completion_percentage: completionPercentage,
                    is_locked: index > 0 && !isEnrolled
                };
            })
        );

        const filteredCourses = coursesWithProgress.filter(course => course !== null);

        return res.json({
            success: true,
            data: {
                learningPath: {
                    ...learningPathWithCourses.toJSON(),
                    courses: filteredCourses,
                    total_courses: filteredCourses.length,
                    user_progress: userProgress
                },
            },
        });
    } catch (error) {
        console.error("[getLearningPathById] Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

// Update learning path
export const updateLearningPath = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const {
            title,
            description,
            category,
            difficulty,
            estimated_duration,
            courses_order,
            image,
            is_active
        } = req.body;

        const learningPath = await LearningPath.findByPk(id);

        if (!learningPath) {
            return res.status(404).json({
                success: false,
                message: "Learning path not found",
            });
        }

        // Validate courses exist if updating courses_order
        if (courses_order && courses_order.length > 0) {
            const courses = await Course.findAll({
                where: { id: courses_order },
                attributes: ['id']
            });

            if (courses.length !== courses_order.length) {
                return res.status(400).json({
                    success: false,
                    message: "Some courses in the path do not exist",
                });
            }
        }

        await learningPath.update({
            title: title || learningPath.title,
            description: description || learningPath.description,
            category: category || learningPath.category,
            difficulty: difficulty || learningPath.difficulty,
            estimated_duration: estimated_duration || learningPath.estimated_duration,
            courses_order: courses_order || learningPath.courses_order,
            image: image || learningPath.image,
            is_active: is_active !== undefined ? is_active : learningPath.is_active,
        });

        return res.json({
            success: true,
            message: "Learning path updated successfully",
            data: {
                learningPath,
            },
        });
    } catch (error) {
        console.error("[updateLearningPath] Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

// Delete learning path (soft delete)
export const deleteLearningPath = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const learningPath = await LearningPath.findByPk(id);

        if (!learningPath) {
            return res.status(404).json({
                success: false,
                message: "Learning path not found",
            });
        }

        await learningPath.update({ is_active: false });

        return res.json({
            success: true,
            message: "Learning path deleted successfully",
        });
    } catch (error) {
        console.error("[deleteLearningPath] Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

// Get recommended learning paths for user
export const getRecommendedPaths = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "User authentication required",
            });
        }

        // Get user's enrolled courses and their categories
        const userEnrollments = await Enrollment.findAll({
            where: { user_id: userId },
            include: [
                {
                    model: Course,
                    attributes: ['category']
                }
            ]
        });

        const userCategories = [...new Set(userEnrollments.map(e => e.course?.category))].filter(Boolean) as string[];

        // Build where clause correctly
        const where: any = {
            is_active: true
        };

        if (userCategories.length > 0) {
            where.category = { [Op.in]: userCategories };
        }

        const recommendedPaths = await LearningPath.findAll({
            where,
            limit: 6,
            order: [['created_at', 'DESC']],
            include: [
                {
                    model: Course,
                    as: 'courses',
                    attributes: ['id', 'title', 'image'],
                    through: { attributes: [] }
                }
            ]
        });

        return res.json({
            success: true,
            data: {
                recommendedPaths,
            },
        });
    } catch (error) {
        console.error("[getRecommendedPaths] Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};