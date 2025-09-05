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
} from "../../controllers/mcq/index";
import { authenticate, authorizeAdmin } from "../../middleware/auth";

const router = Router();
router.get("/", getMcqs);
router.get("/:id", getMcqById);
router.post("/sumbitmcq", submitMcqAnswers);
router.post("/sumbit", submitMcqAndUnlockNext);
router.get("/course/:course_id/", getMcqsByCourseId);
router.get("/student/chapter/:chapter_id", getStudentMcqsByChapterId);


router.post("/create-mcq", authenticate, authorizeAdmin,createMcq);
router.put("/:id",authenticate, authorizeAdmin, updateMcq);
router.put("/:id/status", authenticate, authorizeAdmin,toggleMcqStatus);
router.delete("/:id",authenticate, authorizeAdmin, deleteMcq);

export default router;
