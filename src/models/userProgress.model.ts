// models/userProgress.model.js - ENHANCED
import { DataTypes } from 'sequelize';
import db from '../util/dbConn';

const UserProgress = db.define('user_progress', {
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
  chapter_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  lesson_id: {
    type: DataTypes.INTEGER,
    allowNull: true, // ✅ Critical for chapter-level records
    defaultValue: null
  },
  completed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  mcq_passed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  locked: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  lesson_completed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  completed_lessons: {
    type: DataTypes.TEXT,
    allowNull: true
  },
}, {
  timestamps: true,
  tableName: 'user_progress',
  indexes: [
    {
      unique: true,
      name: 'user_progress_user_id_course_id_chapter_id_lesson_id_key',
      fields: ['user_id', 'course_id', 'chapter_id', 'lesson_id']
    },
    {
      name: 'user_progress_user_id_idx',
      fields: ['user_id']
    },
    {
      name: 'user_progress_course_id_idx',
      fields: ['course_id']
    },
    {
      name: 'user_progress_chapter_id_idx',
      fields: ['chapter_id']
    },
    {
      name: 'user_progress_lesson_id_idx',
      fields: ['lesson_id']
    }
  ],
});

export default UserProgress;