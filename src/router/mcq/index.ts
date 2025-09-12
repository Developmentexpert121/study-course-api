import { Router } from "express";
import {
  createMcq,
  updateMcq,
  toggleMcqStatus,
  deleteMcq,
  getMcqs,
  getMcqById,
  getMcqsByCourseId,
  submitMcqAndUnlockNext,
  submitMcqAnswers,
  getStudentMcqsByChapterId,
  submitAllMcqAnswers,
  getUserMcqSubmissions,
  getUserBestSubmission,
  getChapterStats,
  getStudentMcqsWithPrevious,
  getUserCourseMcqStatus,
} from "../../controllers/mcq/index";
import { authenticate, authorizeAdmin } from "../../middleware/auth";

const router = Router();
router.get("/", getMcqs);

router.post("/sumbitmcq", submitMcqAnswers);
router.post("/sumbit", submitMcqAndUnlockNext);

router.get("/course-chapters-status", getUserCourseMcqStatus);
router.get("/course/:course_id/", getMcqsByCourseId);
router.get("/student/chapter/:chapter_id", getStudentMcqsByChapterId);

router.post("/submit-all", submitAllMcqAnswers);
router.get("/submissions", getUserMcqSubmissions);
router.get("/best-submission", getUserBestSubmission);
router.get("/chapter-stats", getChapterStats);

router.get("/getStudentMcqsWithPrevious",getStudentMcqsWithPrevious);

router.get("/:id", getMcqById);
router.post("/create-mcq", authenticate, authorizeAdmin,createMcq);
router.put("/:id",authenticate, authorizeAdmin, updateMcq);
router.put("/:id/status", authenticate, authorizeAdmin,toggleMcqStatus);
router.delete("/:id",authenticate, authorizeAdmin, deleteMcq);

export default router;
