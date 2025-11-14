"use strict";
const bcrypt = require("bcrypt");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const saltRounds = 10;

    // Get Super-Admin role
    const [superAdminRole] = await queryInterface.sequelize.query(
      `SELECT id FROM roles WHERE name = 'Super-Admin' LIMIT 1;`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    const superAdminRoleId = superAdminRole.id;

    // Update or create admin user
    const [existingAdmin] = await queryInterface.sequelize.query(
      `SELECT id FROM users WHERE email = 'admin@123gmail.com' LIMIT 1;`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (!existingAdmin) {
      await queryInterface.bulkInsert(
        "users",
        [
          {
            username: "admin",
            email: "admin@123gmail.com",
            password: await bcrypt.hash("Aa@12345", saltRounds),
            role: "Super-Admin",
            role_id: superAdminRoleId,
            verified: true,
            profileImage: null,
            status: "active",
            bio: "",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        {}
      );
      console.log("✅ Admin user created");
    } else {
      await queryInterface.sequelize.query(
        `UPDATE users SET role_id = ${superAdminRoleId} WHERE email = 'admin@123gmail.com'`
      );
      console.log("✅ Admin user updated with role_id");
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete(
      "users",
      { email: "admin@123gmail.com" },
      {}
    );
  },
};
