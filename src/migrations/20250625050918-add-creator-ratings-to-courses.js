'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('courses', 'creator', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('courses', 'ratings', {
      type: Sequelize.FLOAT,
      allowNull: true,
      defaultValue: 0,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('courses', 'creator');
    await queryInterface.removeColumn('courses', 'ratings');
  }
};
