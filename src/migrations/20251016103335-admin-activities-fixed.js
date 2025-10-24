'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // First check if table exists
    const tableExists = await queryInterface.showAllTables();
    
    if (tableExists.includes('admin_activities')) {
      console.log('Table admin_activities already exists, skipping creation');
      return;
    }

    await queryInterface.createTable('admin_activities', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      admin_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      activity_type: {
        type: Sequelize.STRING,
        allowNull: false
      }
    });

    // Add index with custom name and check if it exists
    const indexes = await queryInterface.showIndex('admin_activities');
    const indexExists = indexes.some(index => index.name === 'idx_admin_activities_admin_id');
    
    if (!indexExists) {
      await queryInterface.addIndex('admin_activities', ['admin_id'], {
        name: 'idx_admin_activities_admin_id'
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('admin_activities');
  }
};