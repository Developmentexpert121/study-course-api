// models/mcq.model.js
import { DataTypes } from 'sequelize';
import db from '../util/dbConn';

const Mcq = db.define('mcqs', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  chapter_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'chapters',
      key: 'id'
    }
  },
  course_id: { // ✅ ADD THIS FIELD
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'courses',
      key: 'id'
    }
  },
  question: { type: DataTypes.TEXT, allowNull: false },
  options: { type: DataTypes.JSONB, allowNull: false },
  correct_answer: { type: DataTypes.INTEGER, allowNull: false },
  explanation: { type: DataTypes.TEXT, allowNull: true },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
  timestamps: true,
  tableName: 'mcqs'
});

export default Mcq;