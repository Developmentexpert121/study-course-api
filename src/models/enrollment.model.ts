// models/enrollment.model.ts
import { DataTypes } from 'sequelize';
import db from '../util/dbConn';

const Enrollment = db.define('enrollments', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  course_id: { type: DataTypes.INTEGER, allowNull: false },
}, {
  timestamps: true,
  indexes: [{ fields: ['user_id', 'course_id'], unique: true }],
});

export default Enrollment;
