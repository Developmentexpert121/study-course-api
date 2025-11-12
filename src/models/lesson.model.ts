import { DataTypes } from 'sequelize';
import db from '../util/dbConn.js';

const Lesson = db.define(
    'lessons',
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        title: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        chapter_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'chapters',
                key: 'id',
            },
        },
        order: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        lesson_type: {
            type: DataTypes.ENUM('video', 'text', 'quiz', 'assignment'),
            allowNull: false,
            defaultValue: 'text',
        },
        duration: {
            type: DataTypes.INTEGER, // in minutes
            allowNull: true,
        },

        images: {
            type: DataTypes.JSON, // Array of image URLs
            allowNull: true,
            defaultValue: [],
        },
        videos: {
            type: DataTypes.JSON, // Array of video URLs (e.g., internal uploads)
            allowNull: true,
            defaultValue: [],
        },
        video_urls: {
            type: DataTypes.JSON, // Array of external video URLs (e.g., YouTube, Vimeo)
            allowNull: true,
            defaultValue: [],
        },

        resources: {
            type: DataTypes.JSON, // e.g., [{name: "PDF", url: "..."}]
            allowNull: true,
        },
        is_free: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },

        is_preview: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
    },
    {
        timestamps: true,
        underscored: true,
        tableName: 'lessons',
    }
);

export default Lesson;