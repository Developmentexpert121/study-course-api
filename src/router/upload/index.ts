import { Router } from "express";
import upload from "../../util/upload";
import { getUserProfileImage, updateProfileImage, uploadFile } from "../../controllers/upload/index";

const router = Router();

// POST /upload (single file)
router.post("/", upload.single("file"), uploadFile);
router.post("/update-profile-image", upload.single("file"), updateProfileImage);
router.get("/:userId", getUserProfileImage);

export default router;