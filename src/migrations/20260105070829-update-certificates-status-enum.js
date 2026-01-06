'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const sequelize = queryInterface.sequelize;
    
    try {
      // Check if status column already exists
      const table = await queryInterface.describeTable('certificates');
      
      if (table.status) {
        console.log('✓ Status column already exists, skipping migration');
        return;
      }

      // Try to create ENUM type, ignore if it already exists
      try {
        await sequelize.query(`
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
      } catch (error) {
        // Ignore error if type already exists (error code 42710)
        if (error.original?.code === '42710') {
          console.log('✓ ENUM type already exists, continuing...');
        } else {
          throw error;
        }
      }

      // Add the status column
      await sequelize.query(`
        ALTER TABLE certificates
        ADD COLUMN status enum_certificates_status NOT NULL DEFAULT 'pending';
      `);

      console.log('✓ Status column added successfully');
    } catch (error) {
      console.error('Migration error:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const sequelize = queryInterface.sequelize;
    
    try {
      // Drop column
      await sequelize.query(`
        ALTER TABLE certificates
        DROP COLUMN IF EXISTS status;
      `);

      // Drop ENUM type
      await sequelize.query(`
        DROP TYPE IF EXISTS enum_certificates_status CASCADE;
      `);

      console.log('✓ Status column removed');
    } catch (error) {
      console.error('Rollback error:', error.message);
      throw error;
    }
  }
};