import { Request, Response } from "express";
import Chapter from "../../models/chapter.model";
import Course from "../../models/course.model";
import { Op } from "sequelize";
import Mcq from "../../models/mcq.model";

import Module from "../../models/module";


export const createModule = async (req: Request, res: Response) => {
  try {
    const { title, description, course_id, order, chapters = [] } = req.body;

    if (!title || !course_id || !order) {
      return res.sendError(res, "All fields (title, course_id, order) are required");
    }

    // Check course existence
    const course = await Course.findByPk(course_id);
    if (!course) {
      return res.sendError(res, "Course not found");
    }

    // Check for existing module with same order
    const existing = await Module.findOne({ 
      where: { course_id, order } 
    });
    if (existing) {
      return res.sendError(res, `A module with order ${order} already exists for this course`);
    }

    // Validate chapters if provided
    if (chapters && chapters.length > 0) {
      for (const chapter of chapters) {
        if (!chapter.title || !chapter.content || !chapter.order) {
          return res.sendError(res, "Each chapter must have title, content, and order");
        }
      }
    }

    // Create module with chapters array
    const module = await Module.create({
      title,
      description,
      course_id,
      order,
      chapters: chapters || [], // Store chapters as JSON array
    });

    return res.sendSuccess(res, {
      message: "Module created successfully",
      module,
    });
  } catch (err) {
    console.error("[createModule] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

// Get All Modules with their chapters
export const getAllModules = async (req: Request, res: Response) => {
  try {
    const { search, page = 1, limit = 10, course_id } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const whereClause: any = {};

    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (course_id) {
      whereClause.course_id = course_id;
    }

    const { count, rows: modules } = await Module.findAndCountAll({
      where: whereClause,
      offset,
      limit: Number(limit),
      include: [
        {
          model: Course,
          as: "course",
          attributes: ["id", "title"],
        },
      ],
      order: [
        ["order", "ASC"],
      ],
    });

    return res.sendSuccess(res, {
      data: modules,
      pagination: {
        total: count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / Number(limit)),
      },
    });
  } catch (err) {
    console.error("[getAllModules] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

// Get Module by ID with detailed chapters
export const getModuleById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.sendError(res, "Module ID is required");
    }

    const module = await Module.findByPk(id, {
      include: [
        {
          model: Course,
          as: "course",
          attributes: ["id", "title"],
        },
      ],
    });

    if (!module) {
      return res.sendError(res, "Module not found");
    }

    return res.sendSuccess(res, { module });
  } catch (err) {
    console.error("[getModuleById] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

// Edit Module and its chapters
export const editModule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, course_id, order, chapters } = req.body;

    if (!id || !title || !course_id || !order) {
      return res.sendError(res, "All fields (id, title, course_id, order) are required");
    }

    const module = await Module.findByPk(id);
    if (!module) {
      return res.sendError(res, "Module not found");
    }

    const course = await Course.findByPk(course_id);
    if (!course) {
      return res.sendError(res, "Course not found");
    }

    // Check for order conflict with other modules
    const existing = await Module.findOne({
      where: {
        course_id,
        order,
        id: { [Op.ne]: id },
      },
    });

    if (existing) {
      return res.sendError(res, `Another module with order ${order} already exists for this course`);
    }

    // Validate chapters if provided
    if (chapters && chapters.length > 0) {
      for (const chapter of chapters) {
        if (!chapter.title || !chapter.content || !chapter.order) {
          return res.sendError(res, "Each chapter must have title, content, and order");
        }
      }
    }

    // Update module
    module.title = title;
    module.description = description;
    module.course_id = course_id;
    module.order = order;
    module.chapters = chapters || [];

    await module.save();

    return res.sendSuccess(res, {
      message: "Module updated successfully",
      module,
    });
  } catch (err) {
    console.error("[editModule] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

// Add chapters to existing module
export const addChaptersToModule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { chapters } = req.body;

    if (!chapters || !Array.isArray(chapters)) {
      return res.sendError(res, "Chapters array is required");
    }

    const module = await Module.findByPk(id);
    if (!module) {
      return res.sendError(res, "Module not found");
    }

    // Validate new chapters
    for (const chapter of chapters) {
      if (!chapter.title || !chapter.content || !chapter.order) {
        return res.sendError(res, "Each chapter must have title, content, and order");
      }
    }

    // Get existing chapters and merge with new ones
    const existingChapters = module.chapters || [];
    const updatedChapters = [...existingChapters, ...chapters];

    // Update module with merged chapters
    module.chapters = updatedChapters;
    await module.save();

    return res.sendSuccess(res, {
      message: "Chapters added to module successfully",
      module,
    });
  } catch (err) {
    console.error("[addChaptersToModule] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

// Remove chapters from module
export const removeChaptersFromModule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { chapter_indexes } = req.body; // Array of indexes to remove

    if (!chapter_indexes || !Array.isArray(chapter_indexes)) {
      return res.sendError(res, "chapter_indexes array is required");
    }

    const module = await Module.findByPk(id);
    if (!module) {
      return res.sendError(res, "Module not found");
    }

    const existingChapters = module.chapters || [];
    
    // Remove chapters by index
    const updatedChapters = existingChapters.filter((_, index) => 
      !chapter_indexes.includes(index)
    );

    module.chapters = updatedChapters;
    await module.save();

    return res.sendSuccess(res, {
      message: "Chapters removed from module successfully",
      module,
    });
  } catch (err) {
    console.error("[removeChaptersFromModule] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

// Delete Module
export const deleteModule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.sendError(res, "Module ID is required");
    }

    const module = await Module.findByPk(id);
    if (!module) {
      return res.sendError(res, "Module not found");
    }

    await module.destroy();

    return res.sendSuccess(res, {
      message: "Module deleted successfully",
    });
  } catch (err) {
    console.error("[deleteModule] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

// Get Modules by Course ID
export const getModulesByCourseId = async (req: Request, res: Response) => {
  try {
    const { course_id } = req.query;

    if (!course_id) {
      return res.sendError(res, "course_id is required");
    }

    const modules = await Module.findAll({
      where: { course_id },
      order: [["order", "ASC"]],
    });

    return res.sendSuccess(res, modules);
  } catch (err) {
    console.error("[getModulesByCourseId] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};






























export const createChapter = async (req: Request, res: Response) => {
  try {
    const { title, content, course_id, order, images, videos } = req.body;

    // Basic required field validation
    if (!title || !content || !course_id || !order) {
      return res.sendError(res, "All fields (title, content, course_id, order) are required");
    }

    // Check course existence
    const course = await Course.findByPk(course_id);
    if (!course) {
      return res.sendError(res, "Course not found");
    }

    // Check for existing chapter with the same order
    const existing = await Chapter.findOne({ where: { course_id, order } });
    if (existing) {
      return res.sendError(res, `A chapter with order ${order} already exists for this course`);
    }

    // ✅ Check for missing intermediate order(s)
    const allPreviousOrders = await Chapter.findAll({
      where: {
        course_id,
        order: {
          [Op.lt]: order,
        },
      },
      attributes: ['order'],
    });

    const existingOrders = allPreviousOrders.map((ch) => ch.order);
    const missingOrders: number[] = [];

    for (let i = 1; i < order; i++) {
      if (!existingOrders.includes(i)) {
        missingOrders.push(i);
      }
    }

    if (missingOrders.length > 0) {
      return res.sendError(
        res,
        `Cannot create chapter with order ${order}. Missing chapter(s) for order: ${missingOrders.join(", ")}`
      );
    }

    // Create chapter
    const chapter = await Chapter.create({
      title,
      content,
      course_id,
      order,
      images: images || [],
      videos: videos || [],
    });

    return res.sendSuccess(res, {
      message: "Chapter created successfully",
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
    const { course_id } = req.query;

    if (!course_id) {
      return res.sendError(res, "course_id is required in query");
    }

    const chapters = await Chapter.findAll({
      where: { course_id },
      order: [["order", "ASC"]],
    });

    return res.sendSuccess(res, chapters);
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

    const chapter = await Chapter.findByPk(id);

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

    if (!id) {
      return res.sendError(res, "Chapter ID is required");
    }

    // 1. Find the chapter to be deleted
    const chapter = await Chapter.findByPk(id);

    if (!chapter) {
      return res.sendError(res, "Chapter not found");
    }

    const { course_id, order } = chapter;

    // 2. Check if there are chapters with higher order in the same course
    const higherOrderChapters = await Chapter.findOne({
      where: {
        course_id,
        order: {
          [Op.gt]: order,
        },
      },
    });

    if (higherOrderChapters) {
      return res.sendError(
        res,
        `Cannot delete chapter with order ${order} because chapters with higher order exist in the course.`
      );
    }

    // 3. Safe to delete
    await chapter.destroy();

    return res.sendSuccess(res, {
      message: "Chapter deleted successfully",
    });
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

    // Get current chapter to determine its order
    const currentChapter = await Chapter.findByPk(current_chapter_id as string);
    if (!currentChapter) {
      return res.sendError(res, "Current chapter not found");
    }

    // Get next chapter by order in the same course
    const nextChapter = await Chapter.findOne({
      where: {
        course_id,
        order: {
          [Op.gt]: currentChapter.order,
        },
      },
      order: [["order", "ASC"]], // Get the immediate next chapter
      attributes: ["id", "order", "title"], // Only return essential fields
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





// Add this to your chapter controller
// export const getChapterNavigation = async (req: Request, res: Response) => {
//   try {
//     const { chapter_id } = req.query;

//     if (!chapter_id) {
//       return res.sendError(res, "chapter_id is required");
//     }

//     // Find the current chapter
//     const currentChapter = await Chapter.findByPk(chapter_id as string);
    
//     if (!currentChapter) {
//       return res.sendError(res, "Chapter not found");
//     }

//     // Find the previous chapter (immediate lower order)
//     const previousChapter = await Chapter.findOne({
//       where: {
//         course_id: currentChapter.course_id,
//         order: {
//           [Op.lt]: currentChapter.order
//         }
//       },
//       order: [['order', 'DESC']], // Get the highest order that's lower than current
//       attributes: ['id', 'title', 'order']
//     });

//     // Find the next chapter (immediate higher order)
//     const nextChapter = await Chapter.findOne({
//       where: {
//         course_id: currentChapter.course_id,
//         order: {
//           [Op.gt]: currentChapter.order
//         }
//       },
//       order: [['order', 'ASC']], // Get the lowest order that's higher than current
//       attributes: ['id', 'title', 'order']
//     });

//     return res.sendSuccess(res, {
//       message: "Chapter navigation data retrieved successfully",
//       data: {
//         current_chapter: {
//           id: currentChapter.id,
//           title: currentChapter.title,
//           order: currentChapter.order,
//           course_id: currentChapter.course_id
//         },
//         previous_chapter: previousChapter ? {
//           id: previousChapter.id,
//           title: previousChapter.title,
//           order: previousChapter.order
//         } : null,
//         next_chapter: nextChapter ? {
//           id: nextChapter.id,
//           title: nextChapter.title,
//           order: nextChapter.order
//         } : null,
//         has_previous: !!previousChapter,
//         has_next: !!nextChapter
//       }
//     });

//   } catch (err) {
//     console.error("[getChapterNavigation] Error:", err);
//     return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
//   }
// };

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
//     console.log("📥 Request received:", req.query);
//     const { course_id, search, page = 1, limit = 10 } = req.query;
    
//     // Validate required course_id
//     if (!course_id) {
   
//       return res.sendError(res, "course_id is required");
//     }

//     console.log("🔍 Checking course existence...");
//     // Check if course exists and is active
//     const course = await Course.findOne({
//       where: { 
//         id: course_id,
//         is_active: true 
//       },
//       attributes: ['id', 'title']
//     });

//     if (!course) {
//       console.log("❌ Course not found:", course_id);
//       return res.sendError(res, "Course not found or is inactive");
//     }

//     console.log("✅ Course found:", course.title);
    
//     // Build where clause
//     const whereClause: any = { course_id };

//     // Add search functionality if provided
//     if (search) {
//       whereClause[Op.or] = [
//         { title: { [Op.iLike]: `%${search}%` } },
//         { content: { [Op.iLike]: `%${search}%` } },
//       ];
//     }

//     console.log("📊 Fetching chapters with where clause:", whereClause);
    
//     const offset = (Number(page) - 1) * Number(limit);

//     // Fetch chapters with pagination
//     const { count, rows: chapters } = await Chapter.findAndCountAll({
//       where: whereClause,
//       offset,
//       limit: Number(limit),
//       order: [["order", "ASC"]],
//       attributes: ['id', 'title', 'content', 'order', 'images', 'videos', 'createdAt']
//     });

//     console.log("✅ Chapters found:", chapters.length);

//     return res.sendSuccess(res, {
//       message: "Chapters retrieved successfully",
//       data: {
//         course: {
//           id: course.id,
//           title: course.title
//         },
//         chapters,
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
    console.log("📥 Request received:", req.query);
    const { course_id, search, page = 1, limit = 10 } = req.query;
    
    // Validate required course_id
    if (!course_id) {
      return res.sendError(res, "course_id is required");
    }

    console.log("🔍 Checking course existence...");
    // Check if course exists (regardless of active status)
    const course = await Course.findOne({
      where: { 
        id: course_id
      },
      attributes: ['id', 'title', 'is_active'] // Include is_active to show status
    });

    if (!course) {
      console.log("❌ Course not found:", course_id);
      return res.sendError(res, "Course not found");
    }

    console.log("✅ Course found:", course.title, "- Active:", course.is_active);
    
    // Build where clause
    const whereClause: any = { course_id };

    // Add search functionality if provided
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { content: { [Op.iLike]: `%${search}%` } },
      ];
    }

    console.log("📊 Fetching chapters with where clause:", whereClause);
    
    const offset = (Number(page) - 1) * Number(limit);

    // Fetch chapters with pagination
    const { count, rows: chapters } = await Chapter.findAndCountAll({
      where: whereClause,
      offset,
      limit: Number(limit),
      order: [["order", "ASC"]],
      attributes: ['id', 'title', 'content', 'order', 'images', 'videos', 'createdAt']
    });

    console.log("✅ Chapters found:", chapters.length);

    return res.sendSuccess(res, {
      message: course.is_active 
        ? "Chapters retrieved successfully" 
        : "Chapters retrieved successfully (Course is inactive)",
      data: {
        course: {
          id: course.id,
          title: course.title,
          is_active: course.is_active // Include status in response
        },
        chapters,
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