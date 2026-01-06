import { DataTypes } from 'sequelize';
import db from '../util/dbConn';
import Certificate from './certificate.model';

const CourseAuditLog = db.define('course_audit_logs', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  course_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    // Remove the references constraint to prevent cascade deletion
    // Or change onDelete to 'SET NULL' or 'NO ACTION'
  },
  course_title: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Stored for reference even after course deletion'
  },
  action: {
    type: DataTypes.ENUM('created', 'updated', 'activated', 'deactivated', 'deleted', 'enrolled','unenrolled' ,'Certificate_approved','Certificate_rejected','course_complete','rating_added','rating delete','chapter_added','chapter_delete','lesson_added','lesson_delete','new_user'),
    allowNull: false,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
    onDelete: 'SET NULL', // Keep the log even if user is deleted
    comment: 'User who performed the action'
  },
  user_name: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Stored for reference even after user deletion'
  },
  changed_fields: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Object containing old and new values of changed fields'
  },
  is_active_status: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    comment: 'Course active status at the time of action'
  },
  action_timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  }
}, {
  timestamps: false, // We're using custom timestamp field
  indexes: [
    {
      fields: ['course_id']
    },
    {
      fields: ['action']
    },
    {
      fields: ['action_timestamp']
    },
    {
      fields: ['user_id']
    }
  ]
});

export default CourseAuditLog;