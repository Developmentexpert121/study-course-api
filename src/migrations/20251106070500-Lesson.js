// migrations/create-lessons-table.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('lessons', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      chapter_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'chapters',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      order: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      lesson_type: {
        type: Sequelize.ENUM('video', 'text', 'quiz', 'assignment'),
        allowNull: false,
        defaultValue: 'text',
      },
      duration: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Duration in minutes'
      },
      video_url: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      resources: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'e.g., [{name: "PDF", url: "..."}]'
      },
      is_free: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      is_preview: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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
    await queryInterface.addIndex('lessons', ['chapter_id']);
    await queryInterface.addIndex('lessons', ['order']);
    await queryInterface.addIndex('lessons', ['lesson_type']);
    await queryInterface.addIndex('lessons', ['is_free']);
    await queryInterface.addIndex('lessons', ['is_preview']);
    
    // Composite unique index to ensure unique order within chapter
    await queryInterface.addIndex('lessons', ['chapter_id', 'order'], {
      unique: true,
      name: 'lessons_chapter_id_order_unique'
    });
    
    // Composite index for common queries
    await queryInterface.addIndex('lessons', ['chapter_id', 'lesson_type']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('lessons');
  }
};