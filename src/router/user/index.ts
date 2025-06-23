import { Router } from "express";
import { createUser, loginUser, forgotPassword, resetPassword, verifyUser } from "../../controllers/users/index";

const router = Router();
router.post("/signup", createUser);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/verify", verifyUser);

export default router;
