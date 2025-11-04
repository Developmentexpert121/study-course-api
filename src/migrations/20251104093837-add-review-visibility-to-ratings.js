"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Ratings", "review_visibility", {
      type: Sequelize.ENUM(
        "visible",
        "hidden_by_admin",
        "hidden_by_superadmin"
      ),
      allowNull: false,
      defaultValue: "visible",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("Ratings", "review_visibility");
  },
};
