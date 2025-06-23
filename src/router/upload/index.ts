import { Router } from "express";
import upload from "../../util/upload";
import { uploadFile } from "../../controllers/upload/index";

const router = Router();

// POST /upload (single file)
router.post("/", upload.single("file"), uploadFile);

export default router;