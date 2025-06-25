'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_progress', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      course_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      chapter_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      completed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      mcq_passed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      locked: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()'),
      }
    });

    // Add unique index
    await queryInterface.addIndex('user_progress', ['user_id', 'course_id', 'chapter_id'], {
      unique: true,
      name: 'user_progress_unique_index'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('user_progress');
  }
};
