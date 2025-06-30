import { Router } from "express";
import {
  createChapter,
  deleteChapter,
  getAllChapters,
  getChaptersByCourseId, // ✅ use updated function name
} from "../../controllers/chapters";

const router = Router();

router.post("/", createChapter);

// All chapters across all courses
router.get("/get-all-chapters", getAllChapters);

// Chapters for a course (use ?course_id=1)
router.get("/", getChaptersByCourseId); // ✅ now correct

router.delete("/:id", deleteChapter);

export default router;
