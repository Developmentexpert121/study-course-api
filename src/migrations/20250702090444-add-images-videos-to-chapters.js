'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('chapters', 'images', {
      type: Sequelize.JSON,
      allowNull: true,
    });
    await queryInterface.addColumn('chapters', 'videos', {
      type: Sequelize.JSON,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('chapters', 'images');
    await queryInterface.removeColumn('chapters', 'videos');
  }
};