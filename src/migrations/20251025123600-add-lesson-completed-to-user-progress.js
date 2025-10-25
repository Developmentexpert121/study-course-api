"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add lesson_completed column
    await queryInterface.addColumn("user_progress", "lesson_completed", {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    });

    // Add completed_at column
    await queryInterface.addColumn("user_progress", "completed_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // Optional: Add index for better performance when querying by lesson_completed
    await queryInterface.addIndex("user_progress", ["lesson_completed"]);
  },

  async down(queryInterface, Sequelize) {
    // Remove the index first
    await queryInterface.removeIndex("user_progress", ["lesson_completed"]);

    // Remove the columns
    await queryInterface.removeColumn("user_progress", "completed_at");
    await queryInterface.removeColumn("user_progress", "lesson_completed");
  },
};
