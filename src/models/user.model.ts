import { DataTypes } from 'sequelize';
import db from '../util/dbConn';

const User = db.define('users', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'user'
  },
  verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  profileImage: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null,
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'active', 'inactive'),
    allowNull: false,
    defaultValue: 'pending'
  }
}, {
  timestamps: true, // Add this to ensure createdAt and updatedAt are included
  tableName: 'users' // Explicitly define table name
});

// Remove User.sync() or use it properly
// User.sync({ force: false }) // Only use during development

export default User;