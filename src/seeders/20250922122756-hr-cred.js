"use strict";

const bcrypt = require("bcrypt");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const saltRounds = 10;

    // Check if HR user already exists
    const [existingHR] = await queryInterface.sequelize.query(
      `SELECT id FROM users WHERE email = 'hr@gmail.com' LIMIT 1;`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    // Only insert if HR doesn't exist
    if (!existingHR) {
      await queryInterface.bulkInsert(
        "users",
        [
          {
            username: "HR-Manager",
            email: "hr@gmail.com",
            password: await bcrypt.hash("Test@123", saltRounds),
            role: "Super-Admin",
            verified: true,
            profileImage: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        {}
      );
      console.log("✅ HR user created successfully");
    } else {
      console.log("ℹ️  HR user already exists, skipping seed");
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Only delete the specific HR user, not all users
    return queryInterface.bulkDelete(
      "users",
      {
        email: "hr@gmail.com",
      },
      {}
    );
  },
};