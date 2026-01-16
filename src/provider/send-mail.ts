import nodemailer from "nodemailer";
import Email from "../models/Email.mdoel";

const createTransporter = () => {
  const emailPassword = process.env.EMAIL_PASSWORD?.replace(/"/g, '')?.replace(/\s/g, '');

  console.log('🔧 Creating email transporter...');

  // Try different configurations
  const configs = [
    // Configuration 1: Standard TLS
    {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: emailPassword,
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 10000,
      socketTimeout: 10000,
    },
    // Configuration 2: SSL
    {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: emailPassword,
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 10000,
      socketTimeout: 10000,
    },
    // Configuration 3: Simple Gmail service
    {
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: emailPassword,
      },
      connectionTimeout: 10000,
      socketTimeout: 10000,
    }
  ];

  let transporter;
  let workingConfig = null;

  for (const config of configs) {
    try {
      transporter = nodemailer.createTransport(config);
      console.log(`🔄 Testing config: ${config.port || config.service}`);

      // Test synchronously (simplified)
      transporter.verify((error) => {
        if (!error) {
          console.log(`✅ Config working: ${config.port || config.service}`);
          workingConfig = config;
        }
      });

      if (workingConfig) break;
    } catch (error) {
      console.log(`❌ Config failed: ${config.port || config.service}`);
      continue;
    }
  }

  return transporter || nodemailer.createTransport(configs[0]);
};

let transporter = createTransporter();

// ✅ Test connection with retry logic
const testConnection = () => {
  transporter.verify((error, success) => {
    if (error) {
      console.error('❌ Email connection failed:', error.message);
      console.log('🔄 Retrying with alternative configuration...');

      // Retry with different port
      setTimeout(() => {
        transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD?.replace(/"/g, '')?.replace(/\s/g, ''),
          },
          connectionTimeout: 15000,
          socketTimeout: 15000,
        });

        transporter.verify((retryError) => {
          if (retryError) {
            console.error('❌ Retry also failed:', retryError.message);
            console.log('💡 Email service will attempt to send anyway...');
          } else {
            console.log('✅ Connected on retry!');
          }
        });
      }, 2000);
    } else {
      console.log('✅ Email server connected successfully');
    }
  });
};

testConnection();
// ✅ Generic email sending function with better error handling
const sendEmail = async (
  html: string,
  email: string,
  subject: string,
  from?: string,
  cc?: string,
  attachments?: any[]
): Promise<boolean> => {
  try {
    const mailOptions = {
      from: from || process.env.EMAIL_USER || process.env.SENDER_EMAIL_ADDRESS || process.env.EMAIL_ADDRESS,
      to: email,
      subject: subject,
      html: html,
      cc: cc,
      attachments: attachments,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully:", info.messageId);
    return true;
  } catch (error: any) {
    console.error("❌ Email send error:", error.message);

    // Log specific error details for debugging
    if (error.code === 'EAUTH') {
      console.log('🔐 Authentication error - check email credentials');
    } else if (error.code === 'EENVELOPE') {
      console.log('📧 Envelope error - check recipient email address');
    }

    return false;
  }
};

// ✅ Forgot password email
const sendForgotEmail = (link: string, email: string): Promise<boolean> => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
  `;

  return sendEmail(html, email, "Reset Your Password");
};

// ✅ Verification email
const sendVerifyEmail = (link: string, email: string): Promise<boolean> => {
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
      <p className="text-xs text-gray-600 dark:text-gray-400">
                        For support, contact us at {" "}
                        <a
                          href="mailto:info@devexhub.com"
                          className="text-blue-600 font-medium hover:text-blue-700 dark:text-blue-400"
                        >
                          info@devexhub.com
                        </a>

                      </p>
    </div>
  `;

  return sendEmail(html, email, "Verify Your Account");
};

