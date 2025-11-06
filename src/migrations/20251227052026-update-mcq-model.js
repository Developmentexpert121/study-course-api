// migrations/XXXXXXXXXXXXXX-update-mcq-model.js
"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Remove old columns
    await queryInterface.removeColumn("mcqs", "answer");
    await queryInterface.removeColumn("mcqs", "course_id");

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

    // Update chapter_id to be not null (if it wasn't already)
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
    // Revert changes
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
