// migrations/create-modules-table.js (Complete Reset Version)
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // First, check if table exists and drop it if it does (clean start)
    const tableExists = await queryInterface.showAllTables().then(tables => 
      tables.includes('modules')
    );

    if (tableExists) {
      console.log('Modules table already exists, dropping for clean start...');
      await queryInterface.dropTable('modules');
    }

    // Create the table with ALL columns including created_at and updated_at
    await queryInterface.createTable('modules', {
      id: { 
        type: Sequelize.INTEGER, 
        autoIncrement: true, 
        primaryKey: true 
      },
      title: { 
        type: Sequelize.STRING, 
        allowNull: false 
      },
      description: { 
        type: Sequelize.TEXT, 
        allowNull: true 
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
      chapters: { 
        type: Sequelize.JSON, 
        allowNull: true,
        defaultValue: []
      },
      is_active: { 
        type: Sequelize.BOOLEAN, 
        allowNull: false,
        defaultValue: true 
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

    console.log('Modules table created successfully, now creating indexes...');

    // Create indexes after table is fully created
    const indexes = [
      { columns: ['course_id'], name: 'idx_modules_course_id' },
      { columns: ['order'], name: 'idx_modules_order' },
      { columns: ['is_active'], name: 'idx_modules_is_active' },
      { columns: ['created_at'], name: 'idx_modules_created_at' },
      { columns: ['course_id', 'order'], name: 'uidx_modules_course_order', unique: true },
      { columns: ['course_id', 'is_active'], name: 'idx_modules_course_active' }
    ];

    for (const index of indexes) {
      try {
        await queryInterface.addIndex('modules', index.columns, { 
          name: index.name,
          unique: index.unique || false
        });
        console.log(`✓ Created index: ${index.name}`);
      } catch (error) {
        console.log(`⚠ Index ${index.name} already exists: ${error.message}`);
      }
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('modules');
  }
};