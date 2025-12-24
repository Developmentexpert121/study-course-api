// migration file (e.g., add-mode-to-courses.js)
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('courses', 'mode', {
      type: Sequelize.ENUM('offline', 'online', 'hybrid'),
      allowNull: false,
      defaultValue: 'online'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('courses', 'mode');
  }
};