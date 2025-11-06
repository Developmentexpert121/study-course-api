// migrations/YYYYMMDDHHMMSS-create-courses.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('courses', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      subtitle: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      category: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      additional_categories: {
        type: Sequelize.JSON,
        allowNull: true,
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
      intro_video: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      creator: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
      },
      price_type: {
        type: Sequelize.ENUM('free', 'paid'),
        allowNull: false,
        defaultValue: 'free',
      },
      duration: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('draft', 'active', 'inactive'),
        allowNull: false,
        defaultValue: 'draft',
      },
      features: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: [],
      },
      ratings: {
        type: Sequelize.FLOAT,
        allowNull: true,
        defaultValue: 0,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Add indexes for better performance
    await queryInterface.addIndex('courses', ['title']);
    await queryInterface.addIndex('courses', ['category']);
    await queryInterface.addIndex('courses', ['is_active']);
    await queryInterface.addIndex('courses', ['price_type']);
    await queryInterface.addIndex('courses', ['status']);
    await queryInterface.addIndex('courses', ['userId']);
    await queryInterface.addIndex('courses', ['ratings']);
    
    // Composite indexes for common query patterns
    await queryInterface.addIndex('courses', ['is_active', 'status']);
    await queryInterface.addIndex('courses', ['category', 'is_active']);
    await queryInterface.addIndex('courses', ['price_type', 'status']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('courses');
  }
};