import { DataTypes } from 'sequelize';
import db from '../util/dbConn';

const Enrollment = db.define('enrollments', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  course_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  enrolled_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: true, // This creates createdAt and updatedAt
  indexes: [
    { fields: ['user_id', 'course_id'], unique: true },
    { fields: ['enrolled_at'] } // Index for better query performance
  ],
});

export default Enrollment;