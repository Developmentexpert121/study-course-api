import { DataTypes } from 'sequelize';
import db from '../util/dbConn';

const Course = db.define('courses', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  category: {
    type: DataTypes.STRING,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  image: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  creator: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  ratings: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0,
  },
  // ADD THIS userId FIELD TO YOUR MODEL
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    }
  }
}, {
  timestamps: true,
});

export default Course;