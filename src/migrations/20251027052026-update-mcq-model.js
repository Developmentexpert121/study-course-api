"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("mcqs");

    // ✅ Only remove if column exists
    if (table.answer) {
      await queryInterface.removeColumn("mcqs", "answer");
    }
    if (table.course_id) {
      await queryInterface.removeColumn("mcqs", "course_id");
    }

    // Add new columns
    await queryInterface.addColumn("mcqs", "correct_answer", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addColumn("mcqs", "explanation", {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    // Update chapter_id to be not null
    await queryInterface.changeColumn("mcqs", "chapter_id", {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "chapters",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("mcqs", "correct_answer");
    await queryInterface.removeColumn("mcqs", "explanation");

    await queryInterface.addColumn("mcqs", "answer", {
      type: Sequelize.STRING,
      allowNull: false,
    });

    await queryInterface.addColumn("mcqs", "course_id", {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
  },
};
