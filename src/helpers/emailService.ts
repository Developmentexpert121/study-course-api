// helpers/emailService.ts
import { sendEmail } from "../provider/send-mail";
import Certificate from "../models/certificate.model";
import User from "../models/user.model";
import Course from "../models/course.model";
import fs from "fs-extra";
import path from "path";

interface CertificateEmailData {
    user: any;
    course: any;
    certificate: any;
    platformName?: string;
    downloadLink?: string;
    verifyLink?: string;
}

interface SendCertificateEmailOptions {
    user_id?: number;
    course_id?: number;
    certificate_id?: number;
    certificate?: any;
    user?: any;
    course?: any;
}

export const sendCertificateEmail = async (data: CertificateEmailData | SendCertificateEmailOptions): Promise<boolean> => {
    let tempFilePath = '';

    try {
        let user: any, course: any, certificate: any;

        // Handle different input formats
        if ('certificate' in data && 'user' in data && 'course' in data) {
            // Direct data provided
            ({ user, course, certificate } = data as CertificateEmailData);
        } else {
            // Fetch data from database
            const options = data as SendCertificateEmailOptions;

            if (options.certificate_id) {
                certificate = await Certificate.findByPk(options.certificate_id, {
                    include: [
                        {
                            model: User,
                            as: 'certificate_user'
                        },
                        {
                            model: Course,
                            as: 'certificate_course'
                        }
                    ]
                });

                if (!certificate) {
                    throw new Error('Certificate not found');
                }

                user = certificate.certificate_user;
                course = certificate.certificate_course;
            } else if (options.user_id && options.course_id) {
                user = await User.findByPk(options.user_id);
                course = await Course.findByPk(options.course_id);

                if (!user || !course) {
                    throw new Error('User or course not found');
                }

                certificate = await Certificate.findOne({
                    where: {
                        user_id: options.user_id,
                        course_id: options.course_id
                    }
                });

                if (!certificate) {
                    throw new Error('Certificate not found for this user and course');
                }
            } else {
                throw new Error('Invalid parameters provided');
            }
        }

        // Validate certificate status
        if (certificate.status !== 'issued') {
            throw new Error('Cannot send email for revoked certificate');
        }

        // Prepare email content with beautiful template
        const platformName = process.env.PLATFORM_NAME || 'Learning Platform';
        const userName = user.firstName || user.username || user.name || 'Learner';
        const courseTitle = course.title;
        const certificateCode = certificate.certificate_code;
        const downloadLink = certificate.certificate_url;
        const verifyLink = `${process.env.FRONTEND_URL}/certificates/verify/${certificateCode}`;

        const issuedDate = new Date(certificate.issued_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Enhanced HTML email template
        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Certificate - ${courseTitle}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        
        .email-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
            position: relative;
        }
        
        .email-header::before {
            content: "🎉";
            font-size: 60px;
            position: absolute;
            top: 20px;
            right: 30px;
            opacity: 0.3;
        }
        
        .email-header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            font-weight: 700;
        }
        
        .email-header h2 {
            font-size: 1.3em;
            opacity: 0.9;
            font-weight: 300;
        }
        
        .email-content {
            padding: 40px 30px;
        }
        
        .greeting {
            font-size: 1.2em;
            margin-bottom: 25px;
            color: #555;
        }
        
        .congrats-message {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            border-left: 4px solid #667eea;
            margin-bottom: 30px;
        }
        
        .certificate-details {
            background: white;
            border: 2px solid #e9ecef;
            border-radius: 10px;
            padding: 25px;
            margin-bottom: 30px;
        }
        
        .detail-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
            padding-bottom: 12px;
            border-bottom: 1px solid #f1f3f4;
        }
        
        .detail-item:last-child {
            margin-bottom: 0;
            padding-bottom: 0;
            border-bottom: none;
        }
        
        .detail-label {
            font-weight: 600;
            color: #555;
        }
        
        .detail-value {
            color: #333;
            text-align: right;
        }
        
        .action-buttons {
            text-align: center;
            margin: 30px 0;
        }
        
        .btn {
            display: inline-block;
            padding: 15px 30px;
            margin: 10px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 1em;
            transition: all 0.3s ease;
            border: none;
            cursor: pointer;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        
        .btn-secondary {
            background: #6c757d;
            color: white;
        }
        
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(0,0,0,0.2);
        }
        
        .next-steps {
            background: #e8f5e8;
            padding: 20px;
            border-radius: 10px;
            margin: 30px 0;
        }
        
        .next-steps h3 {
            color: #2e7d32;
            margin-bottom: 15px;
        }
        
        .next-steps ul {
            list-style: none;
        }
        
        .next-steps li {
            padding: 8px 0;
            position: relative;
            padding-left: 25px;
        }
        
        .next-steps li::before {
            content: "✓";
            position: absolute;
            left: 0;
            color: #2e7d32;
            font-weight: bold;
        }
        
        .email-footer {
            text-align: center;
            padding: 30px;
            background: #f8f9fa;
            color: #666;
            border-top: 1px solid #e9ecef;
        }
        
        .platform-name {
            font-weight: bold;
            color: #667eea;
        }
        
        .support-link {
            color: #667eea;
            text-decoration: none;
        }
        
        @media (max-width: 600px) {
            .email-header {
                padding: 30px 20px;
            }
            
            .email-header h1 {
                font-size: 2em;
            }
            
            .email-content {
                padding: 30px 20px;
            }
            
            .btn {
                display: block;
                margin: 10px 0;
            }
            
            .detail-item {
                flex-direction: column;
                text-align: left;
            }
            
            .detail-value {
                text-align: left;
                margin-top: 5px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            <h1>Congratulations!</h1>
            <h2>You've Earned a Certificate</h2>
        </div>
        
        <div class="email-content">
            <div class="greeting">
                Dear <strong>${userName}</strong>,
            </div>
            
            <div class="congrats-message">
                <p>🎊 <strong>Amazing achievement!</strong> You have successfully completed the course:</p>
                <h3 style="color: #667eea; margin: 10px 0;">"${courseTitle}"</h3>
                <p>Your dedication and hard work have paid off. This certificate validates your newly acquired skills and knowledge.</p>
            </div>
            
            <div class="certificate-details">
                <h4 style="color: #333; margin-bottom: 20px; text-align: center;">📋 Certificate Details</h4>
                
                <div class="detail-item">
                    <span class="detail-label">Certificate ID:</span>
                    <span class="detail-value"><strong>${certificateCode}</strong></span>
                </div>
                
                <div class="detail-item">
                    <span class="detail-label">Course Completed:</span>
                    <span class="detail-value">${courseTitle}</span>
                </div>
                
                <div class="detail-item">
                    <span class="detail-label">Completion Date:</span>
                    <span class="detail-value">${issuedDate}</span>
                </div>
                
                <div class="detail-item">
                    <span class="detail-label">Issued By:</span>
                    <span class="detail-value"><span class="platform-name">${platformName}</span></span>
                </div>
            </div>
            
            <div class="action-buttons">
                <a href="${downloadLink}" class="btn btn-primary" style="color: #667eea;" target="_blank">
                    📥 Download Certificate (PDF)
                </a>
                <br>
                <a href="${verifyLink}" class="btn btn-secondary" target="_blank">
                    🔗 Verify Certificate Online
                </a>
            </div>
            
            <div class="next-steps">
                <h3>🚀 What's Next?</h3>
                <ul>
                    <li>Add this certificate to your LinkedIn profile</li>
                    <li>Include it in your resume and portfolio</li>
                    <li>Share your achievement on social media</li>
                    <li>Continue your learning journey with our other courses</li>
                    <li>Update your professional profiles with your new skills</li>
                </ul>
            </div>
            
            <div style="text-align: center; margin: 25px 0;">
                <p style="color: #666; font-style: italic;">
                    "The capacity to learn is a gift; the ability to learn is a skill; the willingness to learn is a choice." 
                    - Brian Herbert
                </p>
            </div>
        </div>
        
        <div class="email-footer">
            <p>Best regards,<br>
            <strong>The <span class="platform-name">${platformName}</span> Team</strong></p>
            
            <p style="margin-top: 15px; font-size: 0.9em;">
                Need help or have questions?<br>
                Contact our support team: 
                <a href="mailto:support@${process.env.EMAIL_DOMAIN || 'yourapp.com'}" class="support-link">
                    support@${process.env.EMAIL_DOMAIN || 'yourapp.com'}
                </a>
            </p>
            
            <p style="margin-top: 20px; font-size: 0.8em; color: #999;">
                &copy; ${new Date().getFullYear()} ${platformName}. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
    `;

        // Prepare attachments - Download PDF from Cloudinary to ensure it's valid
        let attachments = [];
        try {
            console.log('📎 Downloading PDF from Cloudinary for email attachment...');

            const response = await fetch(certificate.certificate_url);
            if (!response.ok) {
                throw new Error(`Failed to download PDF: HTTP ${response.status}`);
            }

            const pdfBuffer = await response.arrayBuffer();

            // Verify it's a PDF by checking magic number
            const uint8Array = new Uint8Array(pdfBuffer);
            const isPDF = uint8Array.length > 4 &&
                uint8Array[0] === 0x25 && // %
                uint8Array[1] === 0x50 && // P
                uint8Array[2] === 0x44 && // D
                uint8Array[3] === 0x46;   // F

            if (!isPDF) {
                console.warn('⚠️ Downloaded file is not a valid PDF, checking file signature:',
                    Array.from(uint8Array.slice(0, 4)).map(b => b.toString(16)).join(' '));

                // Fallback: Create a simple PDF or skip attachment
                console.log('🔄 Skipping PDF attachment due to invalid file');
            } else {
                console.log('✅ PDF verified, preparing attachment');

                // Save to temporary file for email attachment
                tempFilePath = path.join(__dirname, '../../tmp', `email_${certificateCode}_${Date.now()}.pdf`);
                await fs.ensureDir(path.dirname(tempFilePath));
                await fs.writeFile(tempFilePath, Buffer.from(pdfBuffer));

                attachments = [
                    {
                        filename: `Certificate_${certificateCode}.pdf`,
                        path: tempFilePath,
                        contentType: 'application/pdf'
                    }
                ];
            }
        } catch (attachmentError) {
            console.error('❌ Failed to prepare PDF attachment:', attachmentError);
            // Continue without attachment rather than failing the entire email
        }

        // Send email using your existing sendEmail function
        console.log('📤 Sending certificate email...');
        const emailSent = await sendEmail(
            emailHtml,
            user.email,
            `🎉 Your Certificate for "${courseTitle}" - ${platformName}`,
            undefined,
            undefined,
            attachments
        );

        if (emailSent) {
            // Update certificate record with email tracking
            await Certificate.update(
                {
                    emailed_at: new Date(),
                    email_count: (certificate.email_count || 0) + 1
                },
                {
                    where: { id: certificate.id }
                }
            );

            console.log(`✅ Certificate email sent to ${user.email} for course "${courseTitle}"`);
            return true;
        } else {
            console.error(`❌ Failed to send certificate email to ${user.email}`);
            return false;
        }

    } catch (error) {
        console.error('Error in sendCertificateEmail:', error);
        return false;
    } finally {
        // Clean up temporary file
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            try {
                await fs.unlink(tempFilePath);
                console.log('✅ Temporary email file cleaned up');
            } catch (cleanupError) {
                console.warn('⚠️ Error cleaning up temporary file:', cleanupError);
            }
        }
    }
};

/**
 * Bulk send certificate emails
 */
export const sendBulkCertificateEmails = async (certificateIds: number[]): Promise<{
    successful: number;
    failed: number;
    details: Array<{ certificateId: number; success: boolean; error?: string }>;
}> => {
    const results = {
        successful: 0,
        failed: 0,
        details: [] as Array<{ certificateId: number; success: boolean; error?: string }>
    };

    for (const certificateId of certificateIds) {
        try {
            const success = await sendCertificateEmail({ certificate_id: certificateId });

            if (success) {
                results.successful++;
                results.details.push({ certificateId, success: true });
            } else {
                results.failed++;
                results.details.push({ certificateId, success: false, error: 'Email sending failed' });
            }
        } catch (error) {
            results.failed++;
            results.details.push({
                certificateId,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }

        // Small delay to avoid overwhelming the email server
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results;
};

/**
 * Send certificate revoked email
 */
export const sendCertificateRevokedEmail = async (certificateId: number, reason: string): Promise<boolean> => {
    try {
        const certificate = await Certificate.findByPk(certificateId, {
            include: [
                { model: User, as: 'user' },
                { model: Course, as: 'course' }
            ]
        });

        if (!certificate) {
            throw new Error('Certificate not found');
        }

        const user = certificate.user;
        const course = certificate.course;
        const platformName = process.env.PLATFORM_NAME || 'Learning Platform';

        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #ff6b6b; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚠️ Certificate Update</h1>
        </div>
        <div class="content">
            <p>Dear ${user.firstName || user.username},</p>
            
            <div class="warning">
                <h3>Important Notice</h3>
                <p>Your certificate for the course <strong>"${course.title}"</strong> has been revoked.</p>
            </div>
            
            <p><strong>Reason:</strong> ${reason}</p>
            <p><strong>Certificate ID:</strong> ${certificate.certificate_code}</p>
            <p><strong>Revocation Date:</strong> ${new Date().toLocaleDateString()}</p>
            
            <p>If you believe this is an error, please contact our support team for assistance.</p>
            
            <div class="footer">
                <p>Best regards,<br>The ${platformName} Team</p>
            </div>
        </div>
    </div>
</body>
</html>
    `;

        const emailSent = await sendEmail(
            emailHtml,
            user.email,
            `⚠️ Certificate Update for "${course.title}"`,
            undefined,
            undefined
        );

        return emailSent;

    } catch (error) {
        console.error('Error in sendCertificateRevokedEmail:', error);
        return false;
    }
};