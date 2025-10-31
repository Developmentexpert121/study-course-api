// routes/emailRoutes.js
import express from 'express';
import { storeEmail, getAllEmails ,sendBulkEmailBatch

 } from '../../controllers/email';

const router = express.Router();

// Store new email
router.post('/emails', storeEmail);

// Get all emails
router.get('/emails', getAllEmails);




// Send email to all subscribers with batch processing
router.post('/emails/bulk-send-batch', sendBulkEmailBatch);



export default router;