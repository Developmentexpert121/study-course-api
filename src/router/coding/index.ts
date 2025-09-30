import { Router } from "express";
import { authenticate, authorizeAdmin } from "../../middleware/auth";
import {
  createCodingQuestion,
  updateCodingQuestion,
  toggleCodingQuestionStatus,
  deleteCodingQuestion,
  submitCodingQuestion,
  getUserCodingSubmissions,
  getUserBestCodingSubmission,
  getCodingQuestionStats,
  updateCodingQuestionStatus,
  getAllCodingQuestions,
  getCodingQuestionById,
  getCodingQuestionForUser,
} from "../../controllers/coding";

const router = Router();

// Public routes

                   
router.post("/submit", submitCodingQuestion);
router.get("/submissions", getUserCodingSubmissions);
router.get("/submissions/best", getUserBestCodingSubmission);
router.get("/stats", getCodingQuestionStats);
router.get("/code-question/:id", getCodingQuestionForUser);




router.get('/code-question', getAllCodingQuestions);
router.get('/code/:id', getCodingQuestionById); 

router.put("/:id/status", updateCodingQuestionStatus);
// Admin routes with authentication

router.post("/createquestion/code", (req, res, next) => {
     console.log("Route hit:", req.path);
     next();
   }, authenticate, authorizeAdmin, createCodingQuestion);
router.put("/:id", authenticate, authorizeAdmin, updateCodingQuestion);
router.patch("/:id/status", authenticate, authorizeAdmin, toggleCodingQuestionStatus);
router.delete("/:id", authenticate, authorizeAdmin, deleteCodingQuestion);

export default router;