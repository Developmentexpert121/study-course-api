"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("user_progresses", "lesson_id", {
      type: Sequelize.INTEGER,
      allowNull: true, // Set to false if it should always have a value
      references: {
        model: "lessons", // References the lessons table
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    // Optional: Add an index for better performance
    await queryInterface.addIndex("user_progresses", ["lesson_id"]);
  },

  async down(queryInterface, Sequelize) {
    // Remove the index first
    await queryInterface.removeIndex("user_progresses", ["lesson_id"]);

    // Then remove the column
    await queryInterface.removeColumn("user_progresses", "lesson_id");
  },
};
