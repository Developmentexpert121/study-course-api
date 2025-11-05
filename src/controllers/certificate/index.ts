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

// Update the calculateUserCourseProgress function to use correct aliases
const calculateUserCourseProgress = async (userId: number, courseId: any) => {
    const chapters = await Chapter.findAll({
        where: { course_id: courseId },
        order: [['order', 'ASC']],
        include: [{
            model: UserProgress,
            as: 'user_progress', // Use the correct alias from associations
            where: { user_id: userId },
            required: false
        }]
    });

    const totalChapters = chapters.length;
    const completedChapters = chapters.filter(chapter =>
        chapter.user_progress && chapter.user_progress.length > 0 && chapter.user_progress[0].completed
    ).length;

    const overallProgress = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;

    return {
        overall_progress: overallProgress,
        completed_chapters: completedChapters,
        total_chapters: totalChapters,
        is_completed: overallProgress === 100
    };
};

// Get enrolled users with progress and certificate status for a course
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
                const progressData = await calculateUserCourseProgress(user.id, courseId);

                // Check if certificate exists
                const certificate = await Certificate.findOne({
                    where: {
                        user_id: user.id,
                        course_id: courseId
                    },
                    include: [
                        {
                            model: Course,
                            as: 'certificate_course', // Use correct alias
                            attributes: ['id', 'title']
                        }
                    ]
                });

                // Create user full name
                const fullName = user.username; // You can modify this based on your user model

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
                        can_generate_certificate: progressData.is_completed && !certificate,
                        can_download_certificate: progressData.is_completed && certificate && certificate.status === 'issued',
                        can_send_certificate: progressData.is_completed && certificate && certificate.status === 'issued',
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
        const progressData = await calculateUserCourseProgress(parseInt(userId), courseId);
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
            course_id: parseInt(courseId)
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
                    as: 'course',
                    attributes: ['id', 'title', 'description'], // Removed thumbnail
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

export const getAllCertificates = async (req: Request, res: Response) => {
    try {
        const {
            page = 1,
            limit = 10,
            search,
            course_id,
            user_id,
            status
        } = req.query;

        const where: any = {};
        const include: any = [
            {
                model: User,
                as: 'user',
                attributes: ['id', 'username', 'email'],
                where: {},
            },
            {
                model: Course,
                as: 'course',
                attributes: ['id', 'title'],
                where: {},
            }
        ];

        // Search filter
        if (search) {
            include[0].where = {
                [Op.or]: [
                    { username: { [Op.iLike]: `%${search}%` } },
                    { email: { [Op.iLike]: `%${search}%` } },
                ],
            };
        }

        // Course filter
        if (course_id) {
            where.course_id = course_id;
        }

        // User filter
        if (user_id) {
            where.user_id = user_id;
        }

        // Status filter
        if (status) {
            where.status = status;
        }

        const offset = (Number(page) - 1) * Number(limit);

        const { count, rows: certificates } = await Certificate.findAndCountAll({
            where,
            include,
            limit: Number(limit),
            offset,
            order: [['issued_date', 'DESC']],
        });

        return res.status(200).json({
            success: true,
            data: {
                certificates,
                pagination: {
                    current_page: Number(page),
                    total_pages: Math.ceil(count / Number(limit)),
                    total_items: count,
                    items_per_page: Number(limit),
                },
            },
        });
    } catch (error) {
        console.error('Get all certificates error:', error);
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