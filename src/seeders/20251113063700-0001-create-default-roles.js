"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // OPTIMIZED: Always recreate roles to ensure data exists
    await queryInterface.bulkDelete("roles", null, {});

    await queryInterface.bulkInsert(
      "roles",
      [
        {
          name: "Super-Admin",
          permissions: JSON.stringify({
            dashboard: true,
            teacher: true,
            student: true,
            courses: true,
            manageRoles: true,
            activitylogs: true,
            newsletter: true,
          }),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: "Teacher",
          permissions: JSON.stringify({
            dashboard: true,
            courses: true,
            engagement: true,
          }),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: "Student",
          permissions: JSON.stringify({
            dashboard: true,
            courses: true,
            wishlist: true,
            certificates: true,
          }),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {}
    );

    console.log("✅ Default roles created successfully");
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("roles", null, {});
  },
};
