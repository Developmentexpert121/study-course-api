// models/comment.model.ts
import { DataTypes } from 'sequelize';
import db from '../util/dbConn';
import User from './user.model';
import Course from './course.model';

const Comment = db.define('comments', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
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
}, {
  timestamps: true,
});

Comment.belongsTo(User, { foreignKey: 'userId' });
Comment.belongsTo(Course, { foreignKey: 'courseId' });

export default Comment;
