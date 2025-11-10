// migrations/create-learning-paths-table.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('learning_paths', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      category: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      difficulty: {
        type: Sequelize.ENUM('beginner', 'intermediate', 'advanced'),
        allowNull: false,
      },
      estimated_duration: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Duration in hours'
      },
      courses_order: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: [],
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      image: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
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
    await queryInterface.addIndex('learning_paths', ['title']);
    await queryInterface.addIndex('learning_paths', ['category']);
    await queryInterface.addIndex('learning_paths', ['difficulty']);
    await queryInterface.addIndex('learning_paths', ['is_active']);
    await queryInterface.addIndex('learning_paths', ['created_by']);
    await queryInterface.addIndex('learning_paths', ['created_at']);
    
    // Composite indexes for common queries
    await queryInterface.addIndex('learning_paths', ['category', 'difficulty']);
    await queryInterface.addIndex('learning_paths', ['is_active', 'difficulty']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('learning_paths');
  }
};