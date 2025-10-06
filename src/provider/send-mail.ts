import nodemailer from "nodemailer";

// Log environment variables on startup (hide password)
console.log("=== Email Configuration ===");
console.log("EMAIL_USER:", process.env.EMAIL_USER || "NOT SET");
console.log("EMAIL_PASSWORD:", process.env.EMAIL_PASSWORD ? "***SET***" : "NOT SET");
console.log("ADMIN_URL:", process.env.ADMIN_URL || "NOT SET");
console.log("==========================");

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
  console.error("❌ CRITICAL: EMAIL_USER or EMAIL_PASSWORD not set!");
}

// ✅ FIXED: Use port 587 instead of 465 (Render blocks 465)
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // Use STARTTLS (not SSL)
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  tls: {
    rejectUnauthorized: true, // Verify SSL certificate
  },
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 10000,
  socketTimeout: 30000, // 30 seconds for sending
});

// Test connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email transporter verification failed:', error);
    console.error('Error code:', error.code);
  } else {
    console.log('✅ Email server is ready to send messages');
  }
});

const sendForgotEmail = (link: string, email: string): Promise<boolean> => {
  console.log(`[sendForgotEmail] Sending to: ${email}`);
  
  const message = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Reset Password",
    text: `To reset your password, please click the link below.\n\n${link}`,
  };

  return new Promise((resolve, reject) => {
    transporter.sendMail(message, (err, info) => {
      if (err) {
        console.error("❌ Forgot password email error:", err);
        reject(err);
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
  console.log(`[sendEmail] Sending to: ${email} | Subject: ${subject}`);
  
  const message = {
    from: from || process.env.EMAIL_USER,
    to: email,
    subject: subject,
    html: html,
    cc: cc,
    attachments: attachments,
  };

  return new Promise((resolve, reject) => {
    transporter.sendMail(message, (err, info) => {
      if (err) {
        console.error("❌ Email send error:", err);
        reject(err);
      } else {
        console.log("✅ Email sent:", info.response);
        resolve(true);
      }
    });
  });
};

const sendVerifyEmail = (link: string, email: string): Promise<boolean> => {
  console.log(`[sendVerifyEmail] Sending to: ${email}`);
  
  const message = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Verify Your Account",
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f7; padding: 30px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.05); overflow: hidden;">
          <div style="padding: 30px; text-align: center;">
            <h1 style="color: #111827;">Welcome to Our App</h1>
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

  return new Promise((resolve, reject) => {
    transporter.sendMail(message, (err, info) => {
      if (err) {
        console.error("❌ Verification email error:", err);
        reject(err);
      } else {
        console.log("✅ Verification email sent:", info.response);
        resolve(true);
      }
    });
  });
};

export { sendForgotEmail, sendEmail, sendVerifyEmail };