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
} from "../../controllers/mcq/index";

const router = Router();

// Public (user)
router.get("/", getMcqs);
router.get("/:id", getMcqById);
router.get("/course/:course_id/", getMcqsByCourseId);


// Admin protected
router.post("/create-mcq", createMcq);
router.post("/sumbit", submitMcqAndUnlockNext);
router.post("/sumbitmcq", submitMcqAnswers);
router.put("/:id", updateMcq);
router.put("/:id/status", toggleMcqStatus);
router.delete("/:id", deleteMcq);

export default router;
