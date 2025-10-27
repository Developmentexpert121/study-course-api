// routes/lesson.routes.ts
import { createLesson, deleteLesson, getAllLessons, getChapterLessonsWithProgress, getLessonById, getLessonNavigation, getLessonsByChapterId, getLessonsByChapterIdPaginated, getNextLesson, toggleLessonStatus, updateLesson } from "../../controllers/lessons";
import { Router } from "express";


const router = Router();

router.post("/", createLesson);
router.get("/", getAllLessons);
router.get("/:id", getLessonById);
router.put("/:id", updateLesson);
router.delete("/:id", deleteLesson);
router.patch("/:id/toggle-status", toggleLessonStatus);
router.get("/chapter/lessons", getLessonsByChapterId);
router.get("/chapter/lessons/paginated", getLessonsByChapterIdPaginated);
router.post("/progress/:courseId/lessons/:lessonId/complete", getLessonsByChapterIdPaginated);

router.get("/navigation/next", getNextLesson);
router.get("/navigation/detailed", getLessonNavigation);
router.get("/progress/chapter", getChapterLessonsWithProgress);

export default router;