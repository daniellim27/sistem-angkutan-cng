const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CCTVSession = sequelize.define('CCTVSession', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    delivery_order_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'delivery_orders',
        key: 'id'
      },
      comment: 'Foreign key to delivery_orders table'
    },
    customer_location_index: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Index of customer location in delivery order locations array'
    },
    customer_name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Name of the customer location being monitored'
    },
    device_id: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'BARDI device ID used for monitoring'
    },
    bardi_session_token: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Encrypted BARDI session token for API access'
    },
    start_time: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'When the monitoring session started'
    },
    end_time: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the monitoring session ended'
    },
    status: {
      type: DataTypes.ENUM('active', 'completed', 'dead', 'stopped'),
      allowNull: false,
      defaultValue: 'active',
      comment: 'Current status of the monitoring session'
    },
    total_screenshots_captured: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Total number of screenshots captured in this session'
    },
    last_screenshot_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp of the last captured screenshot'
    },
    session_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Additional notes about the session'
    },
    created_nota_kecil_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'nota_kecils',
        key: 'id'
      },
      comment: 'Nota Kecil created from this monitoring session'
    },
    panel_row: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Panel row location in BARDI interface'
    },
    panel_column: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Panel column location in BARDI interface'
    },
    screenshot_interval_minutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10,
      comment: 'Interval between automatic screenshots in minutes'
    },
    health_check_interval_minutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 15,
      comment: 'Interval for health status checks in minutes'
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'User who created this monitoring session'
    }
  }, {
    tableName: 'cctv_sessions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        name: 'idx_cctv_sessions_delivery_order',
        fields: ['delivery_order_id']
      },
      {
        name: 'idx_cctv_sessions_status',
        fields: ['status']
      },
      {
        name: 'idx_cctv_sessions_start_time',
        fields: ['start_time']
      }
    ]
  });

  // Virtual field for health status (calculated, not stored)
  CCTVSession.prototype.getHealthStatus = function() {
    if (this.status !== 'active') {
      return this.status;
    }

    if (!this.last_screenshot_at) {
      return 'healthy'; // New session, no screenshots yet
    }

    const now = new Date();
    const lastCapture = new Date(this.last_screenshot_at);
    const minutesSinceLastCapture = (now - lastCapture) / (1000 * 60);

    const interval = this.screenshot_interval_minutes;
    const healthCheckThreshold = this.health_check_interval_minutes;

    if (minutesSinceLastCapture > healthCheckThreshold) {
      return 'dead';
    } else if (minutesSinceLastCapture > interval * 2) {
      return 'critical';
    } else if (minutesSinceLastCapture > interval * 1.5) {
      return 'warning';
    } else {
      return 'healthy';
    }
  };

  // Virtual field for time since last capture
  CCTVSession.prototype.getTimeSinceLastCapture = function() {
    if (!this.last_screenshot_at) {
      return 'No captures yet';
    }

    const now = new Date();
    const lastCapture = new Date(this.last_screenshot_at);
    const minutesSince = Math.floor((now - lastCapture) / (1000 * 60));

    if (minutesSince < 1) {
      return 'Just now';
    } else if (minutesSince < 60) {
      return `${minutesSince} minute${minutesSince > 1 ? 's' : ''} ago`;
    } else {
      const hoursSince = Math.floor(minutesSince / 60);
      return `${hoursSince} hour${hoursSince > 1 ? 's' : ''} ago`;
    }
  };

  return CCTVSession;
};
