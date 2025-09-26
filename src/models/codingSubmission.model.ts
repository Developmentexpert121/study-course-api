// models/codingSubmission.model.ts
import { DataTypes } from 'sequelize';
import db from '../util/dbConn';

const CodingSubmission = db.define('coding_submissions', {
  id: { 
    type: DataTypes.INTEGER, 
    autoIncrement: true, 
    primaryKey: true 
  },
  user_id: { 
    type: DataTypes.INTEGER, 
    allowNull: false 
  },
  chapter_id: { 
    type: DataTypes.INTEGER, 
    allowNull: false 
  },
  course_id: { 
    type: DataTypes.INTEGER, 
    allowNull: false 
  },
  coding_question_id: { 
    type: DataTypes.INTEGER, 
    allowNull: false 
  },
  source_code: { 
    type: DataTypes.TEXT, 
    allowNull: false 
  },
  language: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  test_results: { 
    type: DataTypes.JSONB, 
    allowNull: false,
    defaultValue: []
  },
  total_test_cases: { 
    type: DataTypes.INTEGER, 
    allowNull: false 
  },
  passed_test_cases: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    defaultValue: 0
  },
  score: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    defaultValue: 0
  },
  passed: { 
    type: DataTypes.BOOLEAN, 
    allowNull: false,
    defaultValue: false
  },
  execution_time: { 
    type: DataTypes.FLOAT, 
    allowNull: true,
    defaultValue: 0
  },
  memory_used: { 
    type: DataTypes.INTEGER, 
    allowNull: true,
    defaultValue: 0
  },
  submitted_at: { 
    type: DataTypes.DATE, 
    defaultValue: DataTypes.NOW 
  },
}, {
  timestamps: true,
});

export default CodingSubmission;