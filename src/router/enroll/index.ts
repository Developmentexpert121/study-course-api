import { enrollInCourse } from "../../controllers/enrollment";

import { Router } from "express";

const router = Router();
// router.post("/create-course", createCourse);


router.post("/", enrollInCourse);
// router.get("/:id", getCourse);
// router.post("/", checkAccessToken, createCourse);
// router.put("/:id", updateCourse);
// router.put("/:id/status", toggleCourseStatus);
// router.delete("/:id", deleteCourse);


export default router;
