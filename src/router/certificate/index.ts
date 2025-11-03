// routes/certificate.routes.ts
import express from 'express';
import { authenticate, authorize } from '../../middleware/auth'; // Fixed import path
import { downloadCertificate, getAllCertificates, getCertificateStats, getUserCertificates, manuallyCreateCertificate, verifyCertificate } from '../../controllers/certificate';
// Fixed import path

const router = express.Router();

// User routes
router.get('/user/:user_id', authenticate, getUserCertificates);
router.get('/verify/:code', verifyCertificate);
router.post('/:id/download', authenticate, downloadCertificate);

// Super Admin routes - using the new authorize function
router.get('/admin/all', authenticate, authorize(['superadmin', 'Super-Admin']), getAllCertificates);
router.get('/admin/stats', authenticate, authorize(['superadmin', 'Super-Admin']), getCertificateStats);
router.post('/admin/create', authenticate, authorize(['superadmin', 'Super-Admin']), manuallyCreateCertificate);

export default router;