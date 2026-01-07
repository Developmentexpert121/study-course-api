import Email from '../../models/Email.mdoel';

import {
sendWelcomeEmail,generateEmailTemplate ,sendEmail
} from "../../provider/send-mail";



export const getAllEmails = async (req, res) => {
  try {
    const emails = await Email.findAll({
      attributes: ['id', 'email', 'EmailId', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      data: emails
    });

  } catch (error) {
    console.error('Error fetching emails:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};



export const sendBulkEmailBatch = async (req, res) => {
  try {
    const { subject, message, htmlContent, batchSize = 10 } = req.body;

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Subject and message are required'
      });
    }

    const subscribers = await Email.findAll({
      attributes: ['id', 'email']
    });

    if (!subscribers || subscribers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No email subscribers found'
      });
    }

    const emailHtml = htmlContent || generateEmailTemplate(subject, message);

    const results = {
      total: subscribers.length,
      successful: 0,
      failed: 0,
      failedEmails: []
    };

    // Process in batches
    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (subscriber) => {
        try {
          const emailSent = await sendEmail(
            emailHtml,
            subscriber.email,
            subject
          );

          if (emailSent) {
            results.successful++;
            return { success: true, email: subscriber.email };
          } else {
            results.failed++;
            results.failedEmails.push(subscriber.email);
            return { success: false, email: subscriber.email };
          }
        } catch (error) {
          results.failed++;
          results.failedEmails.push(subscriber.email);
          return { success: false, email: subscriber.email, error: error.message };
        }
      });

      // Wait for current batch to complete
      await Promise.all(batchPromises);
      
      // Delay between batches
      if (i + batchSize < subscribers.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return res.status(200).json({
      success: true,
      message: `Bulk email sending completed. ${results.successful} successful, ${results.failed} failed.`,
      data: results
    });

  } catch (error) {
    console.error('Error in sendBulkEmailBatch:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};
