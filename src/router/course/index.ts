import { Router } from "express";
import { createCourse, deleteCourse, getChaptersWithUserProgress, getContinueLearning, getCourse, listCourses, listCoursesWithChaptersAndProgress, toggleCourseStatus, updateCourse} from "../../controllers/courses/index";
import { checkAccessToken } from "../../util/auth";
import { authenticate } from "../../middleware/auth";
import { isAdmin } from "../../middleware/isAdmin";

const router = Router();
// router.post("/create-course", createCourse);
router.post('/create-course', createCourse);


router.get("/list", listCourses);
router.get("/continue-learning/:userId", getContinueLearning);
router.get("/:id", getCourse);
router.get("/:courseId/chapters-with-progress", getChaptersWithUserProgress );
// router.post("/", checkAccessToken, createCourse);
router.put("/:id", updateCourse);
router.put("/:id/status", toggleCourseStatus);
router.delete("/:id", deleteCourse);
router.get("/with-progress/:userId", listCoursesWithChaptersAndProgress);


export default router;