// ✅ Approval email
const sendApprovalEmail = (email: string, username: string): Promise<boolean> => {
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
          <p className="text-xs text-gray-600 dark:text-gray-400">
                        For support, contact us at {" "}
                        <a
                          href="mailto:info@devexhub.com"
                          className="text-blue-600 font-medium hover:text-blue-700 dark:text-blue-400"
                        >
                          info@devexhub.com
                        </a>

                      </p>
        </div>
      </div>
    </div>
  `;

  return sendEmail(html, email, "🎉 Your Admin Account Has Been Approved!");
};

// ✅ Rejection email
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
      <p className="text-xs text-gray-600 dark:text-gray-400">
                        For support, contact us at {" "}
                        <a
                          href="mailto:info@devexhub.com"
                          className="text-blue-600 font-medium hover:text-blue-700 dark:text-blue-400"
                        >
                          info@devexhub.com
                        </a>

                      </p>
      <br>
      <p>Best regards,<br>Admin Team</p>
    </div>
  `;

  return sendEmail(html, email, "Your Admin Application Has Been Rejected");
};

// ✅ Welcome email
const sendWelcomeEmail = (email: string, username?: string): Promise<boolean> => {
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
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; color: white;">
            <div style="font-size: 48px; margin-bottom: 15px;">📚🎓</div>
            <h1 style="margin: 0; font-size: 28px; font-weight: 700;">Welcome to Our Learning Platform!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your journey to knowledge begins here</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 30px;">
            <h2 style="color: #333; margin-top: 0; font-size: 22px;">Hello${username ? `, ${username}` : ''}!</h2>
            
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
  `;

  return sendEmail(html, email, "🎉 Welcome to Our Learning Platform!");
};

// ✅ Bulk email function
const sendBulkEmail = async (req: any, res: any) => {
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
      failedEmails: [] as string[]
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

      } catch (error: any) {
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

  } catch (error: any) {
    console.error('Error in sendBulkEmail:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// ✅ Template generator
const generateEmailTemplate = (subject: string, message: string) => {
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





const sendCertificateGeneratedEmail = (
  email: string,
  username: string,
  courseName: string,
  certificateUrl: string,
  certificateCode: string
): Promise<boolean> => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body>
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center; color: white;">
            <div style="font-size: 64px; margin-bottom: 15px;">🎓</div>
            <h1 style="margin: 0; font-size: 28px; font-weight: 700;">Congratulations!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your Certificate is Ready</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 30px;">
            <h2 style="color: #333; margin-top: 0; font-size: 22px;">Hello ${username}! 🎉</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              We're thrilled to inform you that your certificate for <strong style="color: #10b981;">${courseName}</strong> has been generated and is now ready for download!
            </p>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
              Your hard work and dedication have paid off. This certificate is a testament to your commitment to learning and professional growth.
            </p>
            
            <!-- Certificate Details Card -->
            <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-left: 4px solid #10b981; border-radius: 8px; padding: 20px; margin: 25px 0;">
              <h3 style="color: #065f46; margin-top: 0; font-size: 18px; display: flex; align-items: center;">
                <span style="margin-right: 10px;">📜</span>
                Certificate Details
              </h3>
              
              <div style="margin: 15px 0;">
                <p style="color: #047857; margin: 8px 0; font-size: 14px;">
                  <strong>Course:</strong> ${courseName}
                </p>
                <p style="color: #047857; margin: 8px 0; font-size: 14px;">
                  <strong>Certificate Code:</strong> 
                  <code style="background: white; padding: 4px 8px; border-radius: 4px; font-family: monospace; color: #065f46;">${certificateCode}</code>
                </p>
                <p style="color: #047857; margin: 8px 0; font-size: 14px;">
                  <strong>Issue Date:</strong> ${new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })}
                </p>
              </div>
            </div>
            
            <!-- Download Button -->
            <div style="text-align: center; margin: 35px 0;">
              <a href="${certificateUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3); transition: transform 0.2s;">
                📥 Download Your Certificate
              </a>
            </div>
            
            <!-- Quick Actions -->
            <div style="background: #f8f9fa; border-radius: 12px; padding: 25px; margin: 30px 0;">
              <h3 style="color: #333; margin-top: 0; font-size: 18px; text-align: center;">What's Next? 🚀</h3>
              
              <div style="margin-top: 20px;">
                <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 15px;">
                  <div style="background: #10b981; color: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0;">📤</div>
                  <div>
                    <strong style="color: #333;">Share Your Achievement</strong>
                    <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Share your certificate on LinkedIn and other social platforms to showcase your skills</p>
                  </div>
                </div>
                
                <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 15px;">
                  <div style="background: #10b981; color: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0;">📚</div>
                  <div>
                    <strong style="color: #333;">Explore More Courses</strong>
                    <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Continue your learning journey with our wide range of courses</p>
                  </div>
                </div>
                
                <div style="display: flex; align-items: flex-start; gap: 12px;">
                  <div style="background: #10b981; color: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0;">💼</div>
                  <div>
                    <strong style="color: #333;">Add to Your Resume</strong>
                    <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Update your CV and professional profiles with your new certification</p>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Verification Info -->
            <div style="background: #fff7ed; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 25px 0;">
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                <strong>🔐 Certificate Verification</strong><br>
                Your certificate can be verified using the certificate code: <strong>${certificateCode}</strong>
              </p>
            </div>
            
            <!-- Support Section -->
            <div style="text-align: center; margin: 30px 0 10px 0; padding-top: 20px; border-top: 1px solid #e0e0e0;">
              <p style="color: #666; margin-bottom: 15px; font-size: 14px;">Need help or have questions?</p>
              <a href="mailto:support@yourapp.com" style="display: inline-block; padding: 10px 25px; background: #6c757d; color: white; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px;">
                Contact Support
              </a>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
            <p style="color: #666; margin: 0; font-size: 14px;">
              Congratulations once again on your achievement! 🎊
            </p>
            <p style="color: #999; margin: 15px 0 0 0; font-size: 12px;">
              This is an automated message. Please do not reply to this email.<br>
              &copy; ${new Date().getFullYear()} Your Learning Platform. All rights reserved.
            </p>
            
            <!-- Social Links -->
            <div style="margin-top: 20px;">
              <a href="#" style="margin: 0 10px; text-decoration: none;">
                <img src="https://img.icons8.com/color/32/000000/linkedin.png" alt="LinkedIn" style="width: 24px; height: 24px;">
              </a>
              <a href="#" style="margin: 0 10px; text-decoration: none;">
                <img src="https://img.icons8.com/color/32/000000/twitter.png" alt="Twitter" style="width: 24px; height: 24px;">
              </a>
              <a href="#" style="margin: 0 10px; text-decoration: none;">
                <img src="https://img.icons8.com/color/32/000000/facebook.png" alt="Facebook" style="width: 24px; height: 24px;">
              </a>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(html, email, "🎓 Your Certificate is Ready!");
};




const sendCertificateRejectedEmail = (
  email: string,
  username: string,
  courseName: string,
  reason?: string,
  rejectedBy: 'admin' | 'super-admin' = 'admin'
): Promise<boolean> => {
  const rejectorTitle = rejectedBy === 'super-admin' ? 'Super Admin' : 'Admin';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body>
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 30px; text-align: center; color: white;">
            <div style="font-size: 64px; margin-bottom: 15px;">⚠️</div>
            <h1 style="margin: 0; font-size: 28px; font-weight: 700;">Certificate Not Approved</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Action Required</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 30px;">
            <h2 style="color: #333; margin-top: 0; font-size: 22px;">Hello ${username},</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              We regret to inform you that your certificate request for <strong style="color: #ef4444;">${courseName}</strong> has not been approved at this time.
            </p>
            
            <!-- Certificate Details Card -->
            <div style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-left: 4px solid #ef4444; border-radius: 8px; padding: 20px; margin: 25px 0;">
              <h3 style="color: #991b1b; margin-top: 0; font-size: 18px; display: flex; align-items: center;">
                <span style="margin-right: 10px;">📋</span>
                Rejection Details
              </h3>
              
              <div style="margin: 15px 0;">
                <p style="color: #991b1b; margin: 8px 0; font-size: 14px;">
                  <strong>Course:</strong> ${courseName}
                </p>
                <p style="color: #991b1b; margin: 8px 0; font-size: 14px;">
                  <strong>Rejected By:</strong> ${rejectorTitle}
                </p>
                <p style="color: #991b1b; margin: 8px 0; font-size: 14px;">
                  <strong>Date:</strong> ${new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })}
                </p>
                ${reason ? `
                <p style="color: #991b1b; margin: 8px 0; font-size: 14px;">
                  <strong>Reason:</strong> ${reason}
                </p>
                ` : ''}
              </div>
            </div>
            
            <!-- What This Means Section -->
            <div style="background: #f8f9fa; border-radius: 12px; padding: 25px; margin: 30px 0;">
              <h3 style="color: #333; margin-top: 0; font-size: 18px; text-align: center;">What This Means 🤔</h3>
              
              <div style="margin-top: 20px;">
                <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 15px;">
                  <div style="background: #ef4444; color: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0;">1</div>
                  <div>
                    <strong style="color: #333;">Review Required</strong>
                    <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Your course completion or certificate requirements may need to be reviewed</p>
                  </div>
                </div>
                
                <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 15px;">
                  <div style="background: #ef4444; color: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0;">2</div>
                  <div>
                    <strong style="color: #333;">No Certificate Issued</strong>
                    <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">You will not receive a certificate for this course at this time</p>
                  </div>
                </div>
                
                <div style="display: flex; align-items: flex-start; gap: 12px;">
                  <div style="background: #ef4444; color: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0;">3</div>
                  <div>
                    <strong style="color: #333;">Appeal Available</strong>
                    <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">You may contact support to discuss this decision or appeal if needed</p>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Next Steps Section -->
            <div style="background: #fff7ed; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 25px 0;">
              <h3 style="color: #92400e; margin-top: 0; font-size: 18px; display: flex; align-items: center;">
                <span style="margin-right: 10px;">💡</span>
                What You Can Do Next
              </h3>
              
              <ul style="color: #92400e; margin: 10px 0; padding-left: 20px; line-height: 1.8;">
                <li>Review the course requirements and ensure all modules are completed</li>
                <li>Check if all assignments and assessments have been submitted</li>
                <li>Contact your course instructor for clarification</li>
                <li>Reach out to our support team if you believe this is an error</li>
                ${reason ? '<li>Address the specific reason mentioned above</li>' : ''}
              </ul>
            </div>
            
            <!-- Important Notice -->
            <div style="background: #fef2f2; border: 2px solid #fecaca; border-radius: 8px; padding: 15px; margin: 25px 0;">
              <p style="color: #991b1b; margin: 0; font-size: 14px; display: flex; align-items: flex-start; gap: 10px;">
                <span style="font-size: 20px; flex-shrink: 0;">ℹ️</span>
                <span><strong>Important:</strong> This decision may be appealed or reconsidered. Please contact support within 30 days if you have questions or concerns about this rejection.</span>
              </p>
            </div>
            
            <!-- Contact Support Section -->
            <div style="text-align: center; margin: 30px 0 10px 0; padding-top: 20px; border-top: 1px solid #e0e0e0;">
              <p style="color: #666; margin-bottom: 15px; font-size: 14px;">Have questions or need assistance?</p>
              <a href="mailto:support@yourapp.com" style="display: inline-block; padding: 12px 30px; background: #6c757d; color: white; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px;">
                Contact Support Team
              </a>
            </div>
            
            <!-- Encouragement -->
            <div style="text-align: center; margin-top: 30px; padding: 20px; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 8px;">
              <p style="color: #0c4a6e; margin: 0; font-size: 14px;">
                <strong>Don't Give Up! 💪</strong><br>
                This setback is an opportunity to improve. Review the feedback, address any concerns, and you can reapply or retake assessments as needed.
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
            <p style="color: #666; margin: 0; font-size: 14px;">
              We're here to support your learning journey! 📚
            </p>
            <p style="color: #999; margin: 15px 0 0 0; font-size: 12px;">
              This is an automated message. For assistance, please contact our support team.<br>
              &copy; ${new Date().getFullYear()} Your Learning Platform. All rights reserved.
            </p>
            
            <!-- Social Links -->
            <div style="margin-top: 20px;">
              <a href="#" style="margin: 0 10px; text-decoration: none;">
                <img src="https://img.icons8.com/color/32/000000/linkedin.png" alt="LinkedIn" style="width: 24px; height: 24px;">
              </a>
              <a href="#" style="margin: 0 10px; text-decoration: none;">
                <img src="https://img.icons8.com/color/32/000000/twitter.png" alt="Twitter" style="width: 24px; height: 24px;">
              </a>
              <a href="#" style="margin: 0 10px; text-decoration: none;">
                <img src="https://img.icons8.com/color/32/000000/facebook.png" alt="Facebook" style="width: 24px; height: 24px;">
              </a>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(html, email, "Certificate Request Not Approved");
};




// ✅ Export everything
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
  sendCertificateGeneratedEmail,
  sendCertificateRejectedEmail,
};