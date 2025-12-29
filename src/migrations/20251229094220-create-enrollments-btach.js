// migrations/[timestamp]-add-batch-to-enrollments.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('enrollments', 'batch', {
      type: Sequelize.ENUM('1', '6'),
      allowNull: false,
      defaultValue: '1'
    });

    // Add index on batch column
    await queryInterface.addIndex('enrollments', {
      fields: ['batch'],
      name: 'enrollments_batch_idx'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove index
    await queryInterface.removeIndex('enrollments', 'enrollments_batch_idx');

    // Remove batch column
    await queryInterface.removeColumn('enrollments', 'batch');

    // Remove ENUM type
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_enrollments_batch"');
  },
};