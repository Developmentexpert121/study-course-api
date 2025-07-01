import { Router } from "express";
import { authenticate, authorizeAdmin } from "../../middleware/auth";
import {createChapter,deleteChapter,getAllChapters,getChaptersByCourseId, } from "../../controllers/chapters";

const router = Router();

router.get("/", getChaptersByCourseId);
router.get("/get-all-chapters", getAllChapters);


router.post("/",authenticate, authorizeAdmin ,createChapter);
router.delete("/:id", authenticate, authorizeAdmin,deleteChapter);

export default router;
