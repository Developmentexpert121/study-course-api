"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add role_id column to users table
    await queryInterface.addColumn("users", "role_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "roles",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    console.log("✅ Added role_id column to users table");
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("users", "role_id");
  },
};
