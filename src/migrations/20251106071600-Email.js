// migrations/create-emails-table.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Emails', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
          isEmail: true
        }
      },
      EmailId: {
        type: Sequelize.INTEGER,
        allowNull: false,
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

    // Add indexes for better query performance
    await queryInterface.addIndex('Emails', ['email']);
    await queryInterface.addIndex('Emails', ['EmailId']);

    // Add unique constraint if emails should be unique
    await queryInterface.addIndex('Emails', ['email'], {
      unique: true,
      name: 'emails_email_unique'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Emails');
  }
};