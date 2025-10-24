"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add role column if it doesn't exist
    await queryInterface.sequelize.query(`
     DO $$
     BEGIN
        IF NOT EXISTS (
         SELECT 1
         FROM information_schema.columns
         WHERE table_name='users'
            AND column_name='role'
        ) THEN
         ALTER TABLE "users"
         ADD COLUMN "role" VARCHAR(50) NOT NULL DEFAULT 'user';
        END IF;
     END
     $$;
    `);

    // Add verified column if it doesn't exist
    await queryInterface.sequelize.query(`
     DO $$
     BEGIN
        IF NOT EXISTS (
         SELECT 1
         FROM information_schema.columns
         WHERE table_name='users'
            AND column_name='verified'
        ) THEN
         ALTER TABLE "users"
         ADD COLUMN "verified" BOOLEAN NOT NULL DEFAULT false;
        END IF;
     END
     $$;
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("users", "role");
    await queryInterface.removeColumn("users", "verified");
  },
};
