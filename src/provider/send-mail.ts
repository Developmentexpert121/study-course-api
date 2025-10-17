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
      subject: "Reset Password",
      text: `To reset your password, please click the link below.\n\n${link}`,
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

