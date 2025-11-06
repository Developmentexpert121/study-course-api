import nodemailer from "nodemailer";
import Email from "../models/Email.mdoel";

// ✅ Create transporter with validation and better config
const createTransporter = () => {
  // Check if credentials exist
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.error('❌ EMAIL_USER or EMAIL_PASSWORD not set in environment variables!');
    console.log('📝 Please set these in your Render dashboard:');
    console.log('   - EMAIL_USER: your Gmail address');
    console.log('   - EMAIL_PASSWORD: your Gmail App Password (16 characters)');
    return null;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true, // SSL
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD, // Must be App Password!
      },
      // ✅ Increased timeouts for cloud platforms (Render/Vercel)
      connectionTimeout: 30000, // 30 seconds
      greetingTimeout: 30000,
      socketTimeout: 30000,
      // ✅ Connection pooling for better performance
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      // ✅ TLS security
      tls: {
        rejectUnauthorized: true,
        minVersion: 'TLSv1.2'
      }
    });

    return transporter;
  } catch (error) {
    console.error('❌ Failed to create email transporter:', error);
    return null;
  }
};

const transporter = createTransporter();

// ✅ Verify connection on startup with detailed logging
if (transporter) {
  transporter.verify((error, success) => {
    if (error) {
      console.error('❌ Email transporter verification failed!');
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.log('\n🔍 Troubleshooting:');
      console.log('1. EMAIL_USER set?', process.env.EMAIL_USER ? '✅' : '❌ MISSING!');
      console.log('2. EMAIL_PASSWORD set?', process.env.EMAIL_PASSWORD ? '✅' : '❌ MISSING!');
      console.log('3. Using Gmail App Password? (not regular password)');
      console.log('4. 2FA enabled on Gmail account?');
      
      if (error.code === 'EAUTH') {
        console.log('\n⚠️ AUTHENTICATION ERROR - Wrong email or password!');
        console.log('📝 Generate App Password: https://myaccount.google.com/apppasswords');
      } else if (error.code === 'ETIMEDOUT') {
        console.log('\n⚠️ CONNECTION TIMEOUT - Network/Firewall issue');
      } else if (error.code === 'ECONNECTION') {
        console.log('\n⚠️ CONNECTION REFUSED - Gmail may be blocking your server');
      }
    } else {
      console.log('✅ Email server ready!');
      console.log('📧 Sending from:', process.env.EMAIL_USER);
    }
  });
} else {
  console.error('❌ Email transporter NOT initialized - emails will fail!');
}

// ✅ Retry utility for production reliability
const sendEmailWithRetry = async (
  emailFunction: Function,
  ...args: any[]
): Promise<boolean> => {
  const MAX_RETRIES = 3;
  const BASE_DELAY = 2000; // 2 seconds

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`📧 Email attempt ${attempt}/${MAX_RETRIES}`);
      const result = await emailFunction(...args);

      if (result) {
        console.log(`✅ Email sent successfully on attempt ${attempt}`);
        return true;
      }

      // Wait before retry with exponential backoff
      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY * attempt;
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (error: any) {
      console.error(`❌ Attempt ${attempt} failed:`, error.message);
      
      if (attempt === MAX_RETRIES) {
        console.error('❌ All retry attempts exhausted!');
        return false;
      }
    }
  }

  return false;
};

// ✅ Base email sending function
const sendEmail = (
  html: string,
  email: string,
  subject: string,
  from?: string,
  cc?: string,
  attachments?: any[]
): Promise<boolean> => {
  return new Promise((resolve) => {
    if (!transporter) {
      console.error('❌ Email transporter not initialized - cannot send email!');
      resolve(false);
      return;
    }

    const message = {
      from: from || process.env.EMAIL_USER,
      to: email,
      subject: subject,
      html: html,
      cc: cc,
      attachments: attachments,
    };

    console.log(`📧 Sending email to: ${email}`);
    console.log(`📋 Subject: ${subject}`);

    transporter.sendMail(message, (err, info) => {
      if (err) {
        console.error("❌ Email send error:", err.message);
        console.error("Error code:", err.code);

        // Specific error messages
        if (err.code === 'EAUTH') {
          console.error('⚠️ Authentication failed - check Gmail App Password');
        } else if (err.code === 'ETIMEDOUT') {
          console.error('⚠️ Connection timeout - network issue');
        } else if (err.code === 'ECONNECTION') {
          console.error('⚠️ Connection refused - Gmail blocking');
        }

        resolve(false);
      } else {
        console.log("✅ Email sent successfully!");
        console.log("Message ID:", info.messageId);
        resolve(true);
      }
    });
  });
};

