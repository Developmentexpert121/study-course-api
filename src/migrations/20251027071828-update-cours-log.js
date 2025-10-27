// Create a new migration file: YYYYMMDDHHMMSS-fix-audit-log-cascade.js
// Run: npx sequelize-cli migration:generate --name fix-audit-log-cascade

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Step 1: Drop the existing foreign key constraint
    await queryInterface.removeConstraint(
      'course_audit_logs',
      'course_audit_logs_course_id_fkey' // This might be named differently
    );

    // If you don't know the constraint name, you can find it with:
    // SELECT constraint_name FROM information_schema.table_constraints 
    // WHERE table_name = 'course_audit_logs' AND constraint_type = 'FOREIGN KEY';

    // Step 2: Add course_title and user_name columns if they don't exist
    const tableDescription = await queryInterface.describeTable('course_audit_logs');
    
    if (!tableDescription.course_title) {
      await queryInterface.addColumn('course_audit_logs', 'course_title', {
        type: Sequelize.STRING,
        allowNull: true, // Initially allow null for existing records
      });
    }

    if (!tableDescription.user_name) {
      await queryInterface.addColumn('course_audit_logs', 'user_name', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }

    if (!tableDescription.is_active_status) {
      await queryInterface.addColumn('course_audit_logs', 'is_active_status', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
      });
    }

    // Rename timestamp to action_timestamp if needed
    if (tableDescription.timestamp && !tableDescription.action_timestamp) {
      await queryInterface.renameColumn('course_audit_logs', 'timestamp', 'action_timestamp');
    }

    // Step 3: Populate course_title for existing records (optional but recommended)
    await queryInterface.sequelize.query(`
      UPDATE course_audit_logs cal
      SET course_title = c.title
      FROM courses c
      WHERE cal.course_id = c.id
      AND cal.course_title IS NULL
    `);

    // Step 4: Make course_title NOT NULL after populating
    await queryInterface.changeColumn('course_audit_logs', 'course_title', {
      type: Sequelize.STRING,
      allowNull: false,
    });

    // Step 5: Optionally, re-add foreign key WITHOUT CASCADE (or don't add it at all)
    // Option A: Don't add foreign key back (recommended for audit logs)
    
    // Option B: Add foreign key with SET NULL
    // await queryInterface.addConstraint('course_audit_logs', {
    //   fields: ['course_id'],
    //   type: 'foreign key',
    //   name: 'course_audit_logs_course_id_fkey_no_cascade',
    //   references: {
    //     table: 'courses',
    //     field: 'id'
    //   },
    //   onDelete: 'SET NULL',
    //   onUpdate: 'CASCADE'
    // });

    // Step 6: Update user_id foreign key to SET NULL
    await queryInterface.removeConstraint(
      'course_audit_logs',
      'course_audit_logs_user_id_fkey'
    );

    await queryInterface.addConstraint('course_audit_logs', {
      fields: ['user_id'],
      type: 'foreign key',
      name: 'course_audit_logs_user_id_fkey_set_null',
      references: {
        table: 'users',
        field: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Reverse the changes
    await queryInterface.removeConstraint(
      'course_audit_logs',
      'course_audit_logs_user_id_fkey_set_null'
    );

    // Re-add original constraints
    await queryInterface.addConstraint('course_audit_logs', {
      fields: ['course_id'],
      type: 'foreign key',
      name: 'course_audit_logs_course_id_fkey',
      references: {
        table: 'courses',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    await queryInterface.addConstraint('course_audit_logs', {
      fields: ['user_id'],
      type: 'foreign key',
      name: 'course_audit_logs_user_id_fkey',
      references: {
        table: 'users',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  }
};