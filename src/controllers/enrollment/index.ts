import UserProgress from "../../models/userProgress.model";
import Enrollment from "../../models/enrollment.model";
import Chapter from "../../models/chapter.model";
import { Request, Response } from "express";
import User from "../../models/user.model";
import Course from "../../models/course.model";


export const enrollInCourse = async (req: Request, res: Response) => {
  try {
    const { user_id, course_id }: any = req.body;
    console.log("-----------user",user_id)
    if (!user_id || !course_id) {
      return res.sendError(res, "user_id and course_id are required");
    }

    const user = await User.findByPk(user_id);
    if (!user) return res.sendError(res, "User not found");

    const course = await Course.findByPk(course_id);
    if (!course) return res.sendError(res, "Course not found");

    const existing = await Enrollment.findOne({ where: { user_id, course_id } });
    if (existing) return res.sendError(res, "Already enrolled");

    await Enrollment.create({ user_id, course_id });

    const firstChapter = await Chapter.findOne({
      where: { course_id },
      order: [['order', 'ASC']],
    });

    if (firstChapter) {
      await UserProgress.create({
        user_id,
        course_id,
        chapter_id: firstChapter.id,
        completed: false,
        mcq_passed: false,
        locked: false,
      });
    } else {
      return res.sendError(res, "No chapters found in this course");
    }

    return res.sendSuccess(res, {
      message: "Enrolled successfully. First chapter unlocked.",
    });
  } catch (err) {
    console.error("[enrollInCourse] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};



// export const getMyEnrolledCourses = async (req: Request, res: Response) => {
//   try {
//     const userId = req.user.id;

//     const enrollments = await Enrollment.findAll({
//       where: { user_id: userId },
//       include: [{ model: Course }], // Assuming Course is associated
//     });

//     const enrolledCourses = enrollments.map((en) => en.course);

//     return res.sendSuccess(res, {
//       count: enrolledCourses.length,
//       courses: enrolledCourses,
//     });
//   } catch (err) {
//     console.error("[getMyEnrolledCourses] Error:", err);
//     return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
//   }
// };

// const isUserEnrolled = async (userId: number, courseId: number) => {
//   const enrollment = await Enrollment.findOne({ where: { user_id: userId, course_id: courseId } });
//   return !!enrollment;
// };

// export const getCourseChaptersForUser = async (req: Request, res: Response) => {
//   const userId = req.user.id;
//   const courseId = parseInt(req.params.courseId);

//   const enrolled = await isUserEnrolled(userId, courseId);
//   if (!enrolled) return res.sendError(res, "You must enroll in this course first");

//   // rest of your logic (chapter list, progress check, unlock status...)
// };


// export const getMyEnrolledCourses = async (req: Request, res: Response) => {
//   try {
//     // Get user_id from query params

//     console.log("GET MY ENROLLED COURSE")
//     const { user_id }: any = req.body;
//     console.log("33333333-------",req.query)
//     console.log("user_id value:", user_id);
//     console.log("user_id type:", typeof user_id);

//     if (!user_id) {
//       return res.sendError(res, "user_id is required as query parameter");
//     }

//     // Check if user exists
//     const user = await User.findByPk(user_id as string);
//     if (!user) {
//       return res.sendError(res, "User not found");
//     }

//     // Fetch only enrollment records with course_id
//     const enrollments = await Enrollment.findAll({
//       where: { user_id: user_id as string },
//       attributes: ['id', 'user_id', 'course_id', 'enrolled_at'], // Only return these fields
//       order: [['enrolled_at', 'DESC']]
//     });

//     return res.sendSuccess(res, {
//       user_id: user_id,
//       count: enrollments.length,
//       enrollments: enrollments,
//     });
//   } catch (err) {
//     console.error("[getMyEnrolledCourses] Error:", err);
//     return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
//   }
// };

// 22
// export const getMyEnrolledCourses = async (req: Request, res: Response) => {
//   try {
//     console.log("GET MY ENROLLED COURSE - FULL REQUEST DETAILS:");
//     console.log("URL:", req.url);
//     console.log("Original URL:", req.originalUrl);
//     console.log("Full query object:", req.query);
//     console.log("Query keys:", Object.keys(req.query));
//     console.log("All request parameters:", req.params);
    
//     // Get user_id from query params
//     const userId = req.query.userId;
//     console.log("userId value:", userId);
    

//     if (!userId) {
//       console.log("ERROR: user_id is missing from query parameters");
//       console.log("Available query parameters:", Object.keys(req.query));
//       return res.status(400).json({
//         success: false,
//         message: "user_id is required as query parameter. Received: " + JSON.stringify(req.query)
//       });
//     }

//     // Rest of your code...
//     const user = await User.findByPk(userId as string);
//     if (!user) {
//       return res.sendError(res, "User not found");
//     }

//     const enrollments = await Enrollment.findAll({
//       where: { user_id: userId as string },
     
//     });

//     console.log("userId value:ssss", enrollments);
//     return res.sendSuccess(res, {
//       user_id: userId,
//       count: enrollments.length,
//       enrollments: enrollments,
//     });
//   } catch (err) {
//     console.error("[getMyEnrolledCourses] Error:", err);
//     return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
//   }
// };

//33

// export const getMyEnrolledCourses = async (req: Request, res: Response) => {
//   try {
//     console.log("GET MY ENROLLED COURSE - FULL REQUEST DETAILS:");
//     console.log("Full query object:", req.query);
    
//     // Extract userId from query parameters
//     const userId = req.query.userId;
//     console.log("userId value:", userId);
    
//     if (!userId) {
//       return res.sendError(res, "userId is required as query parameter");
//     }

//     // Check if user exists
//     const user = await User.findByPk(userId as string);
//     if (!user) {
//       return res.sendError(res, "User not found");
//     }

//     // Fetch enrollment records with course details
//     const enrollments = await Enrollment.findAll({
//       where: { user_id: userId as string },
//       include: [{
//         model: Course,
//         as: 'course', // Make sure this association is set up in your models
//         attributes: [
//           'id', 'title', 'description', 'thumbnail', 'image', 
//           'instructor_id', 'price', 'rating', 'total_lessons', 
//           'duration', 'category', 'is_active', 'createdAt', 'updatedAt'
//         ]
//       }],
//       order: [['createdAt', 'DESC']]
//     });

//     // Format the response to include course details
//     const enrolledCourses = enrollments.map(enrollment => ({
//       enrollment_id: enrollment.id,
//       enrolled_at: enrollment.createdAt,
//       user_id: enrollment.user_id,
//       course: enrollment.course // This will contain all course details
//     }));

//     console.log("Enrollments with course details:", enrolledCourses.length);
    
//     return res.sendSuccess(res, {
//       user_id: userId,
//       count: enrolledCourses.length,
//       enrollments: enrolledCourses,
//     });
//   } catch (err) {
//     console.error("[getMyEnrolledCourses] Error:", err);
//     return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
//   }
// };


//44

export const getMyEnrolledCourses = async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId;
    const { search, active } = req.query;

    if (!userId) {
      return res.sendError(res, "userId is required as query parameter");
    }

    // Check if user exists
    const user = await User.findByPk(userId as string);
    if (!user) {
      return res.sendError(res, "User not found");
    }

    // Build where conditions for filtering
    const where: any = {};

    if (active !== undefined) {
      where.is_active = active === "true";
    }

    if (search && typeof search === "string") {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { category: { [Op.iLike]: `%${search}%` } },
        { creator: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Get enrolled courses with enrollment details
    const enrolledCourses = await Course.findAll({
      where,
      include: [{
        model: Enrollment,
        as: 'enrollments',
        where: { user_id: userId as string },
        required: true, // This makes it an INNER JOIN
        attributes: ['id', 'user_id', 'createdAt'] // Enrollment details
      }],
      order: [[{ model: Enrollment, as: 'enrollments' }, 'createdAt', 'DESC']],
      attributes: [
        'id', 'title', 'description', 'category', 'is_active', 
        'image', 'creator', 'ratings', 'createdAt', 'updatedAt'
      ]
    });

    // Format the response
    const formattedCourses = enrolledCourses.map(course => {
      const enrollment = course.enrollments[0]; // Get the first enrollment (should only be one per user)
      return {
        enrollment_id: enrollment.id,
        enrolled_at: enrollment.createdAt,
        user_id: enrollment.user_id,
        course: {
          id: course.id,
          title: course.title,
          description: course.description,
          category: course.category,
          is_active: course.is_active,
          image: course.image,
          creator: course.creator,
          ratings: course.ratings,
          created_at: course.createdAt,
          updated_at: course.updatedAt
        }
      };
    });

    return res.sendSuccess(res, {
      user_id: userId,
      count: formattedCourses.length,
      enrollments: formattedCourses,
    });
  } catch (err) {
    console.error("[getMyEnrolledCourses] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};


