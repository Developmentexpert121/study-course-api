'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Ratings', 'status', {
      type: Sequelize.ENUM('hidebysuperadmin', 'hidebyadmin', 'showtoeveryone'),
      allowNull: false,
      defaultValue: 'showtoeveryone'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Ratings', 'status');
    
    // Also drop the ENUM type if your database supports this
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Ratings_status";');
  }
};