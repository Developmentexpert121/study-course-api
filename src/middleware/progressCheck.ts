// middleware/progressCheck.ts
import { Request, Response, NextFunction } from 'express';
import { checkCourseCompletion } from '../helpers/courseCompletion.helper';
import { createCertificateForCompletion } from '../helpers/certificate.createAndSend';
import Certificate from '../models/certificate.model';

export const checkProgressAndIssueCertificate = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { user_id, course_id } = req.body;

        // Check if course is completed
        const completionStatus = await checkCourseCompletion(user_id, course_id);

        if (completionStatus.completed) {
            console.log(`🎯 User ${user_id} completed course ${course_id}. Checking for certificate...`);


            // Check if certificate already exists
            const existingCertificate = await Certificate.findOne({
                where: { user_id, course_id },
            });

            if (!existingCertificate) {
                try {
                    // Create certificate automatically
                    const result = await createCertificateForCompletion({ user_id, course_id });

                    if (result.alreadyExists) {
                        console.log(`ℹ️ Certificate already exists for user ${user_id}, course ${course_id}`);
                    } else {
                        console.log(`✅ Certificate created and email sent for user ${user_id}, course ${course_id}`);
                    }
                } catch (certError) {
                    console.error('❌ Certificate creation failed:', certError);
                    // Don't block the request if certificate generation fails
                }
            } else {
                console.log(`ℹ️ Certificate already exists for user ${user_id}, course ${course_id}`);
            }
        }

        next();
    } catch (error) {
        console.error('Progress check middleware error:', error);
        next(); // Don't block the request if certificate generation fails
    }
};