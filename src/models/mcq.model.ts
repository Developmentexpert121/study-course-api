import { DataTypes } from 'sequelize';
import db from '../util/dbConn';

const Mcq = db.define('mcqs', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  question: { type: DataTypes.TEXT, allowNull: false },
  options: { type: DataTypes.JSONB, allowNull: false }, 
  answer: { type: DataTypes.STRING, allowNull: false }, 
  course_id: { type: DataTypes.INTEGER, allowNull: false },
  chapter_id: { type: DataTypes.INTEGER, allowNull: false },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  timestamps: true,
});

export default Mcq;
