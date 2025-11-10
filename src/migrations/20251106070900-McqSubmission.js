// migrations/create-mcq-submissions-table.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('mcq_submission', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      course_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'courses',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      chapter_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'chapters',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      answers: {
        type: Sequelize.JSONB,
        allowNull: false,
        comment: 'Stores answers as { mcqId: selectedOptionIndex }'
      },
      score: {
        type: Sequelize.FLOAT,
        allowNull: false
      },
      passed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      total_questions: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      correct_answers: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      submitted_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes for better query performance
    await queryInterface.addIndex('mcq_submission', ['user_id', 'chapter_id']);
    await queryInterface.addIndex('mcq_submission', ['user_id']);
    await queryInterface.addIndex('mcq_submission', ['course_id']);
    await queryInterface.addIndex('mcq_submission', ['chapter_id']);
    await queryInterface.addIndex('mcq_submission', ['submitted_at']);
    await queryInterface.addIndex('mcq_submission', ['passed']);
    await queryInterface.addIndex('mcq_submission', ['score']);
    
    // Composite indexes for common queries
    await queryInterface.addIndex('mcq_submission', ['user_id', 'course_id']);
    await queryInterface.addIndex('mcq_submission', ['user_id', 'submitted_at']);
    await queryInterface.addIndex('mcq_submission', ['chapter_id', 'submitted_at']);
    
    // Unique constraint to prevent duplicate submissions for same user/chapter
    // Remove if you want to allow multiple attempts
    // await queryInterface.addIndex('mcq_submission', ['user_id', 'chapter_id'], {
    //   unique: true,
    //   name: 'mcq_submission_user_chapter_unique'
    // });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('mcq_submission');
  }
};