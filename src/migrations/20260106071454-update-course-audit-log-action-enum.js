'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = 'course_audit_logs';
    const columnName = 'action';

    try {
      // 1. Remove default if exists
      await queryInterface.sequelize.query(`
        ALTER TABLE ${tableName} 
        ALTER COLUMN ${columnName} DROP DEFAULT;
      `);
    } catch (error) {
      console.log('No default to drop or already dropped');
    }

    // 2. Rename old enum type
    await queryInterface.sequelize.query(`
      ALTER TYPE enum_${tableName}_${columnName} 
      RENAME TO enum_${tableName}_${columnName}_old;
    `);

    // 3. Create new enum with all values
    await queryInterface.sequelize.query(`
      CREATE TYPE enum_${tableName}_${columnName} AS ENUM(
        'created',
        'updated',
        'activated',
        'deactivated',
        'deleted',
        'enrolled',
        'unenrolled',
        'Certificate_approved',
        'Certificate_rejected',
        'course_complete',
        'rating_added',
        'rating_delete',
        'chapter_added',
        'chapter_delete',
        'lesson_added',
        'lesson_delete',
        'new_user'
      );
    `);

    // 4. Cast column to new enum type
    await queryInterface.sequelize.query(`
      ALTER TABLE ${tableName} 
      ALTER COLUMN ${columnName} TYPE enum_${tableName}_${columnName} 
      USING ${columnName}::text::enum_${tableName}_${columnName};
    `);

    // 5. Drop old enum
    await queryInterface.sequelize.query(`
      DROP TYPE enum_${tableName}_${columnName}_old;
    `);
  },

  async down(queryInterface, Sequelize) {
    const tableName = 'course_audit_logs';
    const columnName = 'action';

    // 1. Rename current enum
    await queryInterface.sequelize.query(`
      ALTER TYPE enum_${tableName}_${columnName} 
      RENAME TO enum_${tableName}_${columnName}_old;
    `);

    // 2. Recreate old enum with original values
    await queryInterface.sequelize.query(`
      CREATE TYPE enum_${tableName}_${columnName} AS ENUM(
        'created',
        'updated',
        'activated',
        'deactivated',
        'deleted'
      );
    `);

    // 3. Cast column back to old enum type
    await queryInterface.sequelize.query(`
      ALTER TABLE ${tableName} 
      ALTER COLUMN ${columnName} TYPE enum_${tableName}_${columnName} 
      USING ${columnName}::text::enum_${tableName}_${columnName};
    `);

    // 4. Drop old enum
    await queryInterface.sequelize.query(`
      DROP TYPE enum_${tableName}_${columnName}_old;
    `);
  }
};