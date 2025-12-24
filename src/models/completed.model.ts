// models/progress.model.ts
import { DataTypes } from 'sequelize';
import db from '../util/dbConn';
import User from './user.model';
import Course from './course.model';
import Chapter from './chapter.model';

const Progress = db.define('progress', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users', // Table name (not model name)
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  courseId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'courses', // Table name (not model name)
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  chapterId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'chapters', // Table name (not model name)
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  completed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
}, {
  timestamps: true,
});

Progress.belongsTo(User, { foreignKey: 'userId' });
Progress.belongsTo(Course, { foreignKey: 'courseId' });
Progress.belongsTo(Chapter, { foreignKey: 'chapterId' });

export default Progress;