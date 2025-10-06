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

export { sendForgotEmail, sendEmail, sendVerifyEmail };