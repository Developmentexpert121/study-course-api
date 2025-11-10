// migrations/create-course-audit-logs-table.js (Safe Version)
"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("course_audit_logs", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
      },
      course_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: "ID of the course related to this audit log",
      },
      course_title: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: "Stored for reference even after course deletion",
      },
      action: {
        type: Sequelize.ENUM(
          "created",
          "updated",
          "activated",
          "deactivated",
          "deleted"
        ),
        allowNull: false,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
        onDelete: "SET NULL", // Keep the log even if user is deleted
        comment: "User who performed the action",
      },
      user_name: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Stored for reference even after user deletion",
      },
      changed_fields: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: "Object containing old and new values of changed fields",
      },
      is_active_status: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        comment: "Course active status at the time of action",
      },
      action_timestamp: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Helper function to safely create indexes
    const createIndexIfNotExists = async (tableName, columns, indexName) => {
      try {
        await queryInterface.addIndex(tableName, columns, { name: indexName });
        console.log(`Created index: ${indexName}`);
      } catch (error) {
        if (
          error.name === "SequelizeDatabaseError" &&
          error.message.includes("already exists")
        ) {
          console.log(`Index ${indexName} already exists, skipping...`);
        } else {
          throw error;
        }
      }
    };

    // Create all indexes safely
    await createIndexIfNotExists(
      "course_audit_logs",
      ["course_id"],
      "idx_course_audit_logs_course_id"
    );
    await createIndexIfNotExists(
      "course_audit_logs",
      ["action"],
      "idx_course_audit_logs_action"
    );
    await createIndexIfNotExists(
      "course_audit_logs",
      ["action_timestamp"],
      "idx_course_audit_logs_timestamp"
    );
    await createIndexIfNotExists(
      "course_audit_logs",
      ["user_id"],
      "idx_course_audit_logs_user_id"
    );
    await createIndexIfNotExists(
      "course_audit_logs",
      ["course_id", "action_timestamp"],
      "idx_course_audit_logs_course_timestamp"
    );
    await createIndexIfNotExists(
      "course_audit_logs",
      ["user_id", "action_timestamp"],
      "idx_course_audit_logs_user_timestamp"
    );
    await createIndexIfNotExists(
      "course_audit_logs",
      ["action", "action_timestamp"],
      "idx_course_audit_logs_action_type_timestamp"
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("course_audit_logs");
  },
};
