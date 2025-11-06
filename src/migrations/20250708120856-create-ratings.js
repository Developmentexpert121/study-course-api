// migrations/YYYYMMDDHHMMSS-create-ratings.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Ratings', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      course_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      score: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('hidebysuperadmin', 'hidebyadmin', 'showtoeveryone'),
        allowNull: false,
        defaultValue: 'showtoeveryone',
      },
      review: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      isactive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      review_visibility: {
        type: Sequelize.ENUM('visible', 'hidden_by_admin', 'hidden_by_superadmin'),
        allowNull: false,
        defaultValue: 'visible',
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
    await queryInterface.addIndex('Ratings', ['user_id']);
    await queryInterface.addIndex('Ratings', ['course_id']);
    await queryInterface.addIndex('Ratings', ['status']);
    await queryInterface.addIndex('Ratings', ['isactive']);
    await queryInterface.addIndex('Ratings', ['review_visibility']);
    
    // Composite index for common queries
    await queryInterface.addIndex('Ratings', ['course_id', 'isactive']);
    await queryInterface.addIndex('Ratings', ['user_id', 'course_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Ratings');
  }
};