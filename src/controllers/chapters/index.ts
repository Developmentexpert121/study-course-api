import { Request, Response } from "express";
import Chapter from "../../models/chapter.model";
import Course from "../../models/course.model";
import { Op, Sequelize } from "sequelize";
import Mcq from "../../models/mcq.model";
import Lesson from "../../models/lesson.model";

// export const createChapter = async (req: Request, res: Response) => {
//   try {
//     const { title, content, course_id, order, images, videos } = req.body;

//     if (!title || !content || !course_id || !order) {
//       return res.sendError(res, "All fields (title, content, course_id, order) are required");
//     }

//     const course = await Course.findByPk(course_id);
//     if (!course) {
//       return res.sendError(res, "Course not found");
//     }

//     const existing = await Chapter.findOne({ where: { course_id, order } });
//     if (existing) {
//       return res.sendError(res, `A chapter with order ${order} already exists for this course`);
//     }

//     const allPreviousOrders = await Chapter.findAll({
//       where: {
//         course_id,
//         order: {
//           [Op.lt]: order,
//         },
//       },
//       attributes: ['order'],
//     });

//     const existingOrders = allPreviousOrders.map((ch) => ch.order);
//     const missingOrders: number[] = [];

//     for (let i = 1; i < order; i++) {
//       if (!existingOrders.includes(i)) {
//         missingOrders.push(i);
//       }
//     }

//     if (missingOrders.length > 0) {
//       return res.sendError(
//         res,
//         `Cannot create chapter with order ${order}. Missing chapter(s) for order: ${missingOrders.join(", ")}`
//       );
//     }

//     const chapter = await Chapter.create({
//       title,
//       content,
//       course_id,
//       order,
//       images: images || [],
//       videos: videos || [],
//     });

//     return res.sendSuccess(res, {
//       message: "Chapter created successfully",
//       chapter,
//     });
//   } catch (err) {
//     console.error("[createChapter] Error:", err);
//     return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
//   }
// };



