
import { Router } from 'express';
import { enrollInCourse, getMyEnrolledCourses, getStatusEnrolled, unenrollFromCourse ,updateEnrollmentBatch,getUserCourses} from "../../controllers/enrollment";

const router = Router();

router.post('/', enrollInCourse);
router.get('/user/:userId/courses',getUserCourses);
router.get('/', getMyEnrolledCourses);
router.get('/course/status', getStatusEnrolled);
router.delete('/course/unenroll', unenrollFromCourse);
router.put('/:enrollmentId/batch', updateEnrollmentBatch);


export default router;