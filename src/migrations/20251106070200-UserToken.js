// migrations/create-user-tokens-table.js (Complete Reset Version)
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // First, check if table exists and drop it if it does (clean start)
    const tableExists = await queryInterface.showAllTables().then(tables =>
      tables.includes('user_tokens')
    );

    if (tableExists) {
      console.log('User_tokens table already exists, dropping for clean start...');
      await queryInterface.dropTable('user_tokens');
    }

    // Create the table with ALL columns including createdAt and updatedAt
    await queryInterface.createTable('user_tokens', {
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
        onDelete: 'CASCADE'
      },
      token: {
        type: Sequelize.STRING,
        allowNull: false
      },
      token_type: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'verify'
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

    console.log('User_tokens table created successfully, now creating indexes...');

    // Create indexes after table is fully created
    const indexes = [
      { columns: ['user_id'], name: 'idx_user_tokens_user_id' },
      { columns: ['token'], name: 'uidx_user_tokens_token', unique: true },
      { columns: ['token_type'], name: 'idx_user_tokens_token_type' },
      { columns: ['createdAt'], name: 'idx_user_tokens_createdAt' },
      { columns: ['user_id', 'token_type'], name: 'idx_user_tokens_user_type' },
      { columns: ['token_type', 'createdAt'], name: 'idx_user_tokens_type_created' }
    ];

    for (const index of indexes) {
      try {
        await queryInterface.addIndex('user_tokens', index.columns, {
          name: index.name,
          unique: index.unique || false
        });
        console.log(`✓ Created index: ${index.name}`);
      } catch (error) {
        console.log(`⚠ Index ${index.name} already exists: ${error.message}`);
      }
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('user_tokens');
  }
};