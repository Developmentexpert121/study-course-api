// migrations/create-mcqs-table.js (Complete Fixed Version)
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // First, check if table exists and drop it if it does (clean start)
    const tableExists = await queryInterface.showAllTables().then(tables => 
      tables.includes('mcqs')
    );

    if (tableExists) {
      await queryInterface.dropTable('mcqs');
    }

    // Create the table with ALL columns including course_id
    await queryInterface.createTable('mcqs', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      chapter_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'chapters',
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
      question: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      options: {
        type: Sequelize.JSONB,
        allowNull: false
      },
      correct_answer: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Index of the correct option (0-based)'
      },
      explanation: {
        type: Sequelize.TEXT,
        allowNull: true
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

    // Now create indexes
    console.log('Creating indexes for mcqs table...');
    
    const indexes = [
      { columns: ['chapter_id'], name: 'idx_mcqs_chapter_id' },
      { columns: ['course_id'], name: 'idx_mcqs_course_id' },
      { columns: ['is_active'], name: 'idx_mcqs_is_active' },
      { columns: ['created_at'], name: 'idx_mcqs_created_at' },
      { columns: ['course_id', 'is_active'], name: 'idx_mcqs_course_active' },
      { columns: ['chapter_id', 'is_active'], name: 'idx_mcqs_chapter_active' }
    ];

    for (const index of indexes) {
      try {
        await queryInterface.addIndex('mcqs', index.columns, { name: index.name });
        console.log(`✓ Created index: ${index.name}`);
      } catch (error) {
        console.log(`⚠ Index ${index.name} already exists: ${error.message}`);
      }
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('mcqs');
  }
};