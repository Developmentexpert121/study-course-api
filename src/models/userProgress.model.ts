// models/userProgress.model.ts
import { DataTypes } from 'sequelize';
import db from '../util/dbConn';

const UserProgress = db.define('user_progress', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  course_id: { type: DataTypes.INTEGER, allowNull: false },
  chapter_id: { type: DataTypes.INTEGER, allowNull: false },
  completed: { type: DataTypes.BOOLEAN, defaultValue: false },
  mcq_passed: { type: DataTypes.BOOLEAN, defaultValue: false },
  locked: { type: DataTypes.BOOLEAN, defaultValue: true }, 

}, {
  timestamps: true,
  indexes: [{ fields: ['user_id', 'course_id', 'chapter_id'], unique: true }],
});

export default UserProgress;
