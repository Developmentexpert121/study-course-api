'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'role', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'user',  // default role
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'role');
  }
};
