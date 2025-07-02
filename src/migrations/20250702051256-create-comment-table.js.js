'use strict';

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('Comments', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER,
    },
    content: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    userId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    courseId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'courses', key: 'id' },
      onDelete: 'CASCADE',
    },
    createdAt: Sequelize.DATE,
    updatedAt: Sequelize.DATE,
  });
}

export async function down(queryInterface) {
  await queryInterface.dropTable('Comments');
}
