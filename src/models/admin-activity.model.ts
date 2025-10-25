// models/admin-activity.model.ts
import { DataTypes } from "sequelize";
import sequelize from "../util/dbConn";

const AdminActivity = sequelize.define('admin_activities', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  admin_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  activity_type: {
    type: DataTypes.STRING,
    allowNull: false
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: false, // Keep this false
  tableName: 'admin_activities'
});

export default AdminActivity;