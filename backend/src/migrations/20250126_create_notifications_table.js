'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('notifications', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Type of notification (e.g., "idle_vehicle")',
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Notification title',
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Notification message',
      },
      vehicle_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'vehicles',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Reference to vehicle ID (if applicable)',
      },
      driver_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Reference to driver ID (if applicable)',
      },
      latitude: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: true,
        comment: 'GPS latitude where idle was detected',
      },
      longitude: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: true,
        comment: 'GPS longitude where idle was detected',
      },
      is_read: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether the notification has been read',
      },
      read_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp when notification was read',
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Additional metadata (e.g., idle duration, distance from SPBG, etc.)',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Create indexes
    await queryInterface.addIndex('notifications', ['type'], {
      name: 'notifications_type_idx',
    });
    await queryInterface.addIndex('notifications', ['vehicle_id'], {
      name: 'notifications_vehicle_id_idx',
    });
    await queryInterface.addIndex('notifications', ['is_read'], {
      name: 'notifications_is_read_idx',
    });
    await queryInterface.addIndex('notifications', ['created_at'], {
      name: 'notifications_created_at_idx',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('notifications');
  }
};

