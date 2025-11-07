// migrations/create-user-progress-table.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_progress', {
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
      lesson_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: null,
        references: {
          model: 'lessons',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      completed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      mcq_passed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      locked: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      lesson_completed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      completed_lessons: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Stores completed lesson IDs as JSON string or comma-separated values'
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

    // Add indexes as defined in the model
    await queryInterface.addIndex('user_progress', 
      ['user_id', 'course_id', 'chapter_id', 'lesson_id'], {
      unique: true,
      name: 'user_progress_user_id_course_id_chapter_id_lesson_id_key'
    });

    await queryInterface.addIndex('user_progress', ['user_id'], {
      name: 'user_progress_user_id_idx'
    });

    await queryInterface.addIndex('user_progress', ['course_id'], {
      name: 'user_progress_course_id_idx'
    });

    await queryInterface.addIndex('user_progress', ['chapter_id'], {
      name: 'user_progress_chapter_id_idx'
    });

    await queryInterface.addIndex('user_progress', ['lesson_id'], {
      name: 'user_progress_lesson_id_idx'
    });

    // Additional indexes for better query performance
    await queryInterface.addIndex('user_progress', ['completed']);
    await queryInterface.addIndex('user_progress', ['mcq_passed']);
    await queryInterface.addIndex('user_progress', ['locked']);
    await queryInterface.addIndex('user_progress', ['lesson_completed']);
    await queryInterface.addIndex('user_progress', ['completed_at']);
    
    // Composite indexes for common queries
    await queryInterface.addIndex('user_progress', ['user_id', 'course_id']);
    await queryInterface.addIndex('user_progress', ['user_id', 'completed']);
    await queryInterface.addIndex('user_progress', ['course_id', 'user_id']);
    await queryInterface.addIndex('user_progress', ['chapter_id', 'user_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('user_progress');
  }
};