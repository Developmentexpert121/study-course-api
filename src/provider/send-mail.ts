import nodemailer from "nodemailer";

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
          
          
          <!-- Security Notice -->
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 25px 0;">
            <h3 style="color: #856404; margin-top: 0; font-size: 16px;">🔒 Security Notice</h3>
            <p style="color: #856404; margin: 8px 0 0 0; font-size: 14px; line-height: 1.5;">
              This password reset link will expire in <strong>1 hour</strong> for security reasons. 
              If you didn't request this reset, please ignore this email and your password will remain unchanged.
            </p>
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
// ✅ Export everything including transporter
export { 
  transporter,
  sendForgotEmail, 
  sendEmail, 
  sendVerifyEmail,
  sendApprovalEmail,
  sendRejectionEmail
};

