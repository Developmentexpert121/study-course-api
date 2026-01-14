// migrations/20240115080000-create-contact-forms-table.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ContactForms', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      subject: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      phone: {
        type: Sequelize.BIGINT,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('ContactForms', ['email'], {
      name: 'idx_contact_forms_email'
    });
    await queryInterface.addIndex('ContactForms', ['createdAt'], {
      name: 'idx_contact_forms_created_at'
    });
    await queryInterface.addIndex('ContactForms', ['subject'], {
      name: 'idx_contact_forms_subject'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('ContactForms');
  }
};