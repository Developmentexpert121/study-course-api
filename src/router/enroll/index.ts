
import { Router } from 'express';
import { enrollInCourse, getMyEnrolledCourses, getStatusEnrolled, unenrollFromCourse ,updateEnrollmentBatch} from "../../controllers/enrollment";

const router = Router();

router.post('/', enrollInCourse);
router.get('/', getMyEnrolledCourses);
router.get('/course/status', getStatusEnrolled);
router.delete('/course/unenroll', unenrollFromCourse);
router.put('/:enrollmentId/batch', updateEnrollmentBatch);


export default router;