export const createChapter = async (req: Request, res: Response) => {
  try {
    const { title, content, course_id, images, videos } = req.body;

    if (!title || !content || !course_id) {
      return res.sendError(res, "All fields (title, content, course_id, order) are required");
    }

    const course = await Course.findByPk(course_id);
    if (!course) {
      return res.sendError(res, "Course not found");
    }

    const lastChapter = await Chapter.findOne({
      where: { course_id },
      order: [['order', 'DESC']],
      attributes: ['order'],
    });

    // Determine the next available order value
    const nextOrder = lastChapter ? lastChapter.order + 1 : 1; // If no chapters exist, the first order will be 1


    const allPreviousOrders = await Chapter.findAll({
      where: {
        course_id,
        order: {
          [Op.lt]: nextOrder,
        },
      },
      attributes: ['order'],
    });

    const existingOrders = allPreviousOrders.map((ch) => ch.order);
    const missingOrders: number[] = [];

    for (let i = 1; i < nextOrder; i++) {
      if (!existingOrders.includes(i)) {
        missingOrders.push(i);
      }
    }

    if (missingOrders.length > 0) {
      return res.sendError(
        res,
        `Cannot create chapter with order ${nextOrder}. Missing chapter(s) for order: ${missingOrders.join(", ")}`
      );
    }

    // NEW: Set status to false by default (will be true only when lessons are added)
    const chapter = await Chapter.create({
      title,
      content,
      course_id,
      order: nextOrder,
      images: images || [],
      videos: videos || [],
      // status: false, // Default to false, will be updated when lessons are added
    });

    return res.sendSuccess(res, {
      message: "Chapter created successfully. Add lessons to activate this chapter.",
      chapter,
    });
  } catch (err) {
    console.error("[createChapter] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};






export const getAllChapters = async (req: Request, res: Response) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const whereClause: any = {};

    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { content: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows: chapters } = await Chapter.findAndCountAll({
      where: whereClause,
      offset,
      limit: Number(limit),
      include: [
        {
          model: Course,
          as: "course",
          attributes: ["id", "title"],
          where: { is_active: true }, // ✅ Filter
          required: true, // ✅ Only chapters with active course
        },
      ],
      order: [
        [{ model: Course, as: "course" }, "title", "ASC"],
        ["order", "ASC"],
      ],
    });

    return res.sendSuccess(res, {
      data: chapters,
      pagination: {
        total: count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / Number(limit)),
      },
    });
  } catch (err) {
    console.error("[getAllChapters] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

export const editChapter = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, content, course_id, order, images, videos } = req.body;

    if (!id || !title || !content || !course_id || !order) {
      return res.sendError(res, "All fields (id, title, content, course_id, order) are required");
    }

    const chapter = await Chapter.findByPk(id);
    if (!chapter) {
      return res.sendError(res, "Chapter not found");
    }

    const course = await Course.findByPk(course_id);
    if (!course) {
      return res.sendError(res, "Course not found");
    }

    const existing = await Chapter.findOne({
      where: {
        course_id,
        order,
        id: { [Op.ne]: id },
      },
    });

    if (existing) {
      return res.sendError(res, `Another chapter with order ${order} already exists for this course`);
    }

    chapter.title = title;
    chapter.content = content;
    chapter.course_id = course_id;
    chapter.order = order;
    chapter.images = images || [];
    chapter.videos = videos || [];

    await chapter.save();

    return res.sendSuccess(res, {
      message: "Chapter updated successfully",
      chapter,
    });
  } catch (err) {
    console.error("[editChapter] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

export const getChaptersByCourseId = async (req: Request, res: Response) => {
  try {
    const { course_id, page = "1", limit = "10" } = req.query;

    if (!course_id) {
      return res.sendError(res, "course_id is required in query");
    }

    // Convert page and limit to numbers
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    // Fetch total count for pagination info
    const total = await Chapter.count({ where: { course_id } });

    // Fetch paginated chapters
    const chapters = await Chapter.findAll({
      where: { course_id },
      order: [["order", "ASC"]],
      limit: limitNum,
      offset,
    });

    return res.sendSuccess(res, {
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      chapters,
    });
  } catch (err) {
    console.error("[getChaptersByCourseId] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};


export const getChapterById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.sendError(res, "Chapter ID is required");
    }

    const chapterId = parseInt(id);
    if (isNaN(chapterId)) {
      return res.sendError(res, "Invalid chapter ID. Must be a number.");
    }

    const chapter = await Chapter.findByPk(chapterId);

    if (!chapter) {
      return res.sendError(res, "Chapter not found");
    }

    return res.sendSuccess(res, { chapter });
  } catch (err) {
    console.error("[getChapterById] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

export const deleteChapter = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) return res.sendError(res, "Chapter ID is required");

    const chapter = await Chapter.findByPk(id);
    if (!chapter) return res.sendError(res, "Chapter not found");

    const { course_id, order } = chapter;

    // Delete first
    await chapter.destroy();

    // Bulk update remaining chapters
    await Chapter.update(
      { order: Sequelize.literal('"order" - 1') },
      {
        where: {
          course_id,
          order: {
            [Op.gt]: order,
          },
        },
      }
    );

    return res.sendSuccess(res, { message: "Chapter deleted successfully" });
  } catch (err) {
    console.error("[deleteChapter] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};


export const getNextChapter = async (req: Request, res: Response) => {
  try {
    const { current_chapter_id, course_id } = req.query;

    if (!current_chapter_id || !course_id) {
      return res.sendError(res, "current_chapter_id and course_id are required");
    }

    const currentChapter = await Chapter.findByPk(current_chapter_id as string);
    if (!currentChapter) {
      return res.sendError(res, "Current chapter not found");
    }

    const nextChapter = await Chapter.findOne({
      where: {
        course_id,
        order: {
          [Op.gt]: currentChapter.order,
        },
      },
      order: [["order", "ASC"]],
      attributes: ["id", "order", "title"],
    });

    if (!nextChapter) {
      return res.sendSuccess(res, {
        message: "No next chapter available",
        nextChapterId: null,
        isLastChapter: true,
      });
    }

    return res.sendSuccess(res, {
      nextChapterId: nextChapter.id,
      nextChapterOrder: nextChapter.order,
      nextChapterTitle: nextChapter.title,
      isLastChapter: false,
    });
  } catch (err) {
    console.error("[getNextChapter] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

export const getChapterNavigation = async (req: Request, res: Response) => {
  try {
    const { chapter_id } = req.query;

    if (!chapter_id) {
      return res.sendError(res, "chapter_id is required");
    }

    // Find the current chapter
    const currentChapter = await Chapter.findByPk(chapter_id as string);

    if (!currentChapter) {
      return res.sendError(res, "Chapter not found");
    }

    // Find the previous chapter (immediate lower order)
    const previousChapter = await Chapter.findOne({
      where: {
        course_id: currentChapter.course_id,
        order: {
          [Op.lt]: currentChapter.order
        }
      },
      order: [['order', 'DESC']],
      attributes: ['id', 'title', 'order']
    });

    // Find all subsequent chapters
    const allNextChapters = await Chapter.findAll({
      where: {
        course_id: currentChapter.course_id,
        order: {
          [Op.gt]: currentChapter.order
        }
      },
      order: [['order', 'ASC']],
      attributes: ['id', 'title', 'order']
    });

    // Check if current chapter has MCQs
    const currentChapterMCQs = await Mcq.count({
      where: {
        chapter_id: currentChapter.id,
        is_active: true
      }
    });

    // Check if previous chapter has MCQs
    let previousChapterMCQs = 0;
    if (previousChapter) {
      previousChapterMCQs = await Mcq.count({
        where: {
          chapter_id: previousChapter.id,
          is_active: true
        }
      });
    }

    // Find the next chapter that has active MCQs
    let nextChapterWithMCQs = null;
    const skippedChapters = [];

    for (const chapter of allNextChapters) {
      // Check if this chapter has active MCQs
      const mcqCount = await Mcq.count({
        where: {
          chapter_id: chapter.id,
          is_active: true
        }
      });

      if (mcqCount > 0) {
        nextChapterWithMCQs = chapter;
        break;
      } else {
        skippedChapters.push({
          id: chapter.id,
          title: chapter.title,
          order: chapter.order,
          reason: "No active MCQs available",
          mcq_count: mcqCount
        });
      }
    }

    return res.sendSuccess(res, {
      message: "Chapter navigation data retrieved successfully",
      data: {
        current_chapter: {
          id: currentChapter.id,
          title: currentChapter.title,
          order: currentChapter.order,
          course_id: currentChapter.course_id,
          has_mcqs: currentChapterMCQs > 0,
          mcq_count: currentChapterMCQs
        },
        previous_chapter: previousChapter ? {
          id: previousChapter.id,
          title: previousChapter.title,
          order: previousChapter.order,
          has_mcqs: previousChapterMCQs > 0,
          mcq_count: previousChapterMCQs
        } : null,
        next_chapter: nextChapterWithMCQs ? {
          id: nextChapterWithMCQs.id,
          title: nextChapterWithMCQs.title,
          order: nextChapterWithMCQs.order,
          has_mcqs: true,
          mcq_count: await Mcq.count({
            where: {
              chapter_id: nextChapterWithMCQs.id,
              is_active: true
            }
          })
        } : null,
        skipped_chapters: skippedChapters,
        has_previous: !!previousChapter,
        has_next: !!nextChapterWithMCQs,
        is_last_chapter: allNextChapters.length === 0,
        total_skipped: skippedChapters.length
      }
    });

  } catch (err) {
    console.error("[getChapterNavigation] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

export const getAllChaptersSimple = async (req: Request, res: Response) => {
  try {
    const chapters = await Chapter.findAll({
      include: [
        {
          model: Course,
          as: "course",
          attributes: ["id", "title"],
          where: { is_active: true },
          required: true,
        },
      ],
      order: [
        [{ model: Course, as: "course" }, "title", "ASC"],
        ["order", "ASC"],
      ],
    });

    return res.sendSuccess(res, {
      message: "All chapters retrieved successfully",
      data: chapters,
      count: chapters.length,
    });
  } catch (err) {
    console.error("[getAllChaptersSimple] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};





// export const getChaptersByCourseIdPaginated = async (req: Request, res: Response) => {
//   try {
//     const { course_id, search, page = 1, limit = 10 } = req.query;

//     if (!course_id) {
//       return res.sendError(res, "course_id is required");
//     }

//     // Fetch the course
//     const course = await Course.findOne({
//       where: { id: Number(course_id) },
//       attributes: ['id', 'title', 'is_active'],
//     });

//     if (!course) {
//       return res.sendError(res, "Course not found");
//     }

//     // Prepare where clause for chapters
//     const whereClause: any = { course_id: Number(course_id) };
//     if (search) {
//       whereClause[Op.or] = [
//         { title: { [Op.iLike]: `%${search}%` } },
//         { content: { [Op.iLike]: `%${search}%` } },
//       ];
//     }

//     const offset = (Number(page) - 1) * Number(limit);

//     // Fetch chapters with count
//     const { count, rows: chapters } = await Chapter.findAndCountAll({
//       where: whereClause,
//       offset,
//       limit: Number(limit),
//       order: [["order", "ASC"]],
//       attributes: ['id', 'title', 'content', 'order', 'images', 'videos', 'createdAt', 'status'],
//       include: [
//         {
//           model: Lesson,
//           as: 'lessons', // Make sure this alias matches your association
//           attributes: ['id'],
//           required: false,
//         },
//         {
//           model: Mcq,
//           as: 'mcqs', // Make sure this alias matches your association
//           attributes: ['id'],
//           required: false,
//         }
//       ]
//     });

//     // Update status based on lessons and mcqs
//     const chaptersWithStatus = chapters.map(chapter => {
//       const chapterData = chapter.toJSON();
//       const hasLessons = chapterData.lessons && chapterData.lessons.length > 0;
//       const hasMcqs = chapterData.mcqs && chapterData.mcqs.length > 0;

//       // Remove the included associations from the response
//       delete chapterData.lessons;
//       delete chapterData.mcqs;

//       // Set status to false if no lessons AND no mcqs
//       chapterData.status = hasLessons || hasMcqs;

//       return chapterData;
//     });

//     // Send response including chapters
//     return res.sendSuccess(res, {
//       message: course.is_active
//         ? "Chapters retrieved successfully"
//         : "Chapters retrieved successfully (Course is inactive)",
//       data: {
//         course: {
//           id: course.id,
//           title: course.title,
//           is_active: course.is_active,
//         },
//         chapters: chaptersWithStatus,
//         pagination: {
//           total: count,
//           page: Number(page),
//           limit: Number(limit),
//           totalPages: Math.ceil(count / Number(limit)),
//         },
//       },
//     });
//   } catch (err) {
//     console.error("❌ [getChaptersByCourseIdPaginated] Error:", err);
//     return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
//   }
// };



export const getChaptersByCourseIdPaginated = async (req: Request, res: Response) => {
  try {
    const { course_id, search, page = 1, limit = 10 } = req.query;

    if (!course_id) {
      return res.sendError(res, "course_id is required");
    }

    // Fetch the course
    const course = await Course.findOne({
      where: { id: Number(course_id) },
      attributes: ['id', 'title', 'is_active'],
    });

    if (!course) {
      return res.sendError(res, "Course not found");
    }

    // Prepare where clause for chapters
    const whereClause: any = { course_id: Number(course_id) };
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { content: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const offset = (Number(page) - 1) * Number(limit);

    // Fetch chapters with count
    const { count, rows: chapters } = await Chapter.findAndCountAll({
      where: whereClause,
      offset,
      limit: Number(limit),
      order: [["order", "ASC"]],
      attributes: ['id', 'title', 'content', 'order', 'images', 'videos', 'createdAt'],
      include: [
        {
          model: Lesson,
          as: 'lessons', // Make sure this alias matches your association
          attributes: ['id'],
          required: false,
        },
        {
          model: Mcq,
          as: 'mcqs', // Make sure this alias matches your association
          attributes: ['id'],
          required: false,
        }
      ]
    });

    // Update status based on lessons and mcqs
    const chaptersWithStatus = chapters.map(chapter => {
      const chapterData = chapter.toJSON();
      const hasLessons = chapterData.lessons && chapterData.lessons.length > 0;
      const hasMcqs = chapterData.mcqs && chapterData.mcqs.length > 0;

      // Remove the included associations from the response
      delete chapterData.lessons;
      delete chapterData.mcqs;

      // Set status to true ONLY if chapter has BOTH lessons AND mcqs
      chapterData.status = hasLessons && hasMcqs;

      return chapterData;
    });

    // Send response including chapters
    return res.sendSuccess(res, {
      message: course.is_active
        ? "Chapters retrieved successfully"
        : "Chapters retrieved successfully (Course is inactive)",
      data: {
        course: {
          id: course.id,
          title: course.title,
          is_active: course.is_active,
        },
        chapters: chaptersWithStatus,
        pagination: {
          total: count,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(count / Number(limit)),
        },
      },
    });
  } catch (err) {
    console.error("❌ [getChaptersByCourseIdPaginated] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};




export const getChaptersByCourseIdSimple = async (req: Request, res: Response) => {
  try {
    const { course_id } = req.query;

    if (!course_id) {
      return res.sendError(res, "course_id is required in query");
    }

    const course = await Course.findByPk(course_id, {
      attributes: ["id", "title", "is_active"],
    });

    if (!course) {
      return res.sendError(res, "Course not found");
    }

    const chapters = await Chapter.findAll({
      where: { course_id },
      order: [["order", "ASC"]],
      attributes: ["id", "title", "content", "order", "images", "videos", "createdAt"],
    });

    return res.sendSuccess(res, {
      message: "Chapters retrieved successfully",
      data: {
        course: {
          id: course.id,
          title: course.title,
          is_active: course.is_active,
        },
        total: chapters.length,
        chapters,
      },
    });
  } catch (err) {
    console.error("[getChaptersByCourseIdSimple] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

// export const getChapterStatus = async (req: Request, res: Response) => {
//   try {
//     const { user_id, course_id, chapter_id } = req.query;

//     if (!user_id || !course_id || !chapter_id) {
//       return res.status(400).sendError(res, "user_id, course_id, and chapter_id are required");
//     }

//     // Get chapter progress (main chapter record without lesson_id)
//     const chapterProgress = await UserProgress.findOne({
//       where: {
//         user_id,
//         course_id,
//         chapter_id,
//         lesson_id: null // Main chapter record
//       }
//     });

//     if (!chapterProgress) {
//       return res.status(200).sendSuccess(res, {
//         locked: true,
//         lessons_completed: false,
//         mcq_unlocked: false,
//         mcq_passed: false,
//         completed_lessons: 0,
//         total_lessons: 0
//       });
//     }

//     // Get chapter details
//     const chapter = await Chapter.findByPk(chapter_id as string, {
//       include: [{
//         model: Lesson,
//         as: 'lessons',
//         attributes: ['id']
//       }]
//     });

//     const totalLessons = chapter?.lessons?.length || 0;

//     // Count completed lessons
//     const completedLessonsCount = await UserProgress.count({
//       where: {
//         user_id,
//         course_id,
//         chapter_id,
//         lesson_completed: true
//       }
//     });

//     const lessonsCompleted = completedLessonsCount >= totalLessons;

//     return res.status(200).sendSuccess(res, {
//       locked: chapterProgress.locked,
//       lessons_completed: lessonsCompleted,
//       mcq_unlocked: lessonsCompleted, // MCQs unlock when all lessons are completed
//       mcq_passed: chapterProgress.mcq_passed,
//       completed_lessons: completedLessonsCount,
//       total_lessons: totalLessons
//     });

//   } catch (err) {
//     console.error("[getChapterStatus] Error:", err);
//     return res.status(500).sendError(res, "ERR_INTERNAL_SERVER_ERROR");
//   }
// };


// export const markLessonAsCompleted = async (req: Request, res: Response) => {
//   try {
//     const { courseId } = req.params;
//     const { user_id, lesson_id, chapter_id } = req.body;

//     if (!user_id || !lesson_id || !chapter_id) {
//       return res.status(400).sendError(res, "user_id, lesson_id, and chapter_id are required");
//     }

//     console.log(`Marking lesson as completed:`, { courseId, user_id, lesson_id, chapter_id });

//     // Check enrollment
//     const enrollment = await Enrollment.findOne({
//       where: { user_id, course_id: courseId }
//     });

//     if (!enrollment) {
//       return res.status(400).sendError(res, "User is not enrolled in this course");
//     }

//     // Get lesson with chapter info
//     const lesson = await Lesson.findByPk(lesson_id, {
//       include: [{
//         model: Chapter,
//         as: 'chapter',
//         attributes: ['id', 'course_id', 'order']
//       }]
//     });

//     if (!lesson) {
//       return res.status(404).sendError(res, "Lesson not found");
//     }

//     // ✅ CHECK CHAPTER LOCK STATUS
//     const chapterProgress = await UserProgress.findOne({
//       where: {
//         user_id,
//         course_id: courseId,
//         chapter_id: chapter_id,
//         lesson_id: null // Chapter-level record
//       }
//     });

//     // If chapter progress doesn't exist, create it with correct lock status
//     if (!chapterProgress) {
//       const isFirstChapter = lesson.chapter.order === 1;
//       const locked = !isFirstChapter; // First chapter unlocked, others locked

//       await UserProgress.create({
//         user_id,
//         course_id: courseId,
//         chapter_id: chapter_id,
//         lesson_id: null, // Important: null for chapter progress
//         completed: false,
//         mcq_passed: false,
//         locked: locked,
//         lesson_completed: false
//       });
//     } else if (chapterProgress.locked) {
//       return res.status(400).sendError(res, "Chapter is locked. Complete previous chapter first.");
//     }

//     // ✅ WORKAROUND: Use update instead of create for lesson-level records
//     // First check if lesson progress already exists
//     const existingLessonProgress = await UserProgress.findOne({
//       where: {
//         user_id,
//         course_id: courseId,
//         chapter_id: chapter_id,
//         lesson_id: lesson_id
//       }
//     });

//     if (existingLessonProgress) {
//       // Update existing record
//       await UserProgress.update(
//         {
//           lesson_completed: true,
//           completed_at: new Date()
//         },
//         {
//           where: {
//             user_id,
//             course_id: courseId,
//             chapter_id: chapter_id,
//             lesson_id: lesson_id
//           }
//         }
//       );
//     } else {
//       // Create new lesson progress record
//       // Use try-catch to handle unique constraint errors
//       try {
//         await UserProgress.create({
//           user_id,
//           course_id: courseId,
//           chapter_id: chapter_id,
//           lesson_id: lesson_id,
//           completed: false,
//           mcq_passed: false,
//           locked: false,
//           lesson_completed: true,
//           completed_at: new Date()
//         });
//       } catch (error) {
//         if (error.name === 'SequelizeUniqueConstraintError') {
//           // Record already exists, update it
//           await UserProgress.update(
//             {
//               lesson_completed: true,
//               completed_at: new Date()
//             },
//             {
//               where: {
//                 user_id,
//                 course_id: courseId,
//                 chapter_id: chapter_id,
//                 lesson_id: lesson_id
//               }
//             }
//           );
//         } else {
//           throw error;
//         }
//       }
//     }

//     // ✅ CHECK IF ALL LESSONS IN CHAPTER ARE COMPLETED
//     const completedLessonsCount = await UserProgress.count({
//       where: {
//         user_id,
//         course_id: courseId,
//         chapter_id: chapter_id,
//         lesson_id: { [Op.ne]: null }, // Only lesson records
//         lesson_completed: true
//       }
//     });

//     const totalLessons = await Lesson.count({
//       where: { chapter_id: chapter_id }
//     });

//     const allLessonsCompleted = completedLessonsCount >= totalLessons;

//     // Update chapter progress if all lessons are completed
//     if (allLessonsCompleted) {
//       await UserProgress.update(
//         { lesson_completed: true },
//         {
//           where: {
//             user_id,
//             course_id: courseId,
//             chapter_id: chapter_id,
//             lesson_id: null // Chapter-level record
//           }
//         }
//       );
//     }

//     // Get updated progress
//     const updatedProgress = await getUserCourseProgressData(user_id, courseId);

//     return res.status(200).sendSuccess(res, {
//       message: "Lesson marked as completed successfully",
//       lesson_id: lesson_id,
//       chapter_id: chapter_id,
//       all_lessons_completed: allLessonsCompleted,
//       can_attempt_mcq: allLessonsCompleted,
//       progress: updatedProgress
//     });

//   } catch (err) {
//     console.error("[markLessonAsCompleted] Error:", err);

//     // Handle unique constraint error specifically
//     if (err.name === 'SequelizeUniqueConstraintError') {
//       return res.status(400).sendError(res, "Progress record already exists. Please try again.");
//     }

//     return res.status(500).sendError(res, "ERR_INTERNAL_SERVER_ERROR");
//   }
// };

// const getUserCourseProgressData = async (user_id: string, courseId: string) => {
//   try {
//     const chapters = await Chapter.findAll({
//       where: { course_id: courseId },
//       order: [['order', 'ASC']],
//       include: [{
//         model: Lesson,
//         as: 'lessons',
//         attributes: ['id', 'title', 'order', 'duration'],
//         order: [['order', 'ASC']]
//       }, {
//         model: Mcq,
//         as: 'mcqs',
//         attributes: ['id'],
//         where: { is_active: true },
//         required: false
//       }]
//     });

//     const userProgress = await UserProgress.findAll({
//       where: {
//         user_id,
//         course_id: courseId
//       }
//     });

//     const chaptersWithProgress = await Promise.all(chapters.map(async (chapter, index) => {
//       const chapterProgress = userProgress.find(p =>
//         p.chapter_id === chapter.id && p.lesson_id === null
//       );

//       const lessonProgress = userProgress.filter(p =>
//         p.chapter_id === chapter.id && p.lesson_id !== null
//       );

//       const completedLessons = lessonProgress.filter(p => p.lesson_completed);
//       const allLessonsCompleted = completedLessons.length >= chapter.lessons.length;

//       // ✅ PROPER LOCK LOGIC:
//       let locked = true;
//       if (index === 0) {
//         locked = false; // First chapter always unlocked
//       } else {
//         const previousChapter = chapters[index - 1];
//         const previousChapterProgress = userProgress.find(p =>
//           p.chapter_id === previousChapter.id && p.lesson_id === null
//         );
//         // Locked if previous chapter not completed (mcq_passed)
//         locked = !(previousChapterProgress && previousChapterProgress.mcq_passed);
//       }

//       // Can attempt MCQ only if:
//       // 1. Chapter is unlocked AND
//       // 2. All lessons are completed AND
//       // 3. MCQ not already passed
//       const canAttemptMCQ = !locked && allLessonsCompleted && !chapterProgress?.mcq_passed;

//       return {
//         id: chapter.id,
//         title: chapter.title,
//         order: chapter.order,
//         locked: locked,
//         completed: chapterProgress?.completed || false,
//         mcq_passed: chapterProgress?.mcq_passed || false,
//         lesson_completed: chapterProgress?.lesson_completed || false,
//         progress: {
//           total_lessons: chapter.lessons.length,
//           completed_lessons: completedLessons.length,
//           all_lessons_completed: allLessonsCompleted,
//           has_mcqs: chapter.mcqs.length > 0,
//           total_mcqs: chapter.mcqs.length,
//           can_attempt_mcq: canAttemptMCQ
//         },
//         lessons: chapter.lessons.map(lesson => ({
//           id: lesson.id,
//           title: lesson.title,
//           order: lesson.order,
//           duration: lesson.duration,
//           completed: lessonProgress.some(p => p.lesson_id === lesson.id && p.lesson_completed),
//           locked: locked // Lessons inherit chapter lock status
//         }))
//       };
//     }));

//     // Calculate overall progress
//     const totalChapters = chapters.length;
//     const completedChapters = chaptersWithProgress.filter(ch => ch.completed).length;
//     const overallProgress = totalChapters > 0 ? (completedChapters / totalChapters) * 100 : 0;

//     return {
//       course_id: courseId,
//       user_id,
//       overall_progress: Math.round(overallProgress),
//       total_chapters: totalChapters,
//       completed_chapters: completedChapters,
//       chapters: chaptersWithProgress
//     };
//   } catch (error) {
//     console.error("[getUserCourseProgressData] Error:", error);
//     throw error;
//   }
// };

