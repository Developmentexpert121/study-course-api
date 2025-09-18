import { Router } from "express";
import { authenticate, authorizeAdmin } from "../../middleware/auth";
import {createChapter,deleteChapter,getAllChaptersSimple,editChapter,getAllChapters,getChapterById,getChaptersByCourseId, getNextChapter,getChapterNavigation} from "../../controllers/chapters";

const router = Router();

router.get("/", getChaptersByCourseId);
router.get("/get-all-chapters", getAllChapters);
router.get('/next', getNextChapter);
router.get('/allchapters', getAllChaptersSimple);

router.get('/navigation/chapter-navigation', getChapterNavigation);
router.get("/:id", getChapterById);



router.post("/",authenticate, authorizeAdmin ,createChapter);
router.delete("/:id", authenticate, authorizeAdmin,deleteChapter);
router.put("/:id", editChapter);

export default router;
