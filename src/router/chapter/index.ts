import { Router } from "express";
import { authenticate, authorizeAdmin } from "../../middleware/auth";
import {createChapter,deleteChapter,getAllChaptersSimple,editChapter,getAllChapters,getChapterById,getChaptersByCourseIdPaginated,getChaptersByCourseId, getNextChapter,getChapterNavigation ,
    createModule,
  getAllModules,
  getModuleById,
  editModule,
  deleteModule,
  getModulesByCourseId,
  addChaptersToModule,
  removeChaptersFromModule,


} from "../../controllers/chapters";

const router = Router();
router.get("/", getChaptersByCourseId);
router.get("/get-all-chapters", getAllChapters);
router.get('/next', getNextChapter);
router.get('/allchapters', getAllChaptersSimple);

router.get('/navigation/chapter-navigation', getChapterNavigation);
router.get('/course', getChaptersByCourseIdPaginated);
router.get("/:id", getChapterById);
// In your routes file



router.post("/",authenticate, authorizeAdmin ,createChapter);
router.delete("/:id", authenticate, authorizeAdmin,deleteChapter);
router.put("/:id", editChapter);






router.post("/module-chapter", createModule);
router.get("/", getAllModules);
router.get("/course", getModulesByCourseId);
router.get("/:id", getModuleById);
router.put("/:id", editModule);
router.delete("/:id", deleteModule);
router.patch("/:id/chapters/add", addChaptersToModule);
router.patch("/:id/chapters/remove", removeChaptersFromModule);

export default router;
