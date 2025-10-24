import { DataTypes } from 'sequelize';
import db from '../util/dbConn';

const Module = db.define('modules', {
  id: { 
    type: DataTypes.INTEGER, 
    autoIncrement: true, 
    primaryKey: true 
  },
  title: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  description: { 
    type: DataTypes.TEXT, 
    allowNull: true 
  },
  course_id: { 
    type: DataTypes.INTEGER, 
    allowNull: false 
  },
  order: { 
    type: DataTypes.INTEGER, 
    allowNull: false 
  },
  chapters: { 
    type: DataTypes.JSON, 
    allowNull: true,
    defaultValue: [] // Array of chapter objects
  },
  is_active: { 
    type: DataTypes.BOOLEAN, 
    defaultValue: true 
  },
}, {
  timestamps: true,
});

export default Module;