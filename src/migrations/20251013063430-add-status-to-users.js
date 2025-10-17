'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'status', {
      type: Sequelize.ENUM('pending', 'approved', 'rejected', 'active', 'inactive'),
      allowNull: false,
      defaultValue: 'pending'
    });

    // Optional: Update existing records
    await queryInterface.sequelize.query(`
      UPDATE users SET status = 'active' WHERE verified = true AND role = 'user'
    `);
    
    await queryInterface.sequelize.query(`
      UPDATE users SET status = 'pending' WHERE verified = false AND role = 'admin'
    `);
    
    await queryInterface.sequelize.query(`
      UPDATE users SET status = 'active' WHERE verified = true AND role = 'admin'
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'status');
    
    // Drop the ENUM type (PostgreSQL specific - remove if using other databases)
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_users_status";
    `);
  }
};