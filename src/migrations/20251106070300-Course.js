// migrations/create-courses-table.js (Corrected)
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('courses', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      subtitle: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      category: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      additional_categories: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: [],
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      image: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      intro_video: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      creator: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
      },
      price_type: {
        type: Sequelize.ENUM('free', 'paid'),
        allowNull: false,
        defaultValue: 'free',
      },
      duration: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('draft', 'active', 'inactive'),
        allowNull: false,
        defaultValue: 'draft',
      },
      features: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: [],
      },
      ratings: {
        type: Sequelize.FLOAT,
        allowNull: true,
        defaultValue: 0,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes with unique names
    await queryInterface.addIndex('courses', ['title'], {
      name: 'idx_courses_title'
    });
    await queryInterface.addIndex('courses', ['category'], {
      name: 'idx_courses_category'
    });
    await queryInterface.addIndex('courses', ['is_active'], {
      name: 'idx_courses_is_active'
    });
    await queryInterface.addIndex('courses', ['price_type'], {
      name: 'idx_courses_price_type'
    });
    await queryInterface.addIndex('courses', ['status'], {
      name: 'idx_courses_status'
    });
    await queryInterface.addIndex('courses', ['ratings'], {
      name: 'idx_courses_ratings'
    });
    await queryInterface.addIndex('courses', ['userId'], {
      name: 'idx_courses_user_id'
    });
    await queryInterface.addIndex('courses', ['createdAt'], {
      name: 'idx_courses_created_at'
    });
    
    // Composite indexes
    await queryInterface.addIndex('courses', ['status', 'is_active'], {
      name: 'idx_courses_status_active'
    });
    await queryInterface.addIndex('courses', ['category', 'status'], {
      name: 'idx_courses_category_status'
    });
    await queryInterface.addIndex('courses', ['price_type', 'status'], {
      name: 'idx_courses_price_type_status'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('courses');
  }
};