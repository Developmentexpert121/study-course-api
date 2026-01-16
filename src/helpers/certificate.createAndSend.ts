// helpers/certificate.createAndSend.ts
import { v4 as uuidv4 } from "uuid";
import fs from "fs-extra";
import { generateCertificatePDFAndUpload } from "./certificate.helper";
import User from "../models/user.model";
import Course from "../models/course.model";
import { sendEmail } from "../provider/send-mail";
import Certificate from "../models/certificate.model";
import CourseAuditLog from "../models/CourseAuditLog.model";
const createAuditLog = async (
  courseId: number,
  courseTitle: string,
  action: string,
  userId: number | undefined,
  userName: string | undefined,
  changedFields: any = null,
  isActiveStatus: boolean | null = null
) => {
  try {
    await CourseAuditLog.create({
      course_id: courseId,
      course_title: courseTitle,
      action,
      user_id: userId || null,
      user_name: userName || 'System',
      changed_fields: changedFields,
      is_active_status: isActiveStatus,
      action_timestamp: new Date()
    });
  } catch (error) {
    console.error('[createAuditLog] Error:', error);
  }
};

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


    console.log("this is the req",user_id)
    // 2) fetch user and course for names/emails
    const user = await User.findByPk(user_id);
    const course = await Course.findByPk(course_id);

    if (!user || !course) {
        throw new Error("User or Course not found");
    }

    // 3) create certificate code & verification URL
    const code = `${uuidv4()}`;
    const verificationUrl = `${process.env.APP_URL || process.env.FRONTEND_URL}/certificates/verify/${code}`;

    // 4) generate PDF and upload
    const issuedDateStr = new Date().toISOString().split("T")[0];
    const uploadResult = await generateCertificatePDFAndUpload({
        student_name:user_id,
        course_title: "Course",
        certificate_code: code,
        issued_date: issuedDateStr,
        verification_url: verificationUrl,
        platform_logo: process.env.PLATFORM_LOGO
    });

    // 5) create DB record with cloudinary link
    const certificateUrl = uploadResult.cloudinaryResult.secure_url;
    const cert = await Certificate.create({
        user_id,
        course_id,
        certificate_code: code,
        issued_date: new Date(),
        certificate_url: certificateUrl,
        status: "pending"
    });

    // Create audit log for course completion
    console.log('[createCertificateForCompletion] Creating audit log for course completion:', course_id);
    await createAuditLog(
        parseInt(course_id as string),
        course.title,
        'course_complete',
        parseInt(user_id as string),
        user.username || user.email,
        {
            certificate_id: cert.id,
            certificate_code: code,
            student_name: user.username || user.email,
            course_title: course.title,
            certificate_url: certificateUrl,
            verification_url: verificationUrl,
            certificate_status: 'pending',
            completed_at: new Date()
        },
        false
    );
    console.log('[createCertificateForCompletion] Audit log created successfully');

    // 6) Send email with certificate - USE LOCAL FILE FOR ATTACHMENT
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

    // Use local file for attachment instead of Cloudinary URL
    const attachments = [
        {
            filename: `Certificate_${code}.pdf`,
            path: uploadResult.localFilePath, // Use local file path
            contentType: 'application/pdf'
        }
    ];

    try {
        console.log('📧 Sending email with certificate attachment...');
        await sendEmail(
            emailHtml,
            (user as any).email,
            `Your Certificate for ${(course as any).title}`,
            undefined,
            undefined,
            attachments
        );

        console.log('✅ Email sent successfully');

        // Clean up local file after email is sent
        setTimeout(async () => {
            try {
                if (fs.existsSync(uploadResult.localFilePath)) {
                    await fs.unlink(uploadResult.localFilePath);
                    console.log('✅ Temporary file cleaned up after email');
                }
            } catch (cleanupError) {
                console.warn('⚠️ Cleanup warning:', cleanupError);
            }
        }, 10000); // Wait 10 seconds before cleanup

    } catch (emailError) {
        console.error('❌ Email sending failed:', emailError);
        // Don't throw, certificate was still created
    }

    return { alreadyExists: false, certificate: cert, uploadResult };
}