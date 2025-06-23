'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('user_tokens', 'token_type', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'verify',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('user_tokens', 'token_type');
  },
};
