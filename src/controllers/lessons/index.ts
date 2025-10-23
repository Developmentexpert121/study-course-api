import { Request, Response } from "express";
import Lesson from "../../models/lesson.model";
import Chapter from "../../models/chapter.model";
import Course from "../../models/course.model";
import { Op } from "sequelize";

export const createLesson = async (req: Request, res: Response) => {
    try {
        const {
            title,
            content,
            chapter_id,
            order,
            lesson_type,
            duration,
            video_url,
            resources,
            is_free = true
        } = req.body;

        if (!title || !content || !chapter_id || !order || !lesson_type) {
            return res.sendError(res, "All fields (title, content, chapter_id, order, lesson_type) are required");
        }

        // Validate lesson_type
        const validLessonTypes = ['video', 'text', 'quiz', 'assignment'];
        if (!validLessonTypes.includes(lesson_type)) {
            return res.sendError(res, `Invalid lesson type. Must be one of: ${validLessonTypes.join(', ')}`);
        }

        // Check if chapter exists
        const chapter = await Chapter.findByPk(chapter_id);
        if (!chapter) {
            return res.sendError(res, "Chapter not found");
        }

        // Check if lesson with same order already exists in this chapter
        const existingLesson = await Lesson.findOne({
            where: { chapter_id, order }
        });

        if (existingLesson) {
            return res.sendError(res, `A lesson with order ${order} already exists in this chapter`);
        }

        // Validate order sequence
        const allPreviousLessons = await Lesson.findAll({
            where: {
                chapter_id,
                order: {
                    [Op.lt]: order,
                },
            },
            attributes: ['order'],
        });

        const existingOrders = allPreviousLessons.map((lesson) => lesson.order);
        const missingOrders: number[] = [];

        for (let i = 1; i < order; i++) {
            if (!existingOrders.includes(i)) {
                missingOrders.push(i);
            }
        }

        if (missingOrders.length > 0) {
            return res.sendError(
                res,
                `Cannot create lesson with order ${order}. Missing lesson(s) for order: ${missingOrders.join(", ")}`
            );
        }

        // Validate video_url for video lessons
        if (lesson_type === 'video' && !video_url) {
            return res.sendError(res, "Video URL is required for video lessons");
        }

        const lesson = await Lesson.create({
            title,
            content,
            chapter_id,
            order,
            lesson_type,
            duration,
            video_url,
            resources: resources || [],
            is_free,
        });

        const createdLesson = await Lesson.findByPk(lesson.id, {
            include: [
                {
                    model: Chapter,
                    as: "chapter",
                    attributes: ["id", "title", "order"],
                },
            ],
        });

        return res.sendSuccess(res, {
            message: "Lesson created successfully",
            lesson: createdLesson,
        });
    } catch (err) {
        console.error("[createLesson] Error:", err);
        return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
    }
};

export const getAllLessons = async (req: Request, res: Response) => {
    try {
        const {
            search,
            page = 1,
            limit = 10,
            chapter_id,
            lesson_type,
            is_free
        } = req.query;

        const offset = (Number(page) - 1) * Number(limit);

        const whereClause: any = {};

        if (search) {
            whereClause[Op.or] = [
                { title: { [Op.iLike]: `%${search}%` } },
                { content: { [Op.iLike]: `%${search}%` } },
            ];
        }

        if (chapter_id) {
            whereClause.chapter_id = chapter_id;
        }

        if (lesson_type) {
            whereClause.lesson_type = lesson_type;
        }

        if (is_free !== undefined) {
            whereClause.is_free = is_free === 'true';
        }

        const { count, rows: lessons } = await Lesson.findAndCountAll({
            where: whereClause,
            offset,
            limit: Number(limit),
            include: [
                {
                    model: Chapter,
                    as: "chapter",
                    attributes: ["id", "title", "order"],
                    include: [
                        {
                            model: Course,
                            as: "course",
                            attributes: ["id", "title", "is_active"],
                        }
                    ]
                },
            ],
            order: [
                [{ model: Chapter, as: "chapter" }, "order", "ASC"],
                ["order", "ASC"],
            ],
        });

        return res.sendSuccess(res, {
            data: lessons,
            pagination: {
                total: count,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(count / Number(limit)),
            },
        });
    } catch (err) {
        console.error("[getAllLessons] Error:", err);
        return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
    }
};

export const getLessonById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.sendError(res, "Lesson ID is required");
        }

        const lesson = await Lesson.findByPk(id, {
            include: [
                {
                    model: Chapter,
                    as: "chapter",
                    attributes: ["id", "title", "order"],
                    include: [
                        {
                            model: Course,
                            as: "course",
                            attributes: ["id", "title", "is_active"],
                        }
                    ]
                },
            ],
        });

        if (!lesson) {
            return res.sendError(res, "Lesson not found");
        }

        return res.sendSuccess(res, { lesson });
    } catch (err) {
        console.error("[getLessonById] Error:", err);
        return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
    }
};

export const updateLesson = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const {
            title,
            content,
            chapter_id,
            order,
            lesson_type,
            duration,
            video_url,
            resources,
            is_free
        } = req.body;

        if (!id) {
            return res.sendError(res, "Lesson ID is required");
        }

        const lesson = await Lesson.findByPk(id);
        if (!lesson) {
            return res.sendError(res, "Lesson not found");
        }

        // If lesson_type is being updated, validate it
        if (lesson_type) {
            const validLessonTypes = ['video', 'text', 'quiz', 'assignment'];
            if (!validLessonTypes.includes(lesson_type)) {
                return res.sendError(res, `Invalid lesson type. Must be one of: ${validLessonTypes.join(', ')}`);
            }
        }

        // If chapter_id is being updated, verify the new chapter exists
        if (chapter_id && chapter_id !== lesson.chapter_id) {
            const chapter = await Chapter.findByPk(chapter_id);
            if (!chapter) {
                return res.sendError(res, "Chapter not found");
            }
        }

        // Check for order conflict if order is being updated
        if (order && order !== lesson.order) {
            const existingLesson = await Lesson.findOne({
                where: {
                    chapter_id: chapter_id || lesson.chapter_id,
                    order,
                    id: { [Op.ne]: id },
                },
            });

            if (existingLesson) {
                return res.sendError(res, `Another lesson with order ${order} already exists in this chapter`);
            }
        }

        // Validate video_url for video lessons
        const finalLessonType = lesson_type || lesson.lesson_type;
        if (finalLessonType === 'video' && !video_url && !lesson.video_url) {
            return res.sendError(res, "Video URL is required for video lessons");
        }

        // Update lesson
        await lesson.update({
            title: title || lesson.title,
            content: content || lesson.content,
            chapter_id: chapter_id || lesson.chapter_id,
            order: order || lesson.order,
            lesson_type: finalLessonType,
            duration: duration !== undefined ? duration : lesson.duration,
            video_url: video_url !== undefined ? video_url : lesson.video_url,
            resources: resources || lesson.resources,
            is_free: is_free !== undefined ? is_free : lesson.is_free,
        });

        const updatedLesson = await Lesson.findByPk(id, {
            include: [
                {
                    model: Chapter,
                    as: "chapter",
                    attributes: ["id", "title", "order"],
                },
            ],
        });

        return res.sendSuccess(res, {
            message: "Lesson updated successfully",
            lesson: updatedLesson,
        });
    } catch (err) {
        console.error("[updateLesson] Error:", err);
        return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
    }
};

