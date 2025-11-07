// migrations/create-certificates-table.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('certificates', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      course_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'courses',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      certificate_code: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      certificate_url: {
        type: Sequelize.STRING,
        allowNull: false
      },
      issued_date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('issued', 'revoked'),
        allowNull: false,
        defaultValue: 'issued'
      },
      download_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes for better query performance
    await queryInterface.addIndex('certificates', ['user_id']);
    await queryInterface.addIndex('certificates', ['course_id']);
    await queryInterface.addIndex('certificates', ['certificate_code']);
    await queryInterface.addIndex('certificates', ['status']);
    await queryInterface.addIndex('certificates', ['issued_date']);
    
    // Composite index for common queries
    await queryInterface.addIndex('certificates', ['user_id', 'course_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('certificates');
  }
};