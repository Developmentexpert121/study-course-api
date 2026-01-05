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
  subtitle: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  additional_categories: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },
  mode: {
    type: DataTypes.ENUM('offline', 'online'),
    allowNull: false,
    defaultValue: 'online', 
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
  intro_video: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  creator: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  price_type: {
    type: DataTypes.ENUM('free', 'paid'),
    allowNull: false,
    defaultValue: 'free',
  },
  duration: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('draft', 'active', 'inactive'),
    allowNull: false,
    defaultValue: 'draft',
  },
  features: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },
  ratings: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0,
  },
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
 