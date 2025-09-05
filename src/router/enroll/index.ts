// import { enrollInCourse } from "../../controllers/enrollment";

// import { Router } from "express";

// const router = Router();
// router.post("/", enrollInCourse);

// export default router;
import { Router } from 'express';
import { enrollInCourse, getMyEnrolledCourses,getStatusEnrolled ,unenrollFromCourse} from "../../controllers/enrollment";

const router = Router();

router.post('/', enrollInCourse);
router.get('/', getMyEnrolledCourses);
router.get('/course/status', getStatusEnrolled);
router.delete('/course/unenroll', unenrollFromCourse);


export default router;