'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // ✅ Just add the constraint (no need to remove anything)
    await queryInterface.addConstraint('chapters', {
      fields: ['course_id'],
      type: 'foreign key',
      name: 'chapters_course_id_fkey', // give it a readable name
      references: {
        table: 'courses',
        field: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Rollback by removing the added constraint
    await queryInterface.removeConstraint('chapters', 'chapters_course_id_fkey');
  }
};
