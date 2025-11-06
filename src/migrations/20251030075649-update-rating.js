// // migrations/XXXX-add-isactive-to-ratings.js
// 'use strict';

// module.exports = {
//   async up(queryInterface, Sequelize) {
//     await queryInterface.addColumn('Ratings', 'isactive', {
//       type: Sequelize.BOOLEAN,
//       defaultValue: true,
//       allowNull: false
//     });
//   },

//   async down(queryInterface, Sequelize) {
//     await queryInterface.removeColumn('Ratings', 'isactive');
//   }
// };

// migrations/XXXX-add-isactive-to-ratings.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if the Ratings table exists
    const tableExists = await queryInterface.showAllTables()
      .then(tables => tables.includes('Ratings'));
    
    if (!tableExists) {
      console.log('Ratings table does not exist. Skipping migration.');
      return;
    }

    // Check if column already exists
    const tableDescription = await queryInterface.describeTable('Ratings');
    if (tableDescription.isactive) {
      console.log('Column isactive already exists. Skipping.');
      return;
    }

    await queryInterface.addColumn('Ratings', 'isactive', {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false
    });
  },

  async down(queryInterface, Sequelize) {
    const tableExists = await queryInterface.showAllTables()
      .then(tables => tables.includes('Ratings'));
    
    if (tableExists) {
      await queryInterface.removeColumn('Ratings', 'isactive');
    }
  }
};