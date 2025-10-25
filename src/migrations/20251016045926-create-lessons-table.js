"use strict";

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("lessons", {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    title: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    content: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    chapter_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "chapters",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    order: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    lesson_type: {
      type: Sequelize.ENUM("video", "text", "quiz", "assignment"),
      allowNull: false,
      defaultValue: "text",
    },
    duration: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    video_url: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    resources: {
      type: Sequelize.JSON,
      allowNull: true,
    },
    is_free: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    created_at: {
      allowNull: false,
      type: Sequelize.DATE,
      defaultValue: Sequelize.fn("NOW"),
    },
    updated_at: {
      allowNull: false,
      type: Sequelize.DATE,
      defaultValue: Sequelize.fn("NOW"),
    },
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable("lessons");
}
