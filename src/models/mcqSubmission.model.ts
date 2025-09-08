import { DataTypes } from 'sequelize';
import db from '../util/dbConn';

// Make sure your McqSubmission model has all required fields
const McqSubmission = db.define('mcq_submissions', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  chapter_id: { type: DataTypes.INTEGER, allowNull: false },
  course_id: { type: DataTypes.INTEGER, allowNull: false },
  answers: { type: DataTypes.JSONB, allowNull: false },
  score: { type: DataTypes.INTEGER, allowNull: false },
  total_questions: { type: DataTypes.INTEGER, allowNull: false },
  percentage: { type: DataTypes.FLOAT, allowNull: false },
  passed: { type: DataTypes.BOOLEAN, allowNull: false },
  submitted_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  timestamps: true,
});

export default McqSubmission;