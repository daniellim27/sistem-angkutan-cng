const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Notification = sequelize.define(
    'Notification',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Type of notification (e.g., "idle_vehicle")',
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Notification title',
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Notification message',
      },
      vehicle_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'vehicles',
          key: 'id',
        },
        comment: 'Reference to vehicle ID (if applicable)',
      },
      driver_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        comment: 'Reference to driver ID (if applicable)',
      },
      latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true,
        comment: 'GPS latitude where idle was detected',
      },
      longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
        comment: 'GPS longitude where idle was detected',
      },
      is_read: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether the notification has been read',
      },
      read_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp when notification was read',
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Additional metadata (e.g., idle duration, distance from SPBG, etc.)',
      },
    },
    {
      tableName: 'notifications',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          fields: ['type'],
        },
        {
          fields: ['vehicle_id'],
        },
        {
          fields: ['is_read'],
        },
        {
          fields: ['created_at'],
        },
      ],
    }
  );

  return Notification;
};

