// models/mcqSubmission.model.ts
import { DataTypes } from 'sequelize';
import db from '../util/dbConn';

const McqSubmission = db.define('mcq_submission', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  course_id: { type: DataTypes.INTEGER, allowNull: false },
  chapter_id: { type: DataTypes.INTEGER, allowNull: false },
  answers: { type: DataTypes.JSONB, allowNull: false }, // { mcqId: selectedOptionIndex }
  score: { type: DataTypes.FLOAT, allowNull: false },
  passed: { type: DataTypes.BOOLEAN, defaultValue: false },
  total_questions: { type: DataTypes.INTEGER, allowNull: false },
  correct_answers: { type: DataTypes.INTEGER, allowNull: false },
  submitted_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  timestamps: true,
  indexes: [
    { fields: ['user_id', 'chapter_id'] }
  ]
});

export default McqSubmission;