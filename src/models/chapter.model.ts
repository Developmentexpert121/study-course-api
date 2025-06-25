// models/chapter.model.ts
import { DataTypes } from 'sequelize';
import db from '../util/dbConn';

const Chapter = db.define('chapters', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
  course_id: { type: DataTypes.INTEGER, allowNull: false },
  order: { type: DataTypes.INTEGER, allowNull: false }, // Chapter order
}, {
  timestamps: true,
});

export default Chapter;
