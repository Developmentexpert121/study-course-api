// migrations/create-admin-activities-table.js (Updated)
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('admin_activities', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      admin_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      activity_type: {
        type: Sequelize.STRING,
        allowNull: false
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

    // Use unique index names to avoid conflicts
    await queryInterface.addIndex('admin_activities', ['admin_id'], {
      name: 'idx_admin_activities_admin_id'
    });

    await queryInterface.addIndex('admin_activities', ['created_at'], {
      name: 'idx_admin_activities_created_at'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('admin_activities');
  }
};