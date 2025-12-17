"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("courses", "mode", {
      type: Sequelize.ENUM("online", "offline"),
      allowNull: false,
      defaultValue: "online",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("courses", "mode");
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_courses_mode";'
    );
  },
};
