// models/userProgress.model.js - FIX THIS!
import { DataTypes } from 'sequelize';
import db from '../util/dbConn';

const UserProgress = db.define('user_progress', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  course_id: { type: DataTypes.INTEGER, allowNull: false },
  chapter_id: { type: DataTypes.INTEGER, allowNull: false },
  lesson_id: { type: DataTypes.INTEGER, allowNull: true }, // ✅ Allow null
  completed: { type: DataTypes.BOOLEAN, defaultValue: false },
  mcq_passed: { type: DataTypes.BOOLEAN, defaultValue: false },
  locked: { type: DataTypes.BOOLEAN, defaultValue: true },
  lesson_completed: { type: DataTypes.BOOLEAN, defaultValue: false },
  completed_at: { type: DataTypes.DATE, allowNull: true },
}, {
  timestamps: true,
  tableName: 'user_progress',
  indexes: [
    // ✅ FIXED: Include lesson_id in unique constraint
    {
      unique: true,
      fields: ['user_id', 'course_id', 'chapter_id', 'lesson_id']
    },
    { fields: ['user_id'] },
    { fields: ['course_id'] },
    { fields: ['chapter_id'] },
    { fields: ['lesson_id'] }
  ],
});

export default UserProgress;