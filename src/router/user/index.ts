import { Router } from "express";
import { createUser, loginUser, forgotPassword, resetPassword, verifyUser, getAllUsers, getUserStats, refreshToken } from "../../controllers/users/index";
import { authenticate, authorizeAdmin } from "../../middleware/auth";

const router = Router();
router.post("/signup", createUser);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/verify", verifyUser);
router.get("/", authenticate, authorizeAdmin,getAllUsers);
router.get("/stats", authenticate, authorizeAdmin,getUserStats);
router.post('/refresh-token', refreshToken);


export default router;
