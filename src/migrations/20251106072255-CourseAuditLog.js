// migrations/create-course-audit-logs-table.js (Safe Version)
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('course_audit_logs', {
      // ... table definition (same as above)
    });

    // Helper function to safely create indexes
    const createIndexIfNotExists = async (tableName, columns, indexName) => {
      try {
        await queryInterface.addIndex(tableName, columns, { name: indexName });
        console.log(`Created index: ${indexName}`);
      } catch (error) {
        if (error.name === 'SequelizeDatabaseError' && error.message.includes('already exists')) {
          console.log(`Index ${indexName} already exists, skipping...`);
        } else {
          throw error;
        }
      }
    };

    // Create all indexes safely
    await createIndexIfNotExists('course_audit_logs', ['course_id'], 'idx_course_audit_logs_course_id');
    await createIndexIfNotExists('course_audit_logs', ['action'], 'idx_course_audit_logs_action');
    await createIndexIfNotExists('course_audit_logs', ['action_timestamp'], 'idx_course_audit_logs_timestamp');
    await createIndexIfNotExists('course_audit_logs', ['user_id'], 'idx_course_audit_logs_user_id');
    await createIndexIfNotExists('course_audit_logs', ['course_id', 'action_timestamp'], 'idx_course_audit_logs_course_timestamp');
    await createIndexIfNotExists('course_audit_logs', ['user_id', 'action_timestamp'], 'idx_course_audit_logs_user_timestamp');
    await createIndexIfNotExists('course_audit_logs', ['action', 'action_timestamp'], 'idx_course_audit_logs_action_type_timestamp');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('course_audit_logs');
  }
};