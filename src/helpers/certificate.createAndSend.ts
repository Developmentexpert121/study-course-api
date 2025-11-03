// helpers/certificate.createAndSend.ts
import { v4 as uuidv4 } from "uuid";
import { generateCertificatePDFAndUpload } from "./certificate.helper";
import User from "../models/user.model";
import Course from "../models/course.model";
import {
    sendEmail
} from "../provider/send-mail";
import Certificate from "../models/certificate.model";
export async function createCertificateForCompletion({
    user_id,
    course_id,
}: {
    user_id: number | string;
    course_id: number | string;
}) {
    // 1) check existing certificate
    const existing = await Certificate.findOne({ where: { user_id, course_id } });
    if (existing) return { alreadyExists: true, certificate: existing };

    // 2) fetch user and course for names/emails
    const user = await User.findByPk(user_id);
    const course = await Course.findByPk(course_id);

    if (!user || !course) {
        throw new Error("User or Course not found");
    }

    // 3) create certificate code & verification URL
    const code = `${uuidv4()}`; // you can add prefix like 'CRS-'
    const verificationUrl = `${process.env.APP_URL || process.env.FRONTEND_URL}/certificates/verify/${code}`;

    // 4) generate PDF and upload
    const issuedDateStr = new Date().toISOString().split("T")[0]; // e.g., YYYY-MM-DD
    const uploadResult = await generateCertificatePDFAndUpload({
        student_name: (user as any).name || `${(user as any).first_name || ""} ${(user as any).last_name || ""}`,
        course_title: (course as any).title || "Course",
        certificate_code: code,
        issued_date: issuedDateStr,
        verification_url: verificationUrl,
        platform_logo: process.env.PLATFORM_LOGO // optional
    });

    // 5) create DB record with cloudinary link
    const certificateUrl = uploadResult.cloudinaryResult.secure_url;
    const cert = await Certificate.create({
        user_id,
        course_id,
        certificate_code: code,
        issued_date: new Date(),
        certificate_url: certificateUrl,
        status: "issued"
    });

    // 6) Send email with certificate link and attach cloud file (optional)
    // Cloudinary raw URL is accessible — you can attach via URL in mail (nodemailer supports attachments with `path` being URL)
    const emailHtml = `
    <div>
      <h2>Congratulations ${(user as any).name || ""} 🎉</h2>
      <p>You have successfully completed the course <strong>${(course as any).title}</strong>.</p>
      <p>Click below to download your certificate:</p>
      <p><a href="${certificateUrl}" target="_blank">Download Certificate</a></p>
      <p>Or verify it here: <a href="${verificationUrl}" target="_blank">${verificationUrl}</a></p>
      <p>Certificate ID: ${code}</p>
    </div>
  `;

    // prepare attachments: Cloudinary URL can be used directly as attachment path
    const attachments = [
        {
            filename: `${code}.pdf`,
            path: certificateUrl
        }
    ];

    // Use your sendEmail helper (returns boolean)
    await sendEmail(emailHtml, (user as any).email, `Your Certificate for ${(course as any).title}`, undefined, undefined, attachments);

    return { alreadyExists: false, certificate: cert, uploadResult };
}
