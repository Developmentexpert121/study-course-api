"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Step 1: Add course_id column (nullable at first)
    await queryInterface.addColumn("mcqs", "course_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "courses",
        key: "id",
      },
      onDelete: "CASCADE",
    });

    // Step 2: Copy course_id from related chapter
    await queryInterface.sequelize.query(`
      UPDATE mcqs
      SET course_id = chapters.course_id
      FROM chapters
      WHERE mcqs.chapter_id = chapters.id;
    `);

    // Step 3: Now make column NOT NULL
    await queryInterface.changeColumn("mcqs", "course_id", {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "courses",
        key: "id",
      },
      onDelete: "CASCADE",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("mcqs", "course_id");
  },
};
