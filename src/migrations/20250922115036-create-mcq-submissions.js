'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('mcq_submissions', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      user_id: { type: Sequelize.INTEGER, allowNull: false },
      chapter_id: { type: Sequelize.INTEGER, allowNull: false },
      course_id: { type: Sequelize.INTEGER, allowNull: false },
      answers: { type: Sequelize.JSONB, allowNull: false },
      score: { type: Sequelize.INTEGER, allowNull: false },
      total_questions: { type: Sequelize.INTEGER, allowNull: false },
      percentage: { type: Sequelize.FLOAT, allowNull: false },
      passed: { type: Sequelize.BOOLEAN, allowNull: false },
      submitted_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('mcq_submissions');
  }
};
