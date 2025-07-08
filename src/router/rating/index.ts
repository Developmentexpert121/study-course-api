import { createRating } from "../../controllers/rating";
import { Router } from "express";

const router = Router();
router.post("/", createRating);

export default router;
