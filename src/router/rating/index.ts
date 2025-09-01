import { createRating, deleteRating } from "../../controllers/rating";
import { Router } from "express";

const router = Router();
router.post("/", createRating);
router.delete("/delete/:id",deleteRating);

export default router;
