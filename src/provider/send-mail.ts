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

export { sendForgotEmail, sendEmail };
