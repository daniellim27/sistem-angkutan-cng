/**
 * Migration: Add planned route distance field to delivery_orders table
 * Created: 2025-01-15
 * Purpose: Store planned route distance for comparison with actual traveled distance
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('delivery_orders', 'planned_route_distance_km', {
      type: Sequelize.DECIMAL(10, 3),
      allowNull: true,
      comment: 'Planned route distance in kilometers for distance comparison'
    });

    await queryInterface.addColumn('delivery_orders', 'actual_traveled_distance_km', {
      type: Sequelize.DECIMAL(10, 3),
      allowNull: true,
      comment: 'Actual traveled distance in kilometers based on GPS tracking'
    });

    await queryInterface.addColumn('delivery_orders', 'distance_tolerance_percentage', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 31.0,
      comment: 'Distance tolerance percentage (default 31%)'
    });

    await queryInterface.addColumn('delivery_orders', 'distance_compliance_status', {
      type: Sequelize.ENUM('within_tolerance', 'exceeds_tolerance', 'not_calculated'),
      allowNull: true,
      defaultValue: 'not_calculated',
      comment: 'Status of distance compliance with planned route'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('delivery_orders', 'planned_route_distance_km');
    await queryInterface.removeColumn('delivery_orders', 'actual_traveled_distance_km');
    await queryInterface.removeColumn('delivery_orders', 'distance_tolerance_percentage');
    await queryInterface.removeColumn('delivery_orders', 'distance_compliance_status');
  }
};

