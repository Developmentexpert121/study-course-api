// migrations/YYYYMMDDHHMMSS-update-certificates-status-enum.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // For PostgreSQL specifically
    await queryInterface.sequelize.query(`
      ALTER TYPE enum_certificates_status 
      RENAME TO enum_certificates_status_old;
    `);

    await queryInterface.sequelize.query(`
      CREATE TYPE enum_certificates_status AS ENUM(
        'pending',
        'admin_approved',
        'admin_rejected',
        'wait for admin approval',
        'wait for super-admin approval',
        'super-admin_approved',
        'super-admin_rejected',
        'issued'
      );
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE certificates 
      ALTER COLUMN status TYPE enum_certificates_status 
      USING status::text::enum_certificates_status;
    `);

    await queryInterface.sequelize.query(`
      DROP TYPE enum_certificates_status_old;
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TYPE enum_certificates_status 
      RENAME TO enum_certificates_status_old;
    `);

    await queryInterface.sequelize.query(`
      CREATE TYPE enum_certificates_status AS ENUM(
        'pending',
        'admin_approved',
        'admin_rejected',
        'super-admin_approved',
        'super-admin_rejected',
        'issued'
      );
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE certificates 
      ALTER COLUMN status TYPE enum_certificates_status 
      USING status::text::enum_certificates_status;
    `);

    await queryInterface.sequelize.query(`
      DROP TYPE enum_certificates_status_old;
    `);
  }
};