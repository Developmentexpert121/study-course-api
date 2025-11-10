// migrations/create-wishlist-table.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('wishlist', {
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
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add unique composite index to prevent duplicate wishlist items
    await queryInterface.addIndex('wishlist', ['user_id', 'course_id'], {
      unique: true,
      name: 'wishlist_user_id_course_id_unique'
    });

    // Add individual indexes for better query performance
    await queryInterface.addIndex('wishlist', ['user_id']);
    await queryInterface.addIndex('wishlist', ['course_id']);
    await queryInterface.addIndex('wishlist', ['createdAt']);

    // Composite indexes for common queries
    await queryInterface.addIndex('wishlist', ['user_id', 'createdAt']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('wishlist');
  }
};