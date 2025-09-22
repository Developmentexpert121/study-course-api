'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.table_constraints
          WHERE constraint_name = 'chapters_course_id_fkey'
        ) THEN
          ALTER TABLE "chapters"
          ADD CONSTRAINT "chapters_course_id_fkey"
          FOREIGN KEY ("course_id") REFERENCES "courses"("id")
          ON DELETE CASCADE;
        END IF;
      END
      $$;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeConstraint('chapters', 'chapters_course_id_fkey');
  },
};
