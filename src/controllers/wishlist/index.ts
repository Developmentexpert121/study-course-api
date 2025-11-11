// controllers/wishlist.controller.ts
import { Request, Response } from "express";
import Wishlist from "../../models/wishlist.model";
import Course from "../../models/course.model";
import User from "../../models/user.model";
import { Op } from "sequelize";
import Enrollment from "../../models/enrollment.model";
import Ratings from "../../models/rating.model";
import Lesson from "../../models/lesson.model";
import Mcq from "../../models/mcq.model";
import Chapter from "../../models/chapter.model";


export const getUserWishlist = async (req: Request, res: Response) => {
    try {
        const { user_id } = req.params;
        const { page = 1, limit = 10, include_chapters = "false" } = req.query;

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
                    as: 'wishlist_course',
                    include: [
                        {
                            model: Chapter,
                            as: "chapters",
                            attributes: include_chapters === "true"
                                ? ["id", "title", "order", "description", "duration"]
                                : ["id"],
                            required: false,
                            include: [
                                {
                                    model: Lesson,
                                    as: "lessons",
                                    attributes: ["id", "title", "duration", "order", "is_preview"],
                                    required: false,
                                    order: [["order", "ASC"]]
                                },
                                {
                                    model: Mcq,
                                    as: "mcqs",
                                    attributes: ["id", "question"],
                                    required: false
                                }
                            ],
                            order: [["order", "ASC"]]
                        },
                        {
                            model: Enrollment,
                            as: "enrollments",
                            required: false,
                            attributes: ["id", "user_id", "enrolled_at"]
                        }
                    ]
                }
            ]
        });

        // 🔥 FETCH CREATOR INFORMATION FOR ALL COURSES IN WISHLIST
        const creatorIds = wishlist.map(item => item.wishlist_course?.creator).filter(id => id);
        const uniqueCreatorIds = [...new Set(creatorIds)];

        let creatorsMap = {};
        if (uniqueCreatorIds.length > 0) {
            const creators = await User.findAll({
                where: {
                    id: uniqueCreatorIds
                },
                attributes: ['id', 'username', 'email', 'profileImage'],
                raw: true
            });

            creatorsMap = creators.reduce((map, user) => {
                map[user.id] = {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    profileImage: user.profileImage,
                };
                return map;
            }, {});
        }

        // 🔥 FETCH RATINGS FOR ALL COURSES IN WISHLIST
        const courseIds = wishlist.map(item => item.course_id);
        let ratingsMap = {};

        if (courseIds.length > 0) {
            const ratings = await Ratings.findAll({
                where: {
                    course_id: courseIds,
                    isactive: true,
                    status: 'showtoeveryone'
                },
                attributes: ['course_id', 'score'],
                raw: true
            });

            // Calculate rating statistics for each course
            ratingsMap = ratings.reduce((map, rating) => {
                if (!map[rating.course_id]) {
                    map[rating.course_id] = {
                        total_ratings: 0,
                        total_score: 0,
                        scores: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
                    };
                }

                map[rating.course_id].total_ratings++;
                map[rating.course_id].total_score += rating.score;
                map[rating.course_id].scores[rating.score]++;

                return map;
            }, {});

            // Calculate average rating and percentage distribution
            Object.keys(ratingsMap).forEach(courseId => {
                const stats = ratingsMap[courseId];
                stats.average_rating = stats.total_ratings > 0
                    ? parseFloat((stats.total_score / stats.total_ratings).toFixed(1))
                    : 0;

                // Calculate percentage distribution
                stats.percentage_distribution = {};
                Object.keys(stats.scores).forEach(score => {
                    stats.percentage_distribution[score] = stats.total_ratings > 0
                        ? parseFloat(((stats.scores[score] / stats.total_ratings) * 100).toFixed(1))
                        : 0;
                });
            });
        }

        // Helper functions (same as listCourses)
        const calculateCompletionPercentage = (
            totalChapters: number,
            chaptersWithLessons: number,
            chaptersWithMCQs: number
        ): number => {
            if (totalChapters === 0) return 0;
            const lessonsPercentage = (chaptersWithLessons / totalChapters) * 50;
            const mcqsPercentage = (chaptersWithMCQs / totalChapters) * 50;
            return Math.round(lessonsPercentage + mcqsPercentage);
        };

        const getReadinessLevel = (percentage: number): string => {
            if (percentage === 0) return "not_started";
            if (percentage < 25) return "very_low";
            if (percentage < 50) return "low";
            if (percentage < 75) return "medium";
            if (percentage < 100) return "high";
            return "complete";
        };

        const getMissingComponents = (
            hasChapters: boolean,
            hasLessons: boolean,
            hasMCQs: boolean,
            allChaptersHaveLessons: boolean,
            allChaptersHaveMCQs: boolean
        ): string[] => {
            const missing = [];
            if (!hasChapters) missing.push("chapters");
            if (!hasLessons) missing.push("lessons");
            if (!hasMCQs) missing.push("mcqs");
            if (hasChapters && !allChaptersHaveLessons) missing.push("lessons_in_all_chapters");
            if (hasChapters && !allChaptersHaveMCQs) missing.push("mcqs_in_all_chapters");
            return missing;
        };

        // 🔥 PROCESS WISHLIST ITEMS WITH FULL COURSE DETAILS
        const processedWishlist = await Promise.all(
            wishlist.map(async (item: any) => {
                const course = item.wishlist_course;
                const courseData = course.toJSON();

                // Get creator information from the map
                const creatorId = Number(courseData.creator);
                const creatorInfo = creatorsMap[creatorId] || {};
                const creatorName = creatorInfo.username || "Unknown";
                const creatorEmail = creatorInfo.email || "";
                const creatorProfileImage = creatorInfo.profileImage || null;

                const enrollments = courseData.enrollments || [];

                // Get enrollment count
                const enrollmentCount = await Enrollment.count({
                    where: { course_id: item.course_id }
                });

                // Get rating statistics for this course
                const courseRatings = ratingsMap[item.course_id] || {
                    total_ratings: 0,
                    average_rating: 0,
                    scores: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
                    percentage_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
                };

                // Calculate totals for the course
                const totalChapters = courseData.chapters?.length || 0;
                const totalLessons = courseData.chapters?.reduce((total: number, chapter: any) => {
                    return total + (chapter.lessons?.length || 0);
                }, 0) || 0;

                const totalMCQs = courseData.chapters?.reduce((total: number, chapter: any) => {
                    return total + (chapter.mcqs?.length || 0);
                }, 0) || 0;

                const totalDuration = courseData.chapters?.reduce((total: number, chapter: any) => {
                    const chapterDuration = chapter.lessons?.reduce((lessonTotal: number, lesson: any) =>
                        lessonTotal + (lesson.duration || 0), 0
                    ) || 0;
                    return total + chapterDuration;
                }, 0) || 0;

                // Count chapters with and without MCQs
                const chaptersWithMCQs = courseData.chapters?.filter((chapter: any) =>
                    (chapter.mcqs?.length || 0) > 0
                ).length || 0;

                const chaptersWithoutMCQs = totalChapters - chaptersWithMCQs;

                // Count chapters with and without lessons
                const chaptersWithLessons = courseData.chapters?.filter((chapter: any) =>
                    (chapter.lessons?.length || 0) > 0
                ).length || 0;

                const chaptersWithoutLessons = totalChapters - chaptersWithLessons;

                // Check if all chapters have lessons and MCQs
                const allChaptersHaveLessons = chaptersWithoutLessons === 0;
                const allChaptersHaveMCQs = chaptersWithoutMCQs === 0;
                const someChaptersMissingLessons = chaptersWithoutLessons > 0;
                const someChaptersMissingMCQs = chaptersWithoutMCQs > 0;

                // Check course completion based on actual content
                const hasChapters = totalChapters > 0;
                const hasLessons = totalLessons > 0;
                const hasMCQs = totalMCQs > 0;

                // Course is complete only if it has chapters AND has both lessons AND MCQs in ALL chapters
                const isCourseComplete = hasChapters && hasLessons && hasMCQs &&
                    allChaptersHaveLessons && allChaptersHaveMCQs;

                // Calculate completion percentage
                const completionPercentage = calculateCompletionPercentage(
                    totalChapters,
                    chaptersWithLessons,
                    chaptersWithMCQs
                );

                // Course readiness levels with detailed breakdown
                const courseReadiness = {
                    has_chapters: hasChapters,
                    has_lessons: hasLessons,
                    has_mcqs: hasMCQs,
                    all_chapters_have_lessons: allChaptersHaveLessons,
                    all_chapters_have_mcqs: allChaptersHaveMCQs,
                    completion_percentage: completionPercentage,
                    readiness_level: getReadinessLevel(completionPercentage),
                    missing_components: getMissingComponents(hasChapters, hasLessons, hasMCQs, allChaptersHaveLessons, allChaptersHaveMCQs)
                };

                // Process chapters with detailed information
                const processedChapters = include_chapters === "true" ? courseData.chapters?.map((chapter: any) => ({
                    id: chapter.id,
                    title: chapter.title,
                    order: chapter.order,
                    description: chapter.description,
                    duration: chapter.duration,
                    has_lessons: (chapter.lessons?.length || 0) > 0,
                    total_lessons: chapter.lessons?.length || 0,
                    has_mcqs: (chapter.mcqs?.length || 0) > 0,
                    total_mcqs: chapter.mcqs?.length || 0,
                    is_ready: (chapter.lessons?.length || 0) > 0 && (chapter.mcqs?.length || 0) > 0,
                    lessons: chapter.lessons?.map((lesson: any) => ({
                        id: lesson.id,
                        title: lesson.title,
                        duration: lesson.duration,
                        order: lesson.order,
                        is_preview: lesson.is_preview
                    })) || [],
                    mcqs_preview: chapter.mcqs?.slice(0, 2).map((mcq: any) => ({
                        id: mcq.id,
                        question: mcq.question
                    })) || []
                })) : undefined;

                return {
                    // Wishlist item details
                    id: item.id,
                    user_id: item.user_id,
                    course_id: item.course_id,
                    createdAt: item.createdAt,
                    updatedAt: item.updatedAt,

                    // Full course details (SAME FORMAT AS listCourses)
                    course: {
                        ...courseData,
                        // Course statistics
                        creator: {
                            id: creatorInfo.id,
                            username: creatorInfo.username,
                            email: creatorInfo.email,
                            profileImage: creatorInfo.profileImage,
                        },
                        has_chapters: hasChapters,
                        totalChapters: totalChapters,
                        totalLessons: totalLessons,
                        totalMCQs: totalMCQs,
                        totalDuration: totalDuration,
                        has_content: totalLessons > 0 || totalMCQs > 0,

                        // Rating statistics
                        ratings: {
                            average_rating: courseRatings.average_rating,
                            total_ratings: courseRatings.total_ratings,
                            rating_distribution: courseRatings.scores,
                            percentage_distribution: courseRatings.percentage_distribution
                        },

                        // Convenience fields for sorting and display
                        average_rating: courseRatings.average_rating,
                        total_ratings: courseRatings.total_ratings,

                        // Lesson distribution across chapters
                        chapters_with_lessons: chaptersWithLessons,
                        chapters_without_lessons: chaptersWithoutLessons,
                        all_chapters_have_lessons: allChaptersHaveLessons,
                        some_chapters_missing_lessons: someChaptersMissingLessons,

                        // MCQ distribution across chapters
                        chapters_with_mcqs: chaptersWithMCQs,
                        chapters_without_mcqs: chaptersWithoutMCQs,
                        all_chapters_have_mcqs: allChaptersHaveMCQs,
                        some_chapters_missing_mcqs: someChaptersMissingMCQs,

                        // Course completion status
                        is_course_complete: isCourseComplete,
                        course_readiness: courseReadiness,

                        // Chapter information
                        chapters: processedChapters,

                        // Creator information
                        creator_name: creatorName,
                        creator_email: creatorEmail,
                        creator_profile_image: creatorProfileImage,
                        creator_id: creatorId,

                        // Enrollment information
                        enrollment_count: enrollmentCount,

                        // Clean up
                        enrollments: undefined
                    }
                };
            })
        );

        return res.status(200).json({
            success: true,
            data: {
                wishlist: processedWishlist,
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