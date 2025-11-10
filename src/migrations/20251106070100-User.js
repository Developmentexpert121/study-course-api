// migrations/create-users-table.js (Complete Reset Version)
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // First, check if table exists and drop it if it does (clean start)
    const tableExists = await queryInterface.showAllTables().then(tables =>
      tables.includes('users')
    );

    if (tableExists) {
      console.log('Users table already exists, dropping for clean start...');
      await queryInterface.dropTable('users');
    }

    // Create the table with ALL columns including createdAt and updatedAt
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
      },
      username: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false
      },
      role: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'user'
      },
      verified: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      profileImage: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: null,
      },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected', 'active', 'inactive'),
        allowNull: false,
        defaultValue: 'pending'
      },
      bio: {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: '',
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

    console.log('Users table created successfully, now creating indexes...');

    // Create indexes after table is fully created
    const indexes = [
      { columns: ['username'], name: 'idx_users_username' },
      { columns: ['email'], name: 'idx_users_email' },
      { columns: ['role'], name: 'idx_users_role' },
      { columns: ['verified'], name: 'idx_users_verified' },
      { columns: ['status'], name: 'idx_users_status' },
      { columns: ['createdAt'], name: 'idx_users_createdAt' },
      { columns: ['status', 'verified'], name: 'idx_users_status_verified' },
      { columns: ['role', 'status'], name: 'idx_users_role_status' },
      { columns: ['email', 'status'], name: 'idx_users_email_status' }
    ];

    for (const index of indexes) {
      try {
        await queryInterface.addIndex('users', index.columns, {
          name: index.name
        });
        console.log(`✓ Created index: ${index.name}`);
      } catch (error) {
        console.log(`⚠ Index ${index.name} already exists: ${error.message}`);
      }
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('users');
  }
};