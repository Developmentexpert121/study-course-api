// migrations/XXXXXX-fix-user-progress-unique-constraint.js
"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log(
      "🔄 Fixing user_progress unique constraint to include lesson_id..."
    );

    const tableName = "user_progress";
    const wrongConstraintName = "user_progress_user_id_course_id_chapter_id";
    const correctConstraintName =
      "user_progress_user_id_course_id_chapter_id_lesson_id_key";

    // Step 1: Check current constraints
    const constraints = await queryInterface.sequelize.query(`
      SELECT 
        tc.constraint_name,
        string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as columns
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'user_progress'
      AND tc.constraint_type = 'UNIQUE'
      GROUP BY tc.constraint_name;
    `);

    console.log("📋 Current constraints:", constraints[0]);

    // Step 2: Remove the wrong constraint (if exists)
    try {
      await queryInterface.sequelize.query(`
        ALTER TABLE user_progress 
        DROP CONSTRAINT IF EXISTS ${wrongConstraintName}
      `);
      console.log("✅ Removed wrong constraint:", wrongConstraintName);
    } catch (error) {
      console.log(
        "ℹ️  Wrong constraint not found or already removed:",
        error.message
      );
    }

    // Step 3: Add the correct constraint (if doesn't exist)
    try {
      await queryInterface.sequelize.query(`
        ALTER TABLE user_progress 
        ADD CONSTRAINT ${correctConstraintName} 
        UNIQUE (user_id, course_id, chapter_id, lesson_id)
      `);
      console.log("✅ Added correct constraint:", correctConstraintName);
    } catch (error) {
      console.log(
        "ℹ️  Correct constraint already exists or failed:",
        error.message
      );
    }

    // Step 4: Verify the fix
    const finalConstraints = await queryInterface.sequelize.query(`
      SELECT 
        tc.constraint_name,
        string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as columns
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'user_progress'
      AND tc.constraint_type = 'UNIQUE'
      GROUP BY tc.constraint_name;
    `);

    console.log("✅ Final constraints:", finalConstraints[0]);
  },

  async down(queryInterface, Sequelize) {
    console.log("🔄 Reverting user_progress constraint changes...");

    const tableName = "user_progress";
    const wrongConstraintName = "user_progress_user_id_course_id_chapter_id";
    const correctConstraintName =
      "user_progress_user_id_course_id_chapter_id_lesson_id_key";

    // Remove correct constraint
    try {
      await queryInterface.sequelize.query(`
        ALTER TABLE user_progress 
        DROP CONSTRAINT IF EXISTS ${correctConstraintName}
      `);
      console.log("✅ Removed correct constraint");
    } catch (error) {
      console.log("ℹ️  Correct constraint not found:", error.message);
    }

    // Add back wrong constraint
    try {
      await queryInterface.sequelize.query(`
        ALTER TABLE user_progress 
        ADD CONSTRAINT ${wrongConstraintName} 
        UNIQUE (user_id, course_id, chapter_id)
      `);
      console.log("✅ Re-added wrong constraint");
    } catch (error) {
      console.log("ℹ️  Failed to re-add wrong constraint:", error.message);
    }
  },
};
