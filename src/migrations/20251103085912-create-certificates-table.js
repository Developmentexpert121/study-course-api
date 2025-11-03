"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("certificates", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" }, // optional if you have users table
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      course_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "courses", key: "id" }, // optional if you have courses table
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      certificate_code: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      certificate_url: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      issued_date: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM("issued", "revoked"),
        allowNull: false,
        defaultValue: "issued",
      },
      download_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("certificates");
  },
};
