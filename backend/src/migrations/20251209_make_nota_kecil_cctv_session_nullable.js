'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔄 Updating cctv_session_id foreign key in nota_kecils to SET NULL on delete...');

    await queryInterface.changeColumn('nota_kecils', 'cctv_session_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'cctv_sessions',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'CCTV session this nota was created from'
    });

    console.log('✅ cctv_session_id foreign key updated to SET NULL on delete');
  },

  down: async (queryInterface, Sequelize) => {
    console.log('🔄 Reverting cctv_session_id foreign key in nota_kecils to RESTRICT on delete...');

    await queryInterface.changeColumn('nota_kecils', 'cctv_session_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'cctv_sessions',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
      comment: 'CCTV session this nota was created from'
    });

    console.log('✅ cctv_session_id foreign key reverted to RESTRICT on delete');
  }
};


