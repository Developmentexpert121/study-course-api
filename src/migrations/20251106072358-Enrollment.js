// migrations/create-enrollments-table.js (Safe Version)
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // First check if table exists
    const tableExists = await queryInterface.showAllTables().then(tables => 
      tables.includes('enrollments')
    );

    if (!tableExists) {
      await queryInterface.createTable('enrollments', {
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
        enrolled_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
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

      // Create indexes only for new table
      await queryInterface.addIndex('enrollments', ['user_id', 'course_id'], {
        unique: true,
        name: 'uidx_enrollments_user_course'
      });
      await queryInterface.addIndex('enrollments', ['user_id'], {
        name: 'idx_enrollments_user_id'
      });
      await queryInterface.addIndex('enrollments', ['course_id'], {
        name: 'idx_enrollments_course_id'
      });
      await queryInterface.addIndex('enrollments', ['enrolled_at'], {
        name: 'idx_enrollments_enrolled_at'
      });
      await queryInterface.addIndex('enrollments', ['created_at'], {
        name: 'idx_enrollments_created_at'
      });
    } else {
      console.log('Enrollments table already exists, skipping creation...');
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('enrollments');
  }
};