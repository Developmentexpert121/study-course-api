'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.removeColumn('lessons', 'video_url');
    } catch (err) {
      console.warn('⚠️ Skipping removal of video_url (column might not exist)');
    }
    await queryInterface.addColumn('lessons', 'video_urls', {
      type: Sequelize.JSON,
      allowNull: true,
    });
    await queryInterface.addColumn('lessons', 'images', {
      type: Sequelize.JSON,
      allowNull: true,
    });
    await queryInterface.addColumn('lessons', 'videos', {
      type: Sequelize.JSON,
      allowNull: true,
    });

  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('lessons', 'video_urls');
    await queryInterface.removeColumn('lessons', 'images');
    await queryInterface.removeColumn('lessons', 'videos');
    await queryInterface.addColumn('lessons', 'video_url', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  }
};
