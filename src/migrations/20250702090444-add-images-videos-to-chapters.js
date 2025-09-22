'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add 'images' column if it doesn't exist
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name='chapters' 
            AND column_name='images'
        ) THEN
          ALTER TABLE "chapters"
          ADD COLUMN "images" JSON;
        END IF;
      END
      $$;
    `);

    // Add 'videos' column if it doesn't exist
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name='chapters' 
            AND column_name='videos'
        ) THEN
          ALTER TABLE "chapters"
          ADD COLUMN "videos" JSON;
        END IF;
      END
      $$;
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('chapters', 'images');
    await queryInterface.removeColumn('chapters', 'videos');
  }
};
