import { Router } from "express";
import { createUser, loginUser, forgotPassword, resetPassword, verifyUser, getAllUsers, getUserStats } from "../../controllers/users/index";

const router = Router();
router.post("/signup", createUser);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/verify", verifyUser);
router.get("/", getAllUsers);
router.get("/stats", getUserStats);


export default router;
