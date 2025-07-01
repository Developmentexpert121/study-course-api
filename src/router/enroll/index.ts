import { enrollInCourse } from "../../controllers/enrollment";

import { Router } from "express";

const router = Router();
router.post("/", enrollInCourse);

export default router;
