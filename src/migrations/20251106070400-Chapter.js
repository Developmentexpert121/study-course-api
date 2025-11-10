// migrations/create-chapters-table.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('chapters', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false
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
      order: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      images: {
        type: Sequelize.JSON,
        allowNull: true
      },
      videos: {
        type: Sequelize.JSON,
        allowNull: true
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

    // Add indexes for better query performance
    await queryInterface.addIndex('chapters', ['course_id']);
    await queryInterface.addIndex('chapters', ['order']);
    await queryInterface.addIndex('chapters', ['course_id', 'order']); // Composite index for ordering within course

    // Add unique constraint to ensure unique order per course
    await queryInterface.addIndex('chapters', ['course_id', 'order'], {
      unique: true,
      name: 'chapters_course_id_order_unique'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('chapters');
  }
};