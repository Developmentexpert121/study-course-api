// migrations/XXXXXXXXXXXXXX-fix-user-progress-constraint-urgent.js
"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log("🚀 URGENT: Fixing user_progress unique constraint...");

    // Use raw SQL to immediately fix the constraint
    await queryInterface.sequelize.query(`
      -- Drop the problematic constraint
      ALTER TABLE user_progress DROP CONSTRAINT IF EXISTS user_progress_unique_index;
      
      -- Create new constraint with lesson_id
      ALTER TABLE user_progress 
      ADD CONSTRAINT user_progress_unique_index 
      UNIQUE (user_id, course_id, chapter_id, lesson_id);
    `);

    console.log("✅ Constraint fixed successfully!");
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE user_progress DROP CONSTRAINT IF EXISTS user_progress_unique_index;
      
      -- Revert to old constraint (without lesson_id)
      ALTER TABLE user_progress 
      ADD CONSTRAINT user_progress_unique_index 
      UNIQUE (user_id, course_id, chapter_id);
    `);
  },
};
