import { QueryInterface, DataTypes } from "sequelize";

export default {
  up: async (queryInterface) => {
    // Add new columns to courses table
    await queryInterface.sequelize.transaction(async (transaction) => {
      // Add subtitle column
      await queryInterface.addColumn(
        "courses",
        "subtitle",
        {
          type: DataTypes.STRING,
          allowNull: true,
        },
        { transaction }
      );

      // Add additional_categories column (JSON array)
      await queryInterface.addColumn(
        "courses",
        "additional_categories",
        {
          type: DataTypes.JSON,
          allowNull: true,
          defaultValue: [],
        },
        { transaction }
      );

      // Add intro_video column
      await queryInterface.addColumn(
        "courses",
        "intro_video",
        {
          type: DataTypes.STRING,
          allowNull: true,
        },
        { transaction }
      );

      // Add price column (DECIMAL for precise currency storage)
      await queryInterface.addColumn(
        "courses",
        "price",
        {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0.0,
        },
        { transaction }
      );

      // Add price_type column (ENUM for free/paid)
      await queryInterface.addColumn(
        "courses",
        "price_type",
        {
          type: DataTypes.ENUM("free", "paid"),
          allowNull: false,
          defaultValue: "free",
        },
        { transaction }
      );

      // Add duration column
      await queryInterface.addColumn(
        "courses",
        "duration",
        {
          type: DataTypes.STRING,
          allowNull: true,
        },
        { transaction }
      );

      // Add status column (ENUM for draft/active/inactive)
      await queryInterface.addColumn(
        "courses",
        "status",
        {
          type: DataTypes.ENUM("draft", "active", "inactive"),
          allowNull: false,
          defaultValue: "draft",
        },
        { transaction }
      );

      // Add features column (JSON array)
      await queryInterface.addColumn(
        "courses",
        "features",
        {
          type: DataTypes.JSON,
          allowNull: true,
          defaultValue: [],
        },
        { transaction }
      );

      console.log("Successfully added new columns to courses table");
    });
  },

  down: async (queryInterface) => {
    // Remove the columns if migration is rolled back
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn("courses", "subtitle", { transaction });
      await queryInterface.removeColumn("courses", "additional_categories", {
        transaction,
      });
      await queryInterface.removeColumn("courses", "intro_video", {
        transaction,
      });
      await queryInterface.removeColumn("courses", "price", { transaction });
      await queryInterface.removeColumn("courses", "price_type", {
        transaction,
      });
      await queryInterface.removeColumn("courses", "duration", { transaction });
      await queryInterface.removeColumn("courses", "status", { transaction });
      await queryInterface.removeColumn("courses", "features", { transaction });

      // Remove the ENUM types
      await queryInterface.sequelize.query(
        "DROP TYPE IF EXISTS enum_courses_price_type;",
        { transaction }
      );
      await queryInterface.sequelize.query(
        "DROP TYPE IF EXISTS enum_courses_status;",
        { transaction }
      );

      console.log("Successfully removed new columns from courses table");
    });
  },
};