// ✅ FORGOT PASSWORD EMAIL
const sendForgotEmail = async (link: string, email: string): Promise<boolean> => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
    </head>
    <body>
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px;">
        <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; color: white;">
            <div style="font-size: 48px; margin-bottom: 15px;">🔐</div>
            <h1 style="margin: 0; font-size: 28px; font-weight: 700;">Password Reset</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Secure your account with a new password</p>
          </div>
          
          <div style="padding: 40px 30px;">
            <h2 style="color: #333; margin-top: 0; font-size: 22px;">Hello there!</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
              We received a request to reset your password. Click the button below to create a new secure password for your account.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${link}" style="display: inline-block; padding: 12px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
                Reset Your Password
              </a>
            </div>
            
            <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="color: #666; margin: 0 0 10px 0; font-size: 14px; font-weight: 500;">If the button doesn't work, copy this link:</p>
              <div style="background: white; border: 1px solid #e0e0e0; border-radius: 6px; padding: 12px; word-break: break-all; font-size: 12px; color: #667eea;">
                ${link}
              </div>
            </div>
          </div>
          
          <div style="background: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
            <p style="color: #666; margin: 0; font-size: 14px;">Stay secure! 🚀</p>
            <p style="color: #999; margin: 10px 0 0 0; font-size: 12px;">
              This is an automated message. Please do not reply to this email.<br>
              &copy; ${new Date().getFullYear()} Your Learning Platform. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmailWithRetry(sendEmail, html, email, "Reset Your Password");
};

// ✅ VERIFICATION EMAIL
const sendVerifyEmail = async (link: string, email: string): Promise<boolean> => {
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f7; padding: 30px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.05); overflow: hidden;">
        <div style="padding: 30px; text-align: center;">
          <h1 style="color: #111827;">Welcome to Our App 👋</h1>
          <p style="color: #6b7280; font-size: 16px;">Thanks for signing up! Please verify your email address to complete your registration.</p>
          <a href="${link}" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background-color: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px;">
            Verify Your Account
          </a>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">If you didn't request this email, you can safely ignore it.</p>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #9ca3af;">
          &copy; ${new Date().getFullYear()} Our App. All rights reserved.
        </div>
      </div>
    </div>
  `;

  return await sendEmailWithRetry(sendEmail, html, email, "Verify Your Account");
};

// ✅ APPROVAL EMAIL
const sendApprovalEmail = async (email: string, username: string): Promise<boolean> => {
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f7; padding: 30px;">
      <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; padding: 30px; color: white;">
        <div style="text-align: center; padding-bottom: 20px;">
          <div style="font-size: 48px; margin-bottom: 10px;">🎉</div>
          <h1 style="margin: 0; font-size: 28px;">Congratulations, ${username}!</h1>
          <p style="margin: 10px 0 0 0; font-size: 18px;">Your Admin Account Has Been Approved</p>
        </div>
        
        <div style="background: white; border-radius: 8px; padding: 30px; margin-top: 20px; color: #333;">
          <h2 style="color: #667eea; margin-top: 0;">Welcome to the Admin Team!</h2>
          
          <p>Great news! Your admin account application has been approved. You now have full access to manage the course platform.</p>
          
          <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">What You Can Do Now:</h3>
            
            <p style="padding: 10px 0; border-bottom: 1px solid #e0e0e0; margin: 0;">
              <span style="color: #667eea; margin-right: 10px;">📚</span>
              <strong>Create Courses:</strong> Build and publish engaging courses for students
            </p>
            
            <p style="padding: 10px 0; border-bottom: 1px solid #e0e0e0; margin: 0;">
              <span style="color: #667eea; margin-right: 10px;">👥</span>
              <strong>Manage Students:</strong> View student progress and enrollments
            </p>
            
            <p style="padding: 10px 0; border-bottom: 1px solid #e0e0e0; margin: 0;">
              <span style="color: #667eea; margin-right: 10px;">📊</span>
              <strong>Analytics Dashboard:</strong> Access detailed insights and statistics
            </p>
            
            <p style="padding: 10px 0; border-bottom: 1px solid #e0e0e0; margin: 0;">
              <span style="color: #667eea; margin-right: 10px;">✏️</span>
              <strong>Content Management:</strong> Edit and update course materials
            </p>
            
            <p style="padding: 10px 0; margin: 0;">
              <span style="color: #667eea; margin-right: 10px;">💬</span>
              <strong>Student Interaction:</strong> Respond to comments and feedback
            </p>
          </div>
          
          <div style="text-align: center;">
            <a href="${process.env.ADMIN_URL || 'https://yourapp.com'}/login" style="display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold;">
              Login to Your Admin Dashboard
            </a>
          </div>
          
          <p style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e0e0e0;">
            <strong>Getting Started:</strong><br>
            1. Log in to your admin dashboard using your credentials<br>
            2. Explore the admin interface and features<br>
            3. Create your first course or manage existing content<br>
            4. Review our admin guidelines and best practices
          </p>
          
          <p style="color: #666; font-size: 14px; margin-top: 20px;">
            If you have any questions or need assistance, please don't hesitate to contact our support team.
          </p>
        </div>
        
        <div style="text-align: center; color: white; margin-top: 20px; font-size: 14px;">
          <p>Thank you for being part of our team!</p>
          <p style="font-size: 12px; margin-top: 10px;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      </div>
    </div>
  `;

  return await sendEmailWithRetry(sendEmail, html, email, "🎉 Your Admin Account Has Been Approved!");
};

// ✅ REJECTION EMAIL
const sendRejectionEmail = async (email: string, username: string): Promise<boolean> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">Admin Application Rejected</h2>
      <p>Hello <strong>${username}</strong>,</p>
      <p>We regret to inform you that your application for admin privileges has been rejected.</p>
      
      <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 12px; margin: 16px 0;">
        <p style="margin: 0; color: #7f1d1d;">
          <strong>Important:</strong> You can reapply for admin privileges after 6 months.
        </p>
      </div>
      
      <p>If you believe this was a mistake or have any questions, please contact our support team.</p>
      
      <br>
      <p>Best regards,<br>Admin Team</p>
    </div>
  `;

  return await sendEmailWithRetry(sendEmail, html, email, "Your Admin Application Has Been Rejected");
};

// ✅ WELCOME EMAIL
const sendWelcomeEmail = async (email: string, username?: string): Promise<boolean> => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body>
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);">
          
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; color: white;">
            <div style="font-size: 48px; margin-bottom: 15px;">📚🎓</div>
            <h1 style="margin: 0; font-size: 28px; font-weight: 700;">Welcome to Our Learning Platform!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your journey to knowledge begins here</p>
          </div>
          
          <div style="padding: 40px 30px;">
            <h2 style="color: #333; margin-top: 0; font-size: 22px;">
              ${username ? `Hello ${username}!` : 'Hello!'}
            </h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              Thank you for subscribing to our learning platform! We're thrilled to have you join our community of passionate learners.
            </p>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
              Get ready to embark on an exciting educational journey with the best platform designed to help you achieve your learning goals.
            </p>
            
            <div style="background: #f8f9fa; border-radius: 12px; padding: 25px; margin: 30px 0;">
              <h3 style="color: #333; margin-top: 0; text-align: center; font-size: 20px;">What Awaits You 🚀</h3>
              
              <div style="margin-top: 20px;">
                <div style="margin-bottom: 15px;">
                  <strong style="color: #333;">📖 Comprehensive Courses</strong>
                  <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Access a wide range of expertly crafted courses across various domains</p>
                </div>
                
                <div style="margin-bottom: 15px;">
                  <strong style="color: #333;">👨‍🏫 Expert Instructors</strong>
                  <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Learn from industry professionals and experienced educators</p>
                </div>
                
                <div style="margin-bottom: 15px;">
                  <strong style="color: #333;">📊 Progress Tracking</strong>
                  <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Monitor your learning journey with detailed progress analytics</p>
                </div>
                
                <div>
                  <strong style="color: #333;">🏆 Certifications</strong>
                  <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Earn recognized certificates upon course completion</p>
                </div>
              </div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <h3 style="color: #333; margin-bottom: 20px;">Ready to Get Started?</h3>
              <a href="${process.env.APP_URL || 'https://yourapp.com'}" style="display: inline-block; padding: 14px 35px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);">
                Explore Our Courses
              </a>
            </div>
          </div>
          
          <div style="background: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
            <p style="color: #666; margin: 0 0 10px 0; font-size: 14px;">
              We're committed to providing you with the best learning experience possible
            </p>
            <p style="color: #999; margin: 0; font-size: 12px;">
              This is an automated welcome message. If you have any questions, please contact our support team.<br>
              &copy; ${new Date().getFullYear()} Your Learning Platform. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmailWithRetry(sendEmail, html, email, "🎉 Welcome to Our Learning Platform!");
};

// ✅ BULK EMAIL with batching and rate limiting
const sendBulkEmail = async (req: any, res: any) => {
  try {
    const { subject, message, htmlContent } = req.body;

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

    console.log(`📧 Starting bulk email send to ${subscribers.length} subscribers`);

    const emailHtml = htmlContent || generateEmailTemplate(subject, message);

    const results = {
      total: subscribers.length,
      successful: 0,
      failed: 0,
      failedEmails: [] as string[]
    };

    // ✅ Send in batches to avoid rate limiting
    const BATCH_SIZE = 10;
    const BATCH_DELAY = 5000; // 5 seconds between batches

    for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
      const batch = subscribers.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(subscribers.length / BATCH_SIZE);
      
      console.log(`📦 Processing batch ${batchNumber}/${totalBatches}`);

      const batchPromises = batch.map(async (subscriber: any) => {
        try {
          const emailSent = await sendEmailWithRetry(
            sendEmail,
            emailHtml,
            subscriber.email,
            subject
          );

          if (emailSent) {
            results.successful++;
            console.log(`✅ Email sent to: ${subscriber.email}`);
          } else {
            results.failed++;
            results.failedEmails.push(subscriber.email);
          }
        } catch (error: any) {
          results.failed++;
          results.failedEmails.push(subscriber.email);
          console.error(`❌ Error sending to ${subscriber.email}:`, error.message);
        }
      });

      await Promise.all(batchPromises);

      // Delay between batches (except for last batch)
      if (i + BATCH_SIZE < subscribers.length) {
        console.log(`⏳ Waiting ${BATCH_DELAY}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      }
    }

    console.log(`📊 Bulk email completed: ${results.successful} sent, ${results.failed} failed`);

    return res.status(200).json({
      success: true,
      message: `Bulk email completed. ${results.successful} sent, ${results.failed} failed.`,
      data: results
    });

  } catch (error: any) {
    console.error('❌ Error in sendBulkEmail:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// ✅ Email template generator
const generateEmailTemplate = (subject: string, message: string): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body>
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">${subject}</h1>
        </div>
        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <div style="color: #333; line-height: 1.6; font-size: 16px;">
            ${message.replace(/\n/g, '<br>')}
          </div>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center;">
            <p style="color: #666; font-size: 14px;">
              Thank you for being part of our community!<br>
              If you have any questions, please contact our support team.
            </p>
            <p style="font-size: 12px; color: #999; margin-top: 15px;">
              &copy; ${new Date().getFullYear()} Your Learning Platform. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

// ✅ Export all functions
export {
  transporter,
  sendForgotEmail,
  sendEmail,
  sendVerifyEmail,
  sendApprovalEmail,
  sendRejectionEmail,
  sendWelcomeEmail,
  sendBulkEmail,
  generateEmailTemplate,
  sendEmailWithRetry
};