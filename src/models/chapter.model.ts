import { DataTypes } from 'sequelize';
import db from '../util/dbConn';

const Chapter = db.define('chapters', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
  course_id: { type: DataTypes.INTEGER, allowNull: false },
  order: { type: DataTypes.INTEGER, allowNull: false },
  images: { type: DataTypes.JSON, allowNull: true }, // e.g., ["url1", "url2"]
  videos: { type: DataTypes.JSON, allowNull: true }, // e.g., ["url1", "url2"]
}, {
  timestamps: true,
});

export default Chapter;
