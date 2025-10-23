import { Router } from "express";
import { authenticate, authorizeAdmin } from "../../middleware/auth";
import { createChapter, deleteChapter, getAllChaptersSimple, editChapter, getAllChapters, getChapterById, getChaptersByCourseIdPaginated, getChaptersByCourseId, getNextChapter, getChapterNavigation, getChaptersByCourseIdSimple } from "../../controllers/chapters";

const router = Router();

// ✅ Put specific routes FIRST
router.get('/course', getChaptersByCourseIdPaginated);
router.get('/next', getNextChapter);
router.get('/allchapters', getAllChaptersSimple);
router.get('/navigation/chapter-navigation', getChapterNavigation);

// ✅ Then put parameterized routes LAST
router.get("/:id", getChapterById);

// Other routes
router.get("/", getChaptersByCourseId);
router.get("/get-all-chapters", getAllChapters);

router.post("/", authenticate, authorizeAdmin, createChapter);
router.delete("/:id", authenticate, authorizeAdmin, deleteChapter);
router.put("/:id", editChapter);

export default router;