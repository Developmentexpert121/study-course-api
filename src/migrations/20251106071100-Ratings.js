// migrations/create-ratings-table.js (Complete Reset Version)
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // First, check if table exists and drop it if it does (clean start)
    const tableExists = await queryInterface.showAllTables().then(tables => 
      tables.includes('Ratings')
    );

    if (tableExists) {
      console.log('Ratings table already exists, dropping for clean start...');
      await queryInterface.dropTable('Ratings');
    }

    // Create the table with ALL columns including created_at and updated_at
    await queryInterface.createTable('Ratings', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
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
      score: {
        type: Sequelize.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
          max: 5,
        },
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
        allowNull: false,
        defaultValue: true,
      },
      review_visibility: {
        type: Sequelize.ENUM('visible', 'hidden_by_admin', 'hidden_by_superadmin'),
        allowNull: false,
        defaultValue: 'visible',
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

    console.log('Ratings table created successfully, now creating indexes...');

    // Create indexes after table is fully created
    const indexes = [
      { columns: ['user_id'], name: 'idx_ratings_user_id' },
      { columns: ['course_id'], name: 'idx_ratings_course_id' },
      { columns: ['score'], name: 'idx_ratings_score' },
      { columns: ['status'], name: 'idx_ratings_status' },
      { columns: ['isactive'], name: 'idx_ratings_isactive' },
      { columns: ['review_visibility'], name: 'idx_ratings_review_visibility' },
      { columns: ['created_at'], name: 'idx_ratings_created_at' },
      { columns: ['user_id', 'course_id'], name: 'uidx_ratings_user_course', unique: true },
      { columns: ['course_id', 'isactive'], name: 'idx_ratings_course_active' },
      { columns: ['course_id', 'status'], name: 'idx_ratings_course_status' },
      { columns: ['course_id', 'review_visibility'], name: 'idx_ratings_course_visibility' },
      { columns: ['course_id', 'score'], name: 'idx_ratings_course_score' }
    ];

    for (const index of indexes) {
      try {
        await queryInterface.addIndex('Ratings', index.columns, { 
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
    await queryInterface.dropTable('Ratings');
  }
};