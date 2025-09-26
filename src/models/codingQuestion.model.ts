// models/codingQuestion.model.ts
import { DataTypes } from 'sequelize';
import db from '../util/dbConn';

const CodingQuestion = db.define('coding_questions', {
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
    allowNull: false 
  },
  difficulty: { 
    type: DataTypes.ENUM('easy', 'medium', 'hard'), 
    allowNull: false,
    defaultValue: 'medium'
  },
  test_cases: { 
    type: DataTypes.JSONB, 
    allowNull: false 
  },
  starter_code: { 
    type: DataTypes.JSONB, 
    allowNull: true,
    defaultValue: {}
  },
  solution_code: { 
    type: DataTypes.JSONB, 
    allowNull: true,
    defaultValue: {}
  },
  allowed_languages: { 
    type: DataTypes.ARRAY(DataTypes.STRING), 
    allowNull: false,
    defaultValue: ['javascript', 'python', 'java', 'cpp']
  },
  time_limit: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    defaultValue: 2000
  },
  memory_limit: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    defaultValue: 128000
  },
  course_id: { 
    type: DataTypes.INTEGER, 
    allowNull: false 
  },
  chapter_id: { 
    type: DataTypes.INTEGER, 
    allowNull: false 
  },
  hints: { 
    type: DataTypes.ARRAY(DataTypes.TEXT), 
    allowNull: true,
    defaultValue: []
  },
  tags: { 
    type: DataTypes.ARRAY(DataTypes.STRING), 
    allowNull: true,
    defaultValue: []
  },
  is_active: { 
    type: DataTypes.BOOLEAN, 
    defaultValue: true 
  },
}, {
  timestamps: true,
});

export default CodingQuestion;