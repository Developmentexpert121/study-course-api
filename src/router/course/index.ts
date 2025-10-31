import { Router } from "express";
import { authenticate, authorizeAdmin } from "../../middleware/auth";

import { createCourse, deleteCourse, getChaptersWithUserProgress, getContinueLearning, getActiveCourses, listCoursesForUsers, getCourse, listCourses, listCoursesWithChaptersAndProgress, toggleCourseStatus, updateCourse, getCourseWithFullDetails ,
getActiveCoursesathomepage,

} from "../../controllers/courses/index";

const router = Router();
router.get("/list", listCourses);
router.get("/courses", listCoursesForUsers)

router.get("/:id", getCourse);



router.get("/:id/full-details", getCourseWithFullDetails);
router.put("/:id", updateCourse);
router.put("/:id/status", authenticate, authorizeAdmin, toggleCourseStatus);
router.get("/continue-learning/:userId", getContinueLearning);
router.get("/with-progress/:userId", listCoursesWithChaptersAndProgress);
router.get("/:courseId/chapters-with-progress", getChaptersWithUserProgress);

router.get('/courses/active', getActiveCoursesathomepage);




router.delete("/:id", authenticate, authorizeAdmin, deleteCourse);
router.post('/create-course', authenticate, authorizeAdmin, createCourse);


router.get('/courses/active', getActiveCourses);
export default router;

