// controllers/certificate.controller.ts
import { Request, Response } from 'express';
import Certificate from '../../models/certificate.model';
import Course from '../../models/course.model';
import User from '../../models/user.model';
import { Op } from 'sequelize';
import sequelize from '../../util/dbConn';
import { createCertificateForCompletion } from '../../helpers/certificate.createAndSend';

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

export const getCertificateStats = async (req: Request, res: Response) => {
    try {
        const totalCertificates = await Certificate.count();
        const totalDownloads = await Certificate.sum('download_count');
        const certificatesToday = await Certificate.count({
            where: {
                issued_date: {
                    [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)),
                },
            },
        });

        // Certificates per course
        const certificatesByCourse = await Certificate.findAll({
            attributes: [
                'course_id',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
            ],
            include: [
                {
                    model: Course,
                    as: 'course',
                    attributes: ['title'],
                },
            ],
            group: ['course_id', 'Course.id'],
        });

        return res.status(200).json({
            success: true,
            data: {
                total_certificates: totalCertificates,
                total_downloads: totalDownloads || 0,
                certificates_today: certificatesToday,
                certificates_by_course: certificatesByCourse,
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