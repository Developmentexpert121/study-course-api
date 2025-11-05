// routes/certificate.routes.ts
import express from 'express';
import { authenticate, authorize, authorizeAdmin } from '../../middleware/auth';
import {
    bulkCertificateActions,
    downloadCertificate,
    generateCertificateForUser,
    getAllCertificates,
    getCertificateStats,
    getCourseEnrolledUsersWithProgress,
    getUserCertificates,
    manuallyCreateCertificate,
    reinstateCertificate,
    revokeCertificate,
    sendCertificateEmailToUser,
    verifyCertificate
} from '../../controllers/certificate';

const router = express.Router();

// Admin panel routes
router.get("/admin/courses/:courseId/enrolled-users", authenticate, authorizeAdmin, getCourseEnrolledUsersWithProgress);
router.post("/admin/courses/:courseId/users/:userId/generate-certificate", authenticate, authorizeAdmin, generateCertificateForUser);
router.post("/admin/certificates/:certificateId/send-email", authenticate, authorizeAdmin, sendCertificateEmailToUser);
router.post("/admin/certificates/:certificateId/revoke", authenticate, authorizeAdmin, revokeCertificate);
router.post("/admin/certificates/:certificateId/reinstate", authenticate, authorizeAdmin, reinstateCertificate);
router.post("/admin/certificates/bulk-actions", authenticate, authorizeAdmin, bulkCertificateActions);

// User routes
router.get('/user/:user_id', authenticate, getUserCertificates);
router.get('/verify/:code', verifyCertificate);
router.post('/:id/download', authenticate, downloadCertificate);

// Super Admin routes
router.get('/admin/all', authenticate, authorize(['superadmin', 'Super-Admin']), getAllCertificates);
router.get('/admin/stats', authenticate, authorize(['superadmin', 'Super-Admin']), getCertificateStats);
router.get('/stats/overview', authenticate, authorizeAdmin, getCertificateStats); // ADD THIS LINE
router.post('/admin/create', authenticate, authorize(['superadmin', 'Super-Admin']), manuallyCreateCertificate);

export default router;