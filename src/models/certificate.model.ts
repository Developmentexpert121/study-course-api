// models/certificate.model.ts
import { DataTypes } from 'sequelize';
import db from '../util/dbConn';

const Certificate = db.define('certificates', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    course_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    certificate_code: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    certificate_url: {
        type: DataTypes.STRING,
        allowNull: false
    },
    issued_date: {
        type: DataTypes.DATE,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM(
            'pending',
            'admin_approved',
            'admin_rejected',
            'super-admin_approved',
            'super-admin_rejected',
            'issued',
        ),
        allowNull: false,
        defaultValue: 'pending'
    },
    download_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
}, {
    timestamps: true,
    tableName: 'certificates'
});

export default Certificate;