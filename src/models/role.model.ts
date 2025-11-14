import { DataTypes } from 'sequelize';
import db from '../util/dbConn';

const Role = db.define('roles', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    permissions: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {}
    }
}, {
    timestamps: true,
    tableName: 'roles'
});

// Association method
Role.associate = function (models) {
    Role.hasMany(models.User, {
        foreignKey: 'role_id',
        as: 'users'
    });
};

export default Role;