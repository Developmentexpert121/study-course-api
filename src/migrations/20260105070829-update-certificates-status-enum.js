// migrations/YYYYMMDDHHMMSS-update-certificates-status-enum.js
'use strict';

module.exports = {
async up(queryInterface, Sequelize) {
  // 1. Remove default
  await queryInterface.sequelize.query(`
    ALTER TABLE certificates 
    ALTER COLUMN status DROP DEFAULT;
  `);

  // 2. Rename old enum
  await queryInterface.sequelize.query(`
    ALTER TYPE enum_certificates_status 
    RENAME TO enum_certificates_status_old;
  `);

  // 3. Create new enum
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

  // 4. Change column type
  await queryInterface.sequelize.query(`
    ALTER TABLE certificates 
    ALTER COLUMN status TYPE enum_certificates_status 
    USING status::text::enum_certificates_status;
  `);

  // 5. Restore default (adjust if needed)
  await queryInterface.sequelize.query(`
    ALTER TABLE certificates 
    ALTER COLUMN status SET DEFAULT 'pending';
  `);

  // 6. Drop old enum
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