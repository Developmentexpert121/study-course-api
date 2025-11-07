// migrations/create-comments-table.js (Fixed with unique index names)
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('comments', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      courseId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'courses',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
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

    // Add indexes with unique names to avoid conflicts
    await queryInterface.addIndex('comments', ['userId'], {
      name: 'idx_comments_user_id'
    });

    await queryInterface.addIndex('comments', ['courseId'], {
      name: 'idx_comments_course_id'
    });

    await queryInterface.addIndex('comments', ['createdAt'], {
      name: 'idx_comments_created_at'
    });

    await queryInterface.addIndex('comments', ['courseId', 'createdAt'], {
      name: 'idx_comments_course_id_created_at'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('comments');
  }
};