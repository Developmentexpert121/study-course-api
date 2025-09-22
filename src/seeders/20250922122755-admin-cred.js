'use strict';

const bcrypt = require('bcrypt');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const saltRounds = 10;

    return queryInterface.bulkInsert('users', [
      {
        username: 'admin',
        email: 'admin@123gmail.com',
        password: await bcrypt.hash('Aa@12345', saltRounds),
        role: 'admin',
        verified: true,
        profileImage: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('users', null, {});
  }
};
