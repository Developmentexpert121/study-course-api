"use strict";

const bcrypt = require("bcrypt");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const saltRounds = 10;

    // Check if admin user already exists
    const [existingAdmin] = await queryInterface.sequelize.query(
      `SELECT id FROM users WHERE email = 'admin@123gmail.com' LIMIT 1;`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    // Only insert if admin doesn't exist
    if (!existingAdmin) {
      await queryInterface.bulkInsert(
        "users",
        [
          {
            username: "admin",
            email: "admin@123gmail.com",
            password: await bcrypt.hash("Aa@12345", saltRounds),
            role: "Super-Admin",
            verified: true,
            profileImage: null,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
        {}
      );
      console.log("✅ Admin user created successfully");
    } else {
      console.log("ℹ️  Admin user already exists, skipping seed");
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Only delete the specific admin user, not all users
    return queryInterface.bulkDelete(
      "users",
      {
        email: "admin@123gmail.com",
      },
      {}
    );
  },
};
