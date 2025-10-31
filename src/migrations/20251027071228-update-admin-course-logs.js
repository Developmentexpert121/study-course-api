'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if table exists
    const tableExists = await queryInterface.showAllTables()
      .then(tables => tables.includes('course_audit_logs'));

    if (!tableExists) {
      // Create table if it doesn't exist
      await queryInterface.createTable('course_audit_logs', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          allowNull: false,
          primaryKey: true,
        },
        course_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'courses',
            key: 'id',
          },
          onDelete: 'CASCADE'
        },
        action: {
          type: Sequelize.ENUM('created', 'updated', 'activated', 'deactivated', 'deleted'),
          allowNull: false,
        },
        user_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id',
          },
          comment: 'User who performed the action'
        },
        changed_fields: {
          type: Sequelize.JSON,
          allowNull: true,
          comment: 'Object containing old and new values of changed fields'
        },
        metadata: {
          type: Sequelize.JSON,
          allowNull: true,
          comment: 'Additional context like IP address, user agent, etc.'
        },
        timestamp: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        }
      });

      // Add indexes
      await queryInterface.addIndex('course_audit_logs', ['course_id'], {
        name: 'course_audit_logs_course_id_idx'
      });

      await queryInterface.addIndex('course_audit_logs', ['action'], {
        name: 'course_audit_logs_action_idx'
      });

      await queryInterface.addIndex('course_audit_logs', ['timestamp'], {
        name: 'course_audit_logs_timestamp_idx'
      });
    } else {
      // Table exists, check and add missing columns
      const tableDescription = await queryInterface.describeTable('course_audit_logs');

      // Add metadata column if it doesn't exist
      if (!tableDescription.metadata) {
        await queryInterface.addColumn('course_audit_logs', 'metadata', {
          type: Sequelize.JSON,
          allowNull: true,
          comment: 'Additional context like IP address, user agent, etc.'
        });
      }

      // Remove columns that are no longer in the model
      if (tableDescription.course_title) {
        await queryInterface.removeColumn('course_audit_logs', 'course_title');
      }
      if (tableDescription.user_name) {
        await queryInterface.removeColumn('course_audit_logs', 'user_name');
      }
      if (tableDescription.is_active_status) {
        await queryInterface.removeColumn('course_audit_logs', 'is_active_status');
      }
      if (tableDescription.action_timestamp) {
        // Rename action_timestamp to timestamp if needed
        await queryInterface.renameColumn('course_audit_logs', 'action_timestamp', 'timestamp');
      }

      // Update foreign key constraints if needed
      // Note: This might require dropping and recreating the constraint
      // Specific implementation depends on your database system

      // Add indexes if they don't exist
      try {
        await queryInterface.addIndex('course_audit_logs', ['course_id'], {
          name: 'course_audit_logs_course_id_idx'
        });
      } catch (e) {
        // Index might already exist
      }

      try {
        await queryInterface.addIndex('course_audit_logs', ['action'], {
          name: 'course_audit_logs_action_idx'
        });
      } catch (e) {
        // Index might already exist
      }

      try {
        await queryInterface.addIndex('course_audit_logs', ['timestamp'], {
          name: 'course_audit_logs_timestamp_idx'
        });
      } catch (e) {
        // Index might already exist
      }

      // Remove old index if it exists
      try {
        await queryInterface.removeIndex('course_audit_logs', 'course_audit_logs_action_timestamp_idx');
      } catch (e) {
        // Index might not exist
      }
      
      try {
        await queryInterface.removeIndex('course_audit_logs', 'course_audit_logs_user_id_idx');
      } catch (e) {
        // Index might not exist
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('course_audit_logs');
  }
};