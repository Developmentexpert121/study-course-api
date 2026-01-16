// controllers/certificate.controller.ts
import { Request, Response } from 'express';
import Certificate from '../../models/certificate.model';
import Course from '../../models/course.model';
import User from '../../models/user.model';
import { Op } from 'sequelize';
import sequelize from '../../util/dbConn';
import { createCertificateForCompletion } from '../../helpers/certificate.createAndSend';
import Enrollment from '../../models/enrollment.model';
import Chapter from '../../models/chapter.model';
import UserProgress from '../../models/userProgress.model';
import { sendCertificateEmail } from '../../helpers/emailService';
import Lesson from '../../models/lesson.model';
import Mcq from '../../models/mcq.model';
import CourseAuditLog from "../../models/CourseAuditLog.model";
import {
    sendCertificateGeneratedEmail,
    sendCertificateRejectedEmail
} from "../../provider/send-mail";


const getUserCourseProgressData = async (user_id: string, courseId: string) => {

    const user = await User.findByPk(user_id, {
        attributes: ['id', 'username', 'email', 'profileImage']
    });
    console.log("this is the user",user)
    const chapters = await Chapter.findAll({
        where: { course_id: courseId },
        order: [['order', 'ASC']],
        include: [{
            model: Lesson,
            as: 'lessons',
            attributes: ['id', 'title', 'order', 'duration'],
            order: [['order', 'ASC']]
        }, {
            model: Mcq,
            as: 'mcqs',
            attributes: ['id'],
            where: { is_active: true },
            required: false
        }]
    });

    const userProgress = await UserProgress.findAll({
        where: {
            user_id,
            course_id: courseId,
        }
    });

    const chaptersWithProgress = await Promise.all(chapters.map(async (chapter, index) => {
        const chapterProgress = userProgress.find(p =>
            p.chapter_id === chapter.id
        );

        // Get completed lessons from JSON array
        const completedLessons = chapterProgress?.completed_lessons
            ? JSON.parse(chapterProgress.completed_lessons)
            : [];

        const completedLessonsCount = completedLessons.length;
        const allLessonsCompleted = completedLessonsCount >= chapter.lessons.length;

        // ✅ PROPER LOCK LOGIC:
        let locked = true;
        if (index === 0) {
            locked = false; // First chapter always unlocked
        } else {
            const previousChapter = chapters[index - 1];
            const previousChapterProgress = userProgress.find(p =>
                p.chapter_id === previousChapter.id
            );
            locked = !(previousChapterProgress && previousChapterProgress.mcq_passed);
        }

        const canAttemptMCQ = !locked && allLessonsCompleted && !chapterProgress?.mcq_passed;

        return {
            id: chapter.id,
            title: chapter.title,
            order: chapter.order,
            locked: locked,
            completed: chapterProgress?.completed || false,
            mcq_passed: chapterProgress?.mcq_passed || false,
            lesson_completed: chapterProgress?.lesson_completed || false,
            progress: {
                total_lessons: chapter.lessons.length,
                completed_lessons: completedLessonsCount,
                all_lessons_completed: allLessonsCompleted,
                has_mcqs: chapter.mcqs.length > 0,
                total_mcqs: chapter.mcqs.length,
                can_attempt_mcq: canAttemptMCQ
            },
            lessons: chapter.lessons.map(lesson => ({
                id: lesson.id,
                title: lesson.title,
                order: lesson.order,
                duration: lesson.duration,
                completed: completedLessons.includes(lesson.id), // Check if lesson is in completed_lessons array
                locked: locked // Lessons inherit chapter lock status
            }))
        };
    }));

    // Calculate overall progress
    const totalChapters = chapters.length;
    const completedChapters = chaptersWithProgress.filter(ch => ch.completed).length;
    const overallProgress = totalChapters > 0 ? (completedChapters / totalChapters) * 100 : 0;
    const courseCompleted = completedChapters === totalChapters && totalChapters > 0;

    if (courseCompleted) {
        console.log(`🎉 COURSE COMPLETED! User ${user_id} finished course ${courseId}`);

        try {
            // Check if certificate already exists
            const existingCertificate = await Certificate.findOne({
                where: { user_id, course_id: courseId },
            });

            if (!existingCertificate) {
                console.log(`📧 Creating certificate and sending email...`);
                // Create certificate and send email
                await createCertificateForCompletion({
                    user_id,
                    course_id: courseId,
                 
                });
                console.log(`✅ Certificate email sent to user!`);
            }
        } catch (certError) {
            console.error('❌ Certificate creation failed:', certError);
        }
    }

    return {
        course_id: courseId,
        user_id,
        overall_progress: Math.round(overallProgress),
        total_chapters: totalChapters,
        completed_chapters: completedChapters,
        course_completed: courseCompleted, // Add this to response
        chapters: chaptersWithProgress
    };
};
export const getCourseEnrolledUsersWithProgress = async (req: Request, res: Response) => {
    try {
        const { courseId }: any = req.params;
        const {
            page = 1,
            limit = 10,
            search,
            progress_filter,
            has_certificate
        } = req.query;

        // Validate course exists
        const course = await Course.findByPk(courseId);
        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        const pageNum = Number(page);
        const limitNum = Number(limit);
        const offset = (pageNum - 1) * limitNum;

        // Build where condition for users
        const userWhere: any = {};
        if (search) {
            userWhere[Op.or] = [
                { username: { [Op.iLike]: `%${search}%` } },
                { email: { [Op.iLike]: `%${search}%` } },
            ];
        }

        // Get all enrollments with user details
        const { count, rows: enrollments } = await Enrollment.findAndCountAll({
            where: { course_id: courseId },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'email', 'profileImage'],
                    where: userWhere
                }
            ],
            limit: limitNum,
            offset: offset,
            order: [['enrolled_at', 'DESC']]
        });

        // Get detailed progress and certificate data for each user
        const usersWithProgress = await Promise.all(
            enrollments.map(async (enrollment) => {
                const user = enrollment.user;
                const progressData = await getUserCourseProgressData(user.id, courseId);

                // Check if certificate exists
                const certificate = await Certificate.findOne({
                    where: {
                        user_id: user.id,
                        course_id: courseId
                    },
                    include: [
                        {
                            model: Course,
                            as: 'certificate_course',
                            attributes: ['id', 'title']
                        }
                    ]
                });

                // Create user full name
                const fullName = user.username;

                return {
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        profileImage: user.profileImage,
                        fullName: fullName
                    },
                    enrollment: {
                        id: enrollment.id,
                        batch: enrollment.batch,
                        enrolled_at: enrollment.enrolled_at,
                        enrollment_date: enrollment.createdAt
                    },
                    progress: progressData,
                    certificate: certificate ? {
                        id: certificate.id,
                        certificate_code: certificate.certificate_code,
                        certificate_url: certificate.certificate_url,
                        issued_date: certificate.issued_date,
                        status: certificate.status,
                        download_count: certificate.download_count,
                        can_download: certificate.status === 'issued',
                        can_send_email: certificate.status === 'issued'
                    } : null,
                    actions: {
                        can_generate_certificate: progressData.course_completed && !certificate,
                        can_download_certificate: certificate && certificate.status === 'issued',
                        can_send_certificate: certificate && certificate.status === 'issued',
                        can_revoke_certificate: certificate && certificate.status === 'issued',
                        can_reinstate_certificate: certificate && certificate.status === 'revoked'
                    }
                };
            })
        );

        // Apply filters
        let filteredUsers = usersWithProgress;

        if (progress_filter) {
            switch (progress_filter) {
                case 'completed':
                    filteredUsers = usersWithProgress.filter(user => user.progress.is_completed);
                    break;
                case 'in_progress':
                    filteredUsers = usersWithProgress.filter(user =>
                        user.progress.overall_progress > 0 && !user.progress.is_completed
                    );
                    break;
                case 'not_started':
                    filteredUsers = usersWithProgress.filter(user => user.progress.overall_progress === 0);
                    break;
            }
        }

        if (has_certificate !== undefined) {
            const hasCert = has_certificate === 'true';
            filteredUsers = filteredUsers.filter(user =>
                hasCert ? user.certificate !== null : user.certificate === null
            );
        }

        // Calculate summary statistics
        const summary = {
            total_enrolled: count,
            completed_course: usersWithProgress.filter(user => user.progress.is_completed).length,
            in_progress: usersWithProgress.filter(user =>
                user.progress.overall_progress > 0 && !user.progress.is_completed
            ).length,
            not_started: usersWithProgress.filter(user => user.progress.overall_progress === 0).length,
            certificates_issued: usersWithProgress.filter(user =>
                user.certificate && user.certificate.status === 'issued'
            ).length,
            certificates_revoked: usersWithProgress.filter(user =>
                user.certificate && user.certificate.status === 'revoked'
            ).length
        };

        return res.status(200).json({
            success: true,
            data: {
                course: {
                    id: course.id,
                    title: course.title,
                    description: course.description,
                    category: course.category
                },
                users: filteredUsers,
                pagination: {
                    current_page: pageNum,
                    total_pages: Math.ceil(count / limitNum),
                    total_items: count,
                    items_per_page: limitNum,
                },
                summary,
                filters: {
                    search: search || '',
                    progress_filter: progress_filter || '',
                    has_certificate: has_certificate || ''
                }
            }
        });

    } catch (error) {
        console.error('Get course enrolled users with progress error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Generate certificate for user (admin action)
export const generateCertificateForUser = async (req: Request, res: Response) => {
    try {
        const { courseId, userId } = req.params;

        // Validate user and course
        const user = await User.findByPk(userId);
        const course = await Course.findByPk(courseId);

        if (!user || !course) {
            return res.status(404).json({
                success: false,
                message: 'User or course not found'
            });
        }

        // Check enrollment
        const enrollment: any = await Enrollment.findOne({
            where: { user_id: userId, course_id: courseId }
        });

        if (!enrollment) {
            return res.status(400).json({
                success: false,
                message: 'User is not enrolled in this course'
            });
        }

        // Check progress
        const progressData: any = await getUserCourseProgressData(userId, courseId);
        if (!progressData.is_completed) {
            return res.status(400).json({
                success: false,
                message: 'User has not completed the course yet'
            });
        }

        // Check if certificate already exists
        const existingCertificate = await Certificate.findOne({
            where: { user_id: userId, course_id: courseId }
        });

        if (existingCertificate) {
            return res.status(400).json({
                success: false,
                message: 'Certificate already exists for this user',
                data: existingCertificate
            });
        }

        // Generate certificate
        const result = await createCertificateForCompletion({
            user_id: parseInt(userId),
            course_id: parseInt(courseId),
           
        });

        if (result.alreadyExists) {
            return res.status(400).json({
                success: false,
                message: 'Certificate already exists for this user',
                data: result.certificate
            });
        }

        return res.status(201).json({
            success: true,
            message: 'Certificate generated successfully',
            data: result.certificate
        });

    } catch (error) {
        console.error('Generate certificate for user error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

// Send certificate via email
export const sendCertificateEmailToUser = async (req: Request, res: Response) => {
    try {
        const { certificateId } = req.params;

        // Use the enhanced email service
        const emailSent = await sendCertificateEmail({ certificate_id: parseInt(certificateId) });

        if (emailSent) {
            // Get updated certificate info for response
            const certificate = await Certificate.findByPk(certificateId, {
                include: [
                    {
                        model: User,
                        as: 'certificate_user',
                        attributes: ['id', 'email', 'username']
                    },
                    {
                        model: Course,
                        as: 'certificate_course',
                        attributes: ['id', 'title']
                    }
                ]
            });

            // Check if includes were loaded properly
            if (!certificate || !certificate.certificate_user || !certificate.certificate_course) {
                return res.status(404).json({
                    success: false,
                    message: 'Certificate, user, or course not found'
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Certificate email sent successfully',
                data: {
                    certificate_id: certificateId,
                    user_email: certificate.certificate_user.email, // Use correct alias
                    user_name: certificate.certificate_user.username, // Use correct alias
                    course_title: certificate.certificate_course.title, // Use correct alias
                    sent_at: new Date(),
                    email_count: certificate.email_count || 0
                }
            });
        } else {
            return res.status(500).json({
                success: false,
                message: 'Failed to send certificate email. Please try again.'
            });
        }

    } catch (error) {
        console.error('Send certificate email error:', error);
        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Internal server error'
        });
    }
};


// Revoke certificate
export const revokeCertificate = async (req: Request, res: Response) => {
    try {
        const { certificateId } = req.params;
        const { reason } = req.body;

        const certificate = await Certificate.findByPk(certificateId, {
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'email']
                },
                {
                    model: Course,
                    as: 'course',
                    attributes: ['id', 'title']
                }
            ]
        });

        if (!certificate) {
            return res.status(404).json({
                success: false,
                message: 'Certificate not found'
            });
        }

        if (certificate.status === 'revoked') {
            return res.status(400).json({
                success: false,
                message: 'Certificate is already revoked'
            });
        }

        await certificate.update({
            status: 'revoked',
            revoked_reason: reason || 'Admin decision',
            revoked_at: new Date()
        });

        return res.status(200).json({
            success: true,
            message: 'Certificate revoked successfully',
            data: certificate
        });

    } catch (error) {
        console.error('Revoke certificate error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Reinstate certificate
export const reinstateCertificate = async (req: Request, res: Response) => {
    try {
        const { certificateId } = req.params;

        const certificate = await Certificate.findByPk(certificateId);

        if (!certificate) {
            return res.status(404).json({
                success: false,
                message: 'Certificate not found'
            });
        }

        if (certificate.status === 'issued') {
            return res.status(400).json({
                success: false,
                message: 'Certificate is already issued'
            });
        }

        await certificate.update({
            status: 'issued',
            revoked_reason: null,
            revoked_at: null
        });

        return res.status(200).json({
            success: true,
            message: 'Certificate reinstated successfully',
            data: certificate
        });

    } catch (error) {
        console.error('Reinstate certificate error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Bulk certificate actions
export const bulkCertificateActions = async (req: Request, res: Response) => {
    try {
        const { action, certificate_ids, ...actionData } = req.body;

        if (!action || !certificate_ids || !Array.isArray(certificate_ids)) {
            return res.status(400).json({
                success: false,
                message: 'Action and certificate_ids array are required'
            });
        }

        let results = {
            successful: [] as number[],
            failed: [] as number[],
            messages: [] as string[]
        };

        switch (action) {
            case 'send_email':
                for (const certId of certificate_ids) {
                    try {
                        // Implement bulk email sending
                        results.successful.push(certId);
                    } catch (error) {
                        results.failed.push(certId);
                        results.messages.push(`Failed to send email for certificate ${certId}`);
                    }
                }
                break;

            case 'revoke':
                await Certificate.update(
                    {
                        status: 'revoked',
                        revoked_reason: actionData.reason || 'Bulk revocation',
                        revoked_at: new Date()
                    },
                    {
                        where: {
                            id: { [Op.in]: certificate_ids },
                            status: 'issued'
                        }
                    }
                );
                results.successful = certificate_ids;
                break;

            case 'reinstate':
                await Certificate.update(
                    {
                        status: 'issued',
                        revoked_reason: null,
                        revoked_at: null
                    },
                    {
                        where: {
                            id: { [Op.in]: certificate_ids },
                            status: 'revoked'
                        }
                    }
                );
                results.successful = certificate_ids;
                break;

            default:
                return res.status(400).json({
                    success: false,
                    message: 'Invalid action'
                });
        }

        return res.status(200).json({
            success: true,
            message: `Bulk action '${action}' completed`,
            data: results
        });

    } catch (error) {
        console.error('Bulk certificate actions error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};
export const getUserCertificates = async (req: Request, res: Response) => {
    try {
        const { user_id } = req.params;

        const certificates = await Certificate.findAll({
            where: { user_id },
            include: [
                {
                    model: Course,
                    as: 'certificate_course', // ✅ Use the correct alias defined in your association
                    attributes: ['id', 'title', 'description'],
                }
            ],
            order: [['issued_date', 'DESC']],
        });

        return res.status(200).json({
            success: true,
            data: certificates,
        });
    } catch (error) {
        console.error('Get user certificates error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
};

export const verifyCertificate = async (req: Request, res: Response) => {
    try {
        const { code } = req.params;

        const certificate = await Certificate.findOne({
            where: { certificate_code: code },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'email'],
                },
                {
                    model: Course,
                    as: 'course',
                    attributes: ['id', 'title', 'description'],
                }
            ],
        });

        if (!certificate) {
            return res.status(404).json({
                success: false,
                message: 'Certificate not found',
            });
        }

        return res.status(200).json({
            success: true,
            data: certificate,
        });
    } catch (error) {
        console.error('Verify certificate error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
};

export const downloadCertificate = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user_id = (req as any).user?.id; // Get from auth middleware

        if (!user_id) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated',
            });
        }

        const certificate = await Certificate.findOne({
            where: {
                id,
                user_id,
            },
        });

        if (!certificate) {
            return res.status(404).json({
                success: false,
                message: 'Certificate not found',
            });
        }

        // Increment download count
        await certificate.update({
            download_count: certificate.download_count + 1,
        });

        return res.status(200).json({
            success: true,
            data: {
                download_url: certificate.certificate_url,
                download_count: certificate.download_count,
            },
        });
    } catch (error) {
        console.error('Download certificate error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
};


// controllers/certificate.controller.ts - Simplified version
export const getCertificateStats = async (req: Request, res: Response) => {
    try {
        // Basic counts
        const totalCertificates = await Certificate.count();
        const totalDownloads = await Certificate.sum('download_count') || 0;

        // Certificates issued today
        const certificatesToday = await Certificate.count({
            where: {
                issued_date: {
                    [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)),
                },
            },
        });

        // Get certificates by course without complex includes
        const certificatesByCourseRaw = await Certificate.findAll({
            attributes: [
                'course_id',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
            ],
            group: ['course_id'],
            raw: true,
        });

        // Get course titles separately
        const courseIds = certificatesByCourseRaw.map(item => item.course_id);
        const courses = await Course.findAll({
            where: { id: courseIds },
            attributes: ['id', 'title'],
            raw: true,
        });

        // Combine the data
        const certificatesByCourse = certificatesByCourseRaw.map(item => {
            const course = courses.find(c => c.id === item.course_id);
            return {
                course_id: item.course_id,
                count: item.count,
                course: course ? {
                    id: course.id,
                    title: course.title
                } : null
            };
        });

        // Additional stats
        const totalCourses = await Course.count();
        const activeCourses = await Course.count({
            where: {
                status: 'active',
                is_active: true
            }
        });

        const totalEnrollments = await Enrollment.count();

        // Recent certificates
        const recentCertificates = await Certificate.count({
            where: {
                issued_date: {
                    [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                },
            },
        });

        // Certificate status distribution
        const statusDistributionRaw = await Certificate.findAll({
            attributes: [
                'status',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
            ],
            group: ['status'],
            raw: true,
        });

        const statusDistribution = statusDistributionRaw.map(item => ({
            status: item.status,
            count: item.count
        }));

        return res.status(200).json({
            success: true,
            data: {
                // Certificate stats
                total_certificates: totalCertificates,
                total_downloads: totalDownloads,
                certificates_today: certificatesToday,
                recent_certificates: recentCertificates,

                // Course stats for dashboard
                total_courses: totalCourses,
                active_courses: activeCourses,
                total_enrollments: totalEnrollments,

                // Distributions
                certificates_by_course: certificatesByCourse,
                status_distribution: statusDistribution,

                // Timestamp
                generated_at: new Date().toISOString()
            },
        });
    } catch (error) {
        console.error('Get certificate stats error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
};

export const manuallyCreateCertificate = async (req: Request, res: Response) => {
    try {
        const { user_id, course_id } = req.body;

        const result = await createCertificateForCompletion({
            user_id,
            course_id,
           
        });

        if (result.alreadyExists) {
            return res.status(400).json({
                success: false,
                message: 'Certificate already exists for this user and course',
                data: result.certificate,
            });
        }

        return res.status(201).json({
            success: true,
            message: 'Certificate created successfully',
            data: result.certificate,
        });
    } catch (error) {
        console.error('Manual certificate creation error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Internal server error',
        });
    }
};






export const getAllCertificates = async (req: Request, res: Response) => {
    try {
        const role = req.user.role;
        const userId = req.user.id;
        console.log("User role:", role);
        console.log("User ID:", userId);

        let certificates: any;

        if (role !== 'Super-Admin') {
            // For non-admin users, get courses they created first
            certificates = await Certificate.findAll({
                include: [
                    {
                        model: User,
                        as: 'certificate_user',
                        attributes: ['id', 'username', 'email', 'profileImage']
                    },
                    {
                        model: Course,
                        as: 'certificate_course',
                        attributes: ['id', 'title', 'category', 'description', 'userId'],
                        where: {
                            userId: userId  // Filter by course creator
                        },
                        include: [
                            {
                                model: User,
                                as: 'user',
                                attributes: ['id', 'username', 'role', 'email']
                            }
                        ]
                    }
                ],
                order: [['issued_date', 'DESC']],
                subQuery: false
            });
        } else {
            // Super-Admin sees all certificates
            certificates = await Certificate.findAll({
                include: [
                    {
                        model: User,
                        as: 'certificate_user',
                        attributes: ['id', 'username', 'email', 'profileImage']
                    },
                    {
                        model: Course,
                        as: 'certificate_course',
                        attributes: ['id', 'title', 'category', 'description', 'userId'],
                        include: [
                            {
                                model: User,
                                as: 'user',
                                attributes: ['id', 'username', 'role', 'email']
                            }
                        ]
                    }
                ],
                order: [['issued_date', 'DESC']]
            });
        }

        if (!certificates || certificates.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No certificates found',
                data: [],
                count: 0
            });
        }

        // Format response data
        const formattedCertificates = certificates.map((cert: any) => ({
            id: cert.id,
            certificate_code: cert.certificate_code,
            certificate_url: cert.certificate_url,
            issued_date: cert.issued_date,
            status: cert.status,
            download_count: cert.download_count,
            user: {
                id: cert.certificate_user?.id,
                name: cert.certificate_user?.username,
                email: cert.certificate_user?.email,
                profileImage: cert.certificate_user?.profileImage
            },
            course: {
                id: cert.certificate_course?.id,
                name: cert.certificate_course?.title,
                category: cert.certificate_course?.category,
                description: cert.certificate_course?.description,
                creator: {
                    id: cert.certificate_course?.user?.id,
                    name: cert.certificate_course?.user?.username,
                    role: cert.certificate_course?.user?.role,
                    email: cert.certificate_course?.user?.email
                }
            },
            createdAt: cert.createdAt,
            updatedAt: cert.updatedAt
        }));

        return res.status(200).json({
            success: true,
            message: 'Certificates fetched successfully',
            data: formattedCertificates,
            count: formattedCertificates.length
        });

    } catch (error) {
        console.error('Get all certificates error:', error);
        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Internal server error',
            error: error instanceof Error ? error.stack : undefined
        });
    }
};



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

export const approveCertificateByAdmin = async (req: Request, res: Response) => {
    try {
        const { id } = req.body;
        const role = req.user.role;
        // console.log("this role", req.user);

        const certificate = await Certificate.findByPk(id, {
            include: [
                {
                    model: User,
                    as: 'certificate_user',
                    attributes: ['id', 'username', 'email', 'profileImage']
                },
                {
                    model: Course,
                    as: 'certificate_course',
                    attributes: ['id', 'title', 'category', 'description', 'userId']
                }
            ]
        });

        console.log("1111111111111111111111111111111", JSON.stringify(certificate, null, 2));

        if (!certificate) {
            return res.status(404).json({
                success: false,
                message: 'Certificate not found',
            });
        }

        const courseUserId = certificate.certificate_course?.userId;

        if (!courseUserId) {
            return res.status(404).json({
                success: false,
                message: 'Course creator not found',
            });
        }

        // Fetch the course creator from User table
        const courseCreator = await User.findByPk(courseUserId, {
            attributes: ['id', 'role', 'username', 'email']
        });

        if (!courseCreator) {
            return res.status(404).json({
                success: false,
                message: 'Course creator user not found in database',
            });
        }

        // Check current status and determine new status
        let newStatus: string;
        const currentStatus = certificate.status;
        
        if (courseCreator.role === "Super-Admin") {
            newStatus = 'issued';
        }
        else if (currentStatus === 'admin_approved') {
            newStatus = 'issued';
        }
        else if (currentStatus === 'pending') {
            if (role === "Super-Admin") {
                newStatus = 'wait for admin approval';
            }
            else if (role === "admin") {
                newStatus = 'wait for super-admin approval';
            }
        }
        else if (currentStatus === "wait for admin approval") {
            newStatus = 'issued';
        }
        else if (currentStatus === 'issued') {
            return res.status(400).json({
                success: false,
                message: `Certificate is already ${currentStatus}`,
                data: certificate,
            });
        }
        else if (currentStatus === 'admin_rejected') {
            return res.status(400).json({
                success: false,
                message: `Cannot approve a rejected certificate. Current status: ${currentStatus}`,
                data: certificate,
            });
        }
        else if (currentStatus === 'wait for super-admin approval') {
            newStatus = 'issued';
        }
        else {
            return res.status(400).json({
                success: false,
                message: `Cannot approve certificate with status: ${currentStatus}`,
                data: certificate,
            });
        }

        // Update the certificate status
        await certificate.update({ status: newStatus });

        // Get current admin/super-admin info for audit log
        const currentAdminId = req.user?.id;
        const currentAdminIdNumber = parseInt(currentAdminId as string, 10);
        const currentAdmin = await User.findByPk(currentAdminId);
        const currentAdminName = currentAdmin?.username || currentAdmin?.email || 'System';

        // Create audit log for certificate approval
        await createAuditLog(
            certificate.course_id,
            certificate.certificate_course?.title || 'Unknown Course',
            'Certificate_approved',
            currentAdminIdNumber,
            currentAdminName,
            {
                certificate_id: certificate.id,
                certificate_code: certificate.certificate_code,
                student_name: certificate.certificate_user?.username || certificate.certificate_user?.email,
                old_status: currentStatus,
                new_status: newStatus,
                approved_by_role: role,
                course_creator: courseCreator.username || courseCreator.email,
                approved_at: new Date()
            },
            newStatus === 'issued'
        );

        await sendCertificateGeneratedEmail(
            certificate.certificate_user?.email || '',
            certificate.certificate_user?.username || '',
            certificate.certificate_course?.title || '',
            certificate.certificate_url || '',
            certificate.certificate_code || ''
        );

        return res.status(200).json({
            success: true,
            message: `Certificate approved successfully. Status updated from '${currentStatus}' to '${newStatus}'`,
            data: {
                id: certificate.id,
                certificate_code: certificate.certificate_code,
                certificate_url: certificate.certificate_url,
                issued_date: certificate.issued_date,
                status: newStatus,
                previousStatus: currentStatus,
                download_count: certificate.download_count,
                user_id: certificate.user_id,
                course_id: certificate.course_id,
                updatedAt: certificate.updatedAt,
            }
        });

    } catch (error) {
        console.error('Approve certificate error:', error);
        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Internal server error',
        });
    }
};



export const rejectCertificateByAdmin = async (req: Request, res: Response) => {
    try {
        const { id, reason, role } = req.body;

        console.log("Received rejection request:", id, role);

        // Validate certificate id
        if (!id || typeof id !== 'number') {
            return res.status(400).json({
                success: false,
                message: 'Certificate not found',
            });
        }

        const certificates = await Certificate.findAll({
            where: { id },
            include: [
                {
                    model: User,
                    as: 'certificate_user',
                    attributes: ['id', 'username', 'email', 'profileImage']
                },
                {
                    model: Course,
                    as: 'certificate_course',
                    attributes: ['id', 'title', 'category', 'description']
                }
            ]
        });

        console.log('📋 Full Certificate Object:', JSON.stringify(certificates, null, 2));

        if (!certificates || certificates.length === 0) {
            return res.status(404).json({
                success: false,
                message: `No certificates found for user ID: ${id}`,
            });
        }

        // Determine rejection status based on role
        const rejectionStatus = role === 'Super-Admin'
            ? 'super-admin_rejected'
            : 'admin_rejected';

        // Get current admin info for audit log
        const currentAdminId = req.user?.id;
        const currentAdminIdNumber = parseInt(currentAdminId as string, 10);
        const currentAdmin = await User.findByPk(currentAdminId);
        const currentAdminName = currentAdmin?.username || currentAdmin?.email || 'System';

        // Update all certificates
        const updatedCertificates = [];

        for (const certificate of certificates) {
            const currentStatus = certificate.status;

            // Cannot reject if already issued or revoked
            if (currentStatus === 'issued' || currentStatus === 'revoked') {
                console.log(`Skipping certificate ${certificate.id} with status ${currentStatus}`);
                continue;
            }

            // Update the certificate status
            await certificate.update({ status: rejectionStatus });

            // Create audit log for each rejected certificate
            await createAuditLog(
                certificate.course_id,
                certificate.certificate_course?.title || 'Unknown Course',
                'Certificate_rejected',
                currentAdminIdNumber,
                currentAdminName,
                {
                    certificate_id: certificate.id,
                    certificate_code: certificate.certificate_code,
                    student_name: certificate.certificate_user?.username || certificate.certificate_user?.email,
                    old_status: currentStatus,
                    new_status: rejectionStatus,
                    rejection_reason: reason || 'No reason provided',
                    rejected_by_role: role,
                    rejected_at: new Date()
                },
                false
            );

            updatedCertificates.push({
                id: certificate.id,
                certificate_code: certificate.certificate_code,
                certificate_url: certificate.certificate_url,
                issued_date: certificate.issued_date,
                status: rejectionStatus,
                previousStatus: currentStatus,
                reason: reason || null,
                download_count: certificate.download_count,
                course_id: certificate.course_id,
                updatedAt: certificate.updatedAt,
            });
        }

        if (updatedCertificates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No certificates could be rejected (all are issued or revoked)',
                data: certificates,
            });
        }

        await sendCertificateRejectedEmail(
            certificates[0].certificate_user.email,
            certificates[0].certificate_user.username,
            certificates[0].certificate_course.title,
            reason || undefined,
            // role as 'admin' | 'Super-Admin'
        );

        return res.status(200).json({
            success: true,
            message: `Certificates rejected successfully by ${role}`,
            data: {
                rejectionStatus,
                rejectedBy: role,
                reason: reason || null,
                totalCertificates: certificates.length,
                updatedCount: updatedCertificates.length,
                certificates: updatedCertificates,
            }
        });

    } catch (error) {
        console.error('Reject certificate error:', error);
        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Internal server error',
        });
    }
};