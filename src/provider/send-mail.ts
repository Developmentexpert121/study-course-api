import nodemailer from "nodemailer";
import Email  from "../models/Email.mdoel";



// ✅ More robust transporter configuration
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // Use SSL
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  // ✅ Add connection timeout settings
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 10000,   // 10 seconds
  socketTimeout: 15000,     // 15 seconds
});

// ✅ Test connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email transporter verification failed:', error);
    console.log('Error code:', error.code);
    
    // ✅ Don't crash the app if email fails
    if (error.code === 'ETIMEDOUT') {
      console.log('⚠️ Email connection timed out, but continuing without email service');
    }
  } else {
    console.log('✅ Email server is ready to send messages');
  }
});

// ✅ Convert to Promise-based with proper error handling
const sendForgotEmail = (link: string, email: string): Promise<boolean> => {
  return new Promise((resolve) => {
const message = {
  from: process.env.EMAIL_USER,
  to: email,
  subject: "Reset Your Password",
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
     
    </head>
    <body>
     <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px;">
      <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; color: white;">
          <div style="font-size: 48px; margin-bottom: 15px;">🔐</div>
          <h1 style="margin: 0; font-size: 28px; font-weight: 700;">Password Reset</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Secure your account with a new password</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 30px;">
          <h2 style="color: #333; margin-top: 0; font-size: 22px;">Hello there!</h2>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
            We received a request to reset your password. Click the button below to create a new secure password for your account.
          </p>
          
          <!-- Main Action Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${link}" style="display: inline-block; padding: 12px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
              Reset Your Password
            </a>
          </div>

          <!-- Alternative Button -->
          
          
       
          
          <!-- Manual Link -->
          <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="color: #666; margin: 0 0 10px 0; font-size: 14px; font-weight: 500;">If the buttons don't work, copy this link:</p>
            <div style="background: white; border: 1px solid #e0e0e0; border-radius: 6px; padding: 12px; word-break: break-all; font-size: 12px; color: #667eea;">
              ${link}
            </div>
          </div>
          
          <!-- Support Section -->
          <div style="text-align: center; margin: 30px 0 10px 0;">
            <p style="color: #666; margin-bottom: 15px; font-size: 14px;">Need help? Our support team is here for you</p>
            <a href="mailto:support@yourapp.com" style="display: inline-block; padding: 10px 25px; background: #6c757d; color: white; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px;">
              Contact Support
            </a>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
          <p style="color: #666; margin: 0; font-size: 14px;">Stay secure and happy learning! 🚀</p>
          <p style="color: #999; margin: 10px 0 0 0; font-size: 12px;">
            This is an automated message. Please do not reply to this email.<br>
            &copy; ${new Date().getFullYear()} Your Learning Platform. All rights reserved.
          </p>
        </div>
      </div>
    </div>
    </body>
    </html>
  `
};

    transporter.sendMail(message, (err, info) => {
      if (err) {
        console.error("❌ Forgot password email error:", err.message);
        // ✅ Resolve instead of reject to prevent app crashes
        console.log("⚠️ Email failed, but continuing...");
        resolve(false); // Return false instead of throwing error
      } else {
        console.log("✅ Forgot password email sent:", info.response);
        resolve(true);
      }
    });
  });
};

const sendEmail = (
  html: string,
  email: string,
  subject: string,
  from?: string,
  cc?: string,
  attachments?: any[]
): Promise<boolean> => {
  return new Promise((resolve) => {
    const message = {
      from: from || process.env.EMAIL_USER,
      to: email,
      subject: subject,
      html: html,
      cc: cc,
      attachments: attachments,
    };

    transporter.sendMail(message, (err, info) => {
      if (err) {
        console.error("❌ Email send error:", err.message);
        resolve(false);
      } else {
        console.log("✅ Email sent:", info.response);
        resolve(true);
      }
    });
  });
};

// ✅ Convert to Promise-based for better error handling
const sendVerifyEmail = (link: string, email: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const message = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Verify Your Account",
      html: `
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
      `,
    };

    transporter.sendMail(message, (err, info) => {
      if (err) {
        console.error("❌ Verification email error:", err.message);
        // ✅ Resolve instead of reject - don't break user registration
        console.log("⚠️ Verification email failed, but user account was created");
        resolve(false);
      } else {
        console.log("✅ Verification email sent:", info.response);
        resolve(true);
      }
    });
  });
};









const sendApprovalEmail = (email: string, username: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const message = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "🎉 Your Admin Account Has Been Approved!",
      html: `
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
                <a href="${process.env.ADMIN_URL}/login" style="display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold;">
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
      `,
    };

    transporter.sendMail(message, (err, info) => {
      if (err) {
        console.error("❌ Approval email error:", err.message);
        resolve(false);
      } else {
        console.log("✅ Approval email sent:", info.response);
        resolve(true);
      }
    });
  });
};


// utils/emailService.ts or wherever your email functions are
const sendRejectionEmail = async (email: string, username: string): Promise<boolean> => {
  try {
    console.log(`[sendRejectionEmail] Starting to send rejection email to: ${email}`);
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your Admin Application Has Been Rejected',
      html: `
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
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('[sendRejectionEmail] ✅ Email sent successfully! Message ID:', result.messageId);
    return true;
    
  } catch (error) {
    console.error('[sendRejectionEmail] ❌ Error sending email:', error);
    return false;
  }
};

















const sendWelcomeEmail = (email: string, username?: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const message = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "🎉 Welcome to Our Learning Platform!",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body>
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);">
              
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; color: white;">
                <div style="font-size: 48px; margin-bottom: 15px;">📚🎓</div>
                <h1 style="margin: 0; font-size: 28px; font-weight: 700;">Welcome to Our Learning Platform!</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your journey to knowledge begins here</p>
              </div>
              
              <!-- Content -->
              <div style="padding: 40px 30px;">
                <h2 style="color: #333; margin-top: 0; font-size: 22px;">
          
                </h2>
                
                <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                  Thank you for subscribing to our learning platform! We're thrilled to have you join our community of passionate learners.
                </p>
                
                <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
                  Get ready to embark on an exciting educational journey with the best platform designed to help you achieve your learning goals.
                </p>
                
                <!-- Features Grid -->
                <div style="background: #f8f9fa; border-radius: 12px; padding: 25px; margin: 30px 0;">
                  <h3 style="color: #333; margin-top: 0; text-align: center; font-size: 20px;">What Awaits You 🚀</h3>
                  
                  <div style="display: grid; grid-template-columns: 1fr; gap: 15px; margin-top: 20px;">
                    <div style="display: flex; align-items: flex-start; gap: 12px;">
                      <div style="background: #667eea; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0;">📖</div>
                      <div>
                        <strong style="color: #333;">Comprehensive Courses</strong>
                        <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Access a wide range of expertly crafted courses across various domains</p>
                      </div>
                    </div>
                    
                    <div style="display: flex; align-items: flex-start; gap: 12px;">
                      <div style="background: #667eea; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0;">👨‍🏫</div>
                      <div>
                        <strong style="color: #333;">Expert Instructors</strong>
                        <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Learn from industry professionals and experienced educators</p>
                      </div>
                    </div>
                    
                    <div style="display: flex; align-items: flex-start; gap: 12px;">
                      <div style="background: #667eea; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0;">📊</div>
                      <div>
                        <strong style="color: #333;">Progress Tracking</strong>
                        <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Monitor your learning journey with detailed progress analytics</p>
                      </div>
                    </div>
                    
                    <div style="display: flex; align-items: flex-start; gap: 12px;">
                      <div style="background: #667eea; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0;">🏆</div>
                      <div>
                        <strong style="color: #333;">Certifications</strong>
                        <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Earn recognized certificates upon course completion</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- Next Steps -->
                <div style="text-align: center; margin: 30px 0;">
                  <h3 style="color: #333; margin-bottom: 20px;">Ready to Get Started?</h3>
                  <a href="${process.env.APP_URL || 'https://yourapp.com'}" style="display: inline-block; padding: 14px 35px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);">
                    Explore Our Courses
                  </a>
                </div>
                
                <!-- Additional Resources -->
                <div style="border-top: 1px solid #e0e0e0; padding-top: 25px; margin-top: 25px;">
                  <h4 style="color: #333; margin-bottom: 15px;">Quick Links 🔗</h4>
                  <div style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;">
                    <a href="${process.env.APP_URL || 'https://yourapp.com'}/courses" style="padding: 8px 16px; background: #f1f5f9; color: #475569; text-decoration: none; border-radius: 6px; font-size: 14px;">Browse Courses</a>
                    <a href="${process.env.APP_URL || 'https://yourapp.com'}/about" style="padding: 8px 16px; background: #f1f5f9; color: #475569; text-decoration: none; border-radius: 6px; font-size: 14px;">About Us</a>
                    <a href="${process.env.APP_URL || 'https://yourapp.com'}/support" style="padding: 8px 16px; background: #f1f5f9; color: #475569; text-decoration: none; border-radius: 6px; font-size: 14px;">Support</a>
                    <a href="${process.env.APP_URL || 'https://yourapp.com'}/blog" style="padding: 8px 16px; background: #f1f5f9; color: #475569; text-decoration: none; border-radius: 6px; font-size: 14px;">Learning Blog</a>
                  </div>
                </div>
              </div>
              
              <!-- Footer -->
              <div style="background: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                <p style="color: #666; margin: 0 0 10px 0; font-size: 14px;">
                  We're committed to providing you with the best learning experience possible
                </p>
                <p style="color: #999; margin: 0; font-size: 12px;">
                  This is an automated welcome message. If you have any questions, please contact our support team.<br>
                  &copy; ${new Date().getFullYear()} Your Learning Platform. All rights reserved.
                </p>
                
                <!-- Social Links -->
                <div style="margin-top: 15px;">
                  <a href="#" style="margin: 0 8px; color: #667eea; text-decoration: none; font-size: 12px;">Privacy Policy</a>
                  <a href="#" style="margin: 0 8px; color: #667eea; text-decoration: none; font-size: 12px;">Terms of Service</a>
                  <a href="#" style="margin: 0 8px; color: #667eea; text-decoration: none; font-size: 12px;">Unsubscribe</a>
                </div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };

    transporter.sendMail(message, (err, info) => {
      if (err) {
        console.error("❌ Welcome email error:", err.message);
        console.log("⚠️ Welcome email failed, but subscription was recorded");
        resolve(false);
      } else {
        console.log("✅ Welcome email sent:", info.response);
        resolve(true);
      }
    });
  });
};






const sendBulkEmail = async (req, res) => {
  try {
    const { subject, message, htmlContent } = req.body;

    // Validate required fields
    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Subject and message are required'
      });
    }

    // Get all active email subscribers
    const subscribers = await Email.findAll({
      where: {
        // If you have status field, add condition: status: 'active'
      },
      attributes: ['id', 'email', 'EmailId']
    });

    if (!subscribers || subscribers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No email subscribers found'
      });
    }

    console.log(`📧 Starting bulk email send to ${subscribers.length} subscribers`);

    // Prepare email content
    const emailHtml = htmlContent || `
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
                If you wish to unsubscribe, please contact us.
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send emails to all subscribers
    const results = {
      total: subscribers.length,
      successful: 0,
      failed: 0,
      failedEmails: []
    };

    // Send emails sequentially to avoid overwhelming the email service
    for (const subscriber of subscribers) {
      try {
        const emailSent = await sendEmail(
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
          console.log(`❌ Failed to send email to: ${subscriber.email}`);
        }

        // Add a small delay between emails to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        results.failed++;
        results.failedEmails.push(subscriber.email);
        console.error(`❌ Error sending email to ${subscriber.email}:`, error.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Bulk email sending completed. ${results.successful} successful, ${results.failed} failed.`,
      data: results
    });

  } catch (error) {
    console.error('Error in sendBulkEmail:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

const generateEmailTemplate = (subject, message) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f7; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; }
        .content { padding: 30px; line-height: 1.6; color: #333; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; border-top: 1px solid #e0e0e0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 24px;">${subject}</h1>
        </div>
        <div class="content">
          ${message.replace(/\n/g, '<br>')}
        </div>
        <div class="footer">
          <p>Thank you for being part of our community!<br>
          If you have any questions, please contact our support team.</p>
          <p style="font-size: 12px; color: #999; margin-top: 15px;">
            &copy; ${new Date().getFullYear()} Your Company Name. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};


// ✅ Export everything including transporter
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
};

