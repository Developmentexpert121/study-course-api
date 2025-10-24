"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Step 1: Add the column as nullable first
    await queryInterface.addColumn("courses", "userId", {
      type: Sequelize.INTEGER,
      allowNull: true, // Start with nullable
      references: {
        model: "users", // Make sure this matches your actual users table name
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    // Step 2: Update existing records with a default userId
    // First, check if we have any users
    const [users] = await queryInterface.sequelize.query(
      "SELECT id FROM users LIMIT 1"
    );

    if (users.length > 0) {
      const defaultUserId = users[0].id;
      await queryInterface.sequelize.query(`
        UPDATE courses SET "userId" = ${defaultUserId} WHERE "userId" IS NULL
      `);

      // Step 3: Change the column to NOT NULL (only if we updated records)
      await queryInterface.changeColumn("courses", "userId", {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      });
    }
    // If no users exist, leave it as nullable for now
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("courses", "userId");
  },
};
