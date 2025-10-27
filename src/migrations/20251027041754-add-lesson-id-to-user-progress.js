"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("user_progress", "lesson_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "lessons",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.addIndex("user_progress", ["lesson_id"]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex("user_progress", ["lesson_id"]);
    await queryInterface.removeColumn("user_progress", "lesson_id");
  },
};