export const deleteLesson = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.sendError(res, "Lesson ID is required");
        }

        const lesson = await Lesson.findByPk(id);
        if (!lesson) {
            return res.sendError(res, "Lesson not found");
        }

        const { chapter_id, order } = lesson;

        // Check if there are lessons with higher order in the same chapter
        const higherOrderLessons = await Lesson.findOne({
            where: {
                chapter_id,
                order: {
                    [Op.gt]: order,
                },
            },
        });

        if (higherOrderLessons) {
            return res.sendError(
                res,
                `Cannot delete lesson with order ${order} because lessons with higher order exist in the chapter.`
            );
        }

        await lesson.destroy();

        return res.sendSuccess(res, {
            message: "Lesson deleted successfully",
        });
    } catch (err) {
        console.error("[deleteLesson] Error:", err);
        return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
    }
};

export const getLessonsByChapterId = async (req: Request, res: Response) => {
    try {
        // Get chapter_id from query
        const { chapter_id } = req.query;

        console.log('[getLessonsByChapterId] Request received:', {
            query: req.query,
            params: req.params,
            body: req.body
        });

        // More specific validation
        if (chapter_id === undefined || chapter_id === null || chapter_id === '') {
            return res.status(400).json({
                success: false,
                message: "Chapter ID is required",
                data: null
            });
        }

        // Handle both string and number inputs
        let chapterIdNum: number;
        if (typeof chapter_id === 'string') {
            chapterIdNum = parseInt(chapter_id, 10);
        } else if (typeof chapter_id === 'number') {
            chapterIdNum = chapter_id;
        } else {
            return res.status(400).json({
                success: false,
                message: "Chapter ID must be a number",
                data: null
            });
        }

        // Validate the numeric value
        if (isNaN(chapterIdNum) || chapterIdNum <= 0) {
            return res.status(400).json({
                success: false,
                message: "Valid chapter ID is required",
                data: null
            });
        }

        console.log(`[getLessonsByChapterId] Processing chapter ID: ${chapterIdNum}`);

        // Find chapter by primary key
        const chapter = await Chapter.findByPk(chapterIdNum, {
            include: [
                {
                    model: Course,
                    as: "course",
                    attributes: ["id", "title", "is_active"],
                },
            ],
        });

        if (!chapter) {
            return res.status(404).json({
                success: false,
                message: "Chapter not found",
                data: null
            });
        }

        // Get lessons for the chapter
        const lessons = await Lesson.findAll({
            where: { chapter_id: chapterIdNum },
            order: [["order", "ASC"]],
            attributes: [
                "id",
                "title",
                "content",
                "order",
                "lesson_type",
                "duration",
                "video_url",
                "resources",
                "is_free",
                "created_at"
            ],
        });

        return res.status(200).json({
            success: true,
            message: chapter.course.is_active
                ? "Lessons retrieved successfully"
                : "Lessons retrieved successfully (Course is inactive)",
            data: {
                chapter: {
                    id: chapter.id,
                    title: chapter.title,
                    order: chapter.order,
                },
                course: chapter.course,
                lessons,
                totalLessons: lessons.length,
            },
        });

    } catch (err) {
        console.error("[getLessonsByChapterId] Unexpected error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            data: null
        });
    }
};

export const getLessonsByChapterIdPaginated = async (req: Request, res: Response) => {
    try {
        const { chapter_id, search, page = 1, limit = 10, lesson_type, is_free } = req.query;

        if (!chapter_id) {
            return res.sendError(res, "chapter_id is required");
        }

        const chapter = await Chapter.findByPk(chapter_id as string, {
            include: [
                {
                    model: Course,
                    as: "course",
                    attributes: ["id", "title", "is_active"],
                }
            ]
        });

        if (!chapter) {
            return res.sendError(res, "Chapter not found");
        }

        const whereClause: any = { chapter_id };

        if (search) {
            whereClause[Op.or] = [
                { title: { [Op.iLike]: `%${search}%` } },
                { content: { [Op.iLike]: `%${search}%` } },
            ];
        }

        if (lesson_type) {
            whereClause.lesson_type = lesson_type;
        }

        if (is_free !== undefined) {
            whereClause.is_free = is_free === 'true';
        }

        const offset = (Number(page) - 1) * Number(limit);
        const { count, rows: lessons } = await Lesson.findAndCountAll({
            where: whereClause,
            offset,
            limit: Number(limit),
            order: [["order", "ASC"]],
            attributes: [
                'id',
                'title',
                'content',
                'order',
                'lesson_type',
                'duration',
                'video_url',
                'resources',
                'is_free',
                'createdAt'
            ]
        });

        return res.sendSuccess(res, {
            message: chapter.course.is_active
                ? "Lessons retrieved successfully"
                : "Lessons retrieved successfully (Course is inactive)",
            data: {
                chapter: {
                    id: chapter.id,
                    title: chapter.title,
                    order: chapter.order,
                },
                course: chapter.course,
                lessons,
                pagination: {
                    total: count,
                    page: Number(page),
                    limit: Number(limit),
                    totalPages: Math.ceil(count / Number(limit)),
                },
            },
        });
    } catch (err) {
        console.error("[getLessonsByChapterIdPaginated] Error:", err);
        return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
    }
};

export const toggleLessonStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const lesson = await Lesson.findByPk(id, {
            include: [
                {
                    model: Chapter,
                    as: "chapter",
                    attributes: ["id", "title"],
                },
            ],
        });

        if (!lesson) {
            return res.sendError(res, "Lesson not found");
        }

        const newStatus = !lesson.is_free;
        await lesson.update({ is_free: newStatus });

        const statusMessage = newStatus ? "marked as free" : "marked as premium";

        return res.sendSuccess(res, {
            message: `Lesson ${statusMessage} successfully`,
            lesson: {
                ...lesson.get({ plain: true }),
                is_free: newStatus,
            },
        });
    } catch (err) {
        console.error("[toggleLessonStatus] Error:", err);
        return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
    }
};

export const getNextLesson = async (req: Request, res: Response) => {
    try {
        const { current_lesson_id, chapter_id } = req.query;

        if (!current_lesson_id || !chapter_id) {
            return res.sendError(res, "current_lesson_id and chapter_id are required");
        }

        const currentLesson = await Lesson.findByPk(current_lesson_id as string);
        if (!currentLesson) {
            return res.sendError(res, "Current lesson not found");
        }

        const nextLesson = await Lesson.findOne({
            where: {
                chapter_id,
                order: {
                    [Op.gt]: currentLesson.order,
                },
            },
            order: [["order", "ASC"]],
            attributes: ["id", "order", "title", "lesson_type", "is_free"],
        });

        if (!nextLesson) {
            return res.sendSuccess(res, {
                message: "No next lesson available",
                nextLessonId: null,
                isLastLesson: true,
            });
        }

        return res.sendSuccess(res, {
            nextLessonId: nextLesson.id,
            nextLessonOrder: nextLesson.order,
            nextLessonTitle: nextLesson.title,
            nextLessonType: nextLesson.lesson_type,
            nextLessonIsFree: nextLesson.is_free,
            isLastLesson: false,
        });
    } catch (err) {
        console.error("[getNextLesson] Error:", err);
        return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
    }
};

export const getLessonNavigation = async (req: Request, res: Response) => {
    try {
        const { lesson_id } = req.query;

        if (!lesson_id) {
            return res.sendError(res, "lesson_id is required");
        }

        // Find the current lesson
        const currentLesson = await Lesson.findByPk(lesson_id as string, {
            include: [
                {
                    model: Chapter,
                    as: "chapter",
                    attributes: ["id", "title", "order"],
                },
            ],
        });

        if (!currentLesson) {
            return res.sendError(res, "Lesson not found");
        }

        // Find the previous lesson (immediate lower order)
        const previousLesson = await Lesson.findOne({
            where: {
                chapter_id: currentLesson.chapter_id,
                order: {
                    [Op.lt]: currentLesson.order
                },
            },
            order: [['order', 'DESC']],
            attributes: ['id', 'title', 'order', 'lesson_type', 'is_free']
        });

        // Find the next lesson (immediate higher order)
        const nextLesson = await Lesson.findOne({
            where: {
                chapter_id: currentLesson.chapter_id,
                order: {
                    [Op.gt]: currentLesson.order
                },
            },
            order: [['order', 'ASC']],
            attributes: ['id', 'title', 'order', 'lesson_type', 'is_free']
        });

        return res.sendSuccess(res, {
            message: "Lesson navigation data retrieved successfully",
            data: {
                current_lesson: {
                    id: currentLesson.id,
                    title: currentLesson.title,
                    order: currentLesson.order,
                    lesson_type: currentLesson.lesson_type,
                    is_free: currentLesson.is_free,
                    chapter_id: currentLesson.chapter_id,
                    chapter_title: currentLesson.chapter.title,
                },
                previous_lesson: previousLesson ? {
                    id: previousLesson.id,
                    title: previousLesson.title,
                    order: previousLesson.order,
                    lesson_type: previousLesson.lesson_type,
                    is_free: previousLesson.is_free,
                } : null,
                next_lesson: nextLesson ? {
                    id: nextLesson.id,
                    title: nextLesson.title,
                    order: nextLesson.order,
                    lesson_type: nextLesson.lesson_type,
                    is_free: nextLesson.is_free,
                } : null,
                has_previous: !!previousLesson,
                has_next: !!nextLesson,
                is_last_lesson: !nextLesson,
            }
        });

    } catch (err) {
        console.error("[getLessonNavigation] Error:", err);
        return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
    }
};

export const getChapterLessonsWithProgress = async (req: Request, res: Response) => {
    try {
        const { chapter_id, user_id } = req.query;

        if (!chapter_id || !user_id) {
            return res.sendError(res, "chapter_id and user_id are required");
        }

        const lessons = await Lesson.findAll({
            where: {
                chapter_id,
            },
            order: [["order", "ASC"]],
            attributes: [
                'id',
                'title',
                'order',
                'lesson_type',
                'duration',
                'is_free',
                'video_url',
                'resources'
            ]
        });

        // Here you would typically fetch user progress for these lessons
        // This is a placeholder - you'll need to implement based on your UserProgress model
        const lessonsWithProgress = lessons.map(lesson => ({
            ...lesson.toJSON(),
            completed: false, // You would fetch this from UserProgress
            progress: 0, // You would calculate this based on user activity
            locked: lesson.order > 1, // Logic for locking lessons
        }));

        return res.sendSuccess(res, {
            message: "Lessons with progress retrieved successfully",
            data: lessonsWithProgress,
        });
    } catch (err) {
        console.error("[getChapterLessonsWithProgress] Error:", err);
        return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
    }
};

export const getLessonsByType = async (req: Request, res: Response) => {
    try {
        const { lesson_type, chapter_id } = req.query;

        if (!lesson_type) {
            return res.sendError(res, "lesson_type is required");
        }

        const validLessonTypes = ['video', 'text', 'quiz', 'assignment'];
        if (!validLessonTypes.includes(lesson_type as string)) {
            return res.sendError(res, `Invalid lesson type. Must be one of: ${validLessonTypes.join(', ')}`);
        }

        const whereClause: any = {
            lesson_type
        };

        if (chapter_id) {
            whereClause.chapter_id = chapter_id;
        }

        const lessons = await Lesson.findAll({
            where: whereClause,
            order: [["order", "ASC"]],
            include: [
                {
                    model: Chapter,
                    as: "chapter",
                    attributes: ["id", "title", "order"],
                    include: [
                        {
                            model: Course,
                            as: "course",
                            attributes: ["id", "title"],
                        }
                    ]
                },
            ],
            attributes: [
                'id',
                'title',
                'order',
                'lesson_type',
                'duration',
                'is_free',
                'video_url'
            ]
        });

        return res.sendSuccess(res, {
            message: `${lesson_type} lessons retrieved successfully`,
            data: lessons,
            count: lessons.length,
        });
    } catch (err) {
        console.error("[getLessonsByType] Error:", err);
        return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
    }
};