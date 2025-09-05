// import { enrollInCourse } from "../../controllers/enrollment";

// import { Router } from "express";

// const router = Router();
// router.post("/", enrollInCourse);

// export default router;
import { Router } from 'express';
import { enrollInCourse, getMyEnrolledCourses,getStatusEnrolled } from "../../controllers/enrollment";

const router = Router();

router.post('/', enrollInCourse);
router.get('/', getMyEnrolledCourses);
router.get('/course/status', getStatusEnrolled);


export default router;