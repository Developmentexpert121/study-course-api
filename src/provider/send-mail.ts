import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,  // must be full email address in .env
    pass: process.env.EMAIL_PASSWORD,
  },
  logger: true,
});

/**
 * Send Forgot Password Email
 */
const sendForgotEmail = (link: string, email: string): void => {
  const message = {
    from: process.env.SENDER_EMAIL_ADDRESS,
    to: email,
    subject: "Reset Password",
    text: `To reset your password, please click the link below.\n\n${link}`,
  };

  transporter.sendMail(message, (err, info) => {
    if (err) {
      console.error("Email send error:", err);
    } else {
      console.log("Email sent:", info.response);
    }
  });
};

/**
 * Send a Generic Email
 */
const sendEmail = (
  html: string,
  email: string,
  subject: string,
  from?: string,
  cc?: string,
  attachments?: any[]
): Promise<boolean> => {
  const message = {
    from: from || process.env.SENDER_EMAIL_ADDRESS,
    to: email,
    subject: subject,
    html: html,
    cc: cc,
    attachments: attachments,
  };

  return new Promise((resolve, reject) => {
    transporter.sendMail(message, (err, info) => {
      if (err) {
        console.error("Email send error:", err);
        resolve(false);
      } else {
        console.log("Email sent:", info.response);
        resolve(true);
      }
    });
  });
};
const sendVerifyEmail = (link: string, email: string): void => {
  const message = {
    from: process.env.SENDER_EMAIL_ADDRESS,
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
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">If you didn’t request this email, you can safely ignore it.</p>
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
      console.error("Verification email error:", err);
    } else {
      console.log("Verification email sent:", info.response);
    }
  });
};

export { sendForgotEmail, sendEmail,sendVerifyEmail };
