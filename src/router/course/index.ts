import { Router } from "express";
import { createCourse, deleteCourse, getCourse, listCourses, toggleCourseStatus, updateCourse} from "../../controllers/courses/index";
import { checkAccessToken } from "../../util/auth";

const router = Router();
router.post("/create-course", createCourse);


router.get("/list", listCourses);
router.get("/:id", getCourse);
// router.post("/", checkAccessToken, createCourse);
router.put("/:id", updateCourse);
router.put("/:id/status", toggleCourseStatus);
router.delete("/:id", deleteCourse);


export default router;
