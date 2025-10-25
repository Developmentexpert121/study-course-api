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
        video_url: {
            type: DataTypes.STRING,
            allowNull: true,
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
        // ✅ ADD THIS FIELD to match your migration
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