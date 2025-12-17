// routes/users.ts
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
  getUserDetails,
  getAllAdmins,
  approveAdmin,
  rejectAdmin,
  trackLogoutActivity,
  getAllAdminActivities,
  getCurrentUser,
  getAllUsersforadmin,
  verifyResetToken,
  getCoursesByUser,
  getCourseById,
  getChaptersByCourseId,
  deactivateUser,
  activateUser,
  getUserById,
  getDashboardStatsOptimized,
  getCourseAuditLogs,
  updateUserProfile,
  getInstructorDashboardStatsOptimized,
  getAdminCourseStats,
  createUserByAdmin,
} from "../../controllers/users/index";
import { authenticate, authorizeAdmin, authorize } from "../../middleware/auth";
import { requireSuperAdmin } from "../../middleware/superAdminAuth";
import upload from "../../util/upload";
import { checkPermission } from "../../middleware/permissionsAuth";

const router = Router();

// Public routes
router.post("/signup", createUser);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/verify", verifyUser);
router.post('/refresh-token', refreshToken);
router.post('/verify-reset-token', verifyResetToken);
router.post('/logout', trackLogoutActivity);

// ==================== SUPER ADMIN ONLY ROUTES ====================
router.get('/admins', requireSuperAdmin, getAllAdmins);
router.put("/admins/:id/approve", requireSuperAdmin, approveAdmin);
router.patch("/admins/:id/reject", requireSuperAdmin, rejectAdmin);
router.get("/get-all-details-admin", requireSuperAdmin, getAllUsersforadmin);
router.get('/dashboard-stats', checkPermission('dashboard'), getDashboardStatsOptimized);
router.post("/create", requireSuperAdmin, createUserByAdmin);

// ==================== ADMIN ROUTES (Admin & Super-Admin) ====================
router.get("/", authenticate, authorize(['Teacher', 'Super-Admin']), getAllUsers);
// router.get("/stats", authenticate, authorize(['Admin', 'Super-Admin']), getUserStats);
router.get("/stats", authenticate, checkPermission('analytics_view'), getUserStats);

router.get("/summary", authenticate, authorize(['Teacher', 'Super-Admin']), getDashboardSummary);
router.get("/get-all-details", authenticate, authorize(['Teacher', 'Super-Admin']), getAllUsersWithProgress);
router.get("/details/:id", authenticate, authorize(['Teacher', 'Super-Admin']), getUserDetails);
router.get('/getlogs', authenticate, authorize(['Teacher', 'Super-Admin']), getAllAdminActivities);
// router.get('/dashboard-stats/admin', authenticate, authorize(['Admin', 'Super-Admin']), getInstructorDashboardStatsOptimized);
// router.get('/getCourseAuditLogs', authenticate, authorize(['Admin', 'Super-Admin']), getCourseAuditLogs);
router.get('/admin/:adminId', authenticate, authorize(['Teacher', 'Super-Admin']), getAdminCourseStats);
router.get('/getCourseAuditLogs', authenticate, checkPermission('dashboard'), getCourseAuditLogs);
router.get('/dashboard-stats/admin', authenticate, checkPermission('dashboard'), getInstructorDashboardStatsOptimized);

// ==================== USER MANAGEMENT ROUTES ====================
router.post('/deactivate', authenticate, authorize(['Teacher', 'Super-Admin']), deactivateUser);
router.post('/activateUser', authenticate, authorize(['Teacher', 'Super-Admin']), activateUser);
router.get('/:userId/getinfo', authenticate, authorize(['Teacher', 'Super-Admin']), getUserById);
router.get('/:userId/courses', authenticate, authorize(['Teacher', 'Super-Admin']), getCoursesByUser);

// ==================== COURSE ROUTES ====================
router.get('/courses/:id', authenticate, getCourseById);
router.get('/chapters/course/:courseId', authenticate, getChaptersByCourseId);

// ==================== PROFILE ROUTES ====================
router.get('/me', authenticate, getCurrentUser);
router.put('/:userId/profile', authenticate, upload.single('profileImage'), updateUserProfile);

export default router;