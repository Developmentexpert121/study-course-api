// router/user/index.ts
import { Router } from "express";
import { 
  createUser, 
  loginUser, 
  forgotPassword, 
  resetPassword, 
  verifyUser, 
  getAllUsers, 
  getUserStats, 
  refreshToken, 
  getDashboardSummary, 
  getAllUsersWithProgress, 
  getUserDetails ,
    getAllAdmins, 
  approveAdmin, 
  rejectAdmin,
  trackLogoutActivity,
  getAllAdminActivities,
} from "../../controllers/users/index";
import { authenticate, authorizeAdmin } from "../../middleware/auth";
import { requireSuperAdmin } from "../../middleware/superAdminAuth";
const router = Router();

// Super Admin Routes
router.get('/admins', requireSuperAdmin, getAllAdmins);
router.put("/admins/:id/approve", requireSuperAdmin, approveAdmin);      
router.patch("/admins/:id/reject", requireSuperAdmin, rejectAdmin);





router.get('/getlogs',requireSuperAdmin, getAllAdminActivities);


// Public Auth Routes
router.post("/signup", createUser);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/verify", verifyUser);
router.post('/refresh-token', refreshToken);

router.post('/logout', trackLogoutActivity);

// Admin Routes (Regular Admin)
router.get("/", authenticate, authorizeAdmin, getAllUsers);
router.get("/stats", authenticate, authorizeAdmin, getUserStats);
router.get("/summary", authenticate, authorizeAdmin, getDashboardSummary);
router.get("/get-all-details", authenticate, authorizeAdmin, getAllUsersWithProgress);
router.get("/details/:id", authenticate, authorizeAdmin, getUserDetails);






export default router;