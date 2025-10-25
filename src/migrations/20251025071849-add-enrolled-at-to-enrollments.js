"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("enrollments", "enrolled_at", {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    });

    // Add index for better performance
    await queryInterface.addIndex("enrollments", ["enrolled_at"]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex("enrollments", ["enrolled_at"]);
    await queryInterface.removeColumn("enrollments", "enrolled_at");
  },
};
