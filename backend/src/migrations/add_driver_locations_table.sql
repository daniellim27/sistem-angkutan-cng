-- Migration: Add driver locations tracking table and update vehicles table
-- Created: 2025-01-15
-- Purpose: Enable real-time GPS tracking for vehicles and drivers

-- First, add device_id to vehicles table to link with Inovatracks devices
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS device_id VARCHAR(100);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS last_gps_update TIMESTAMP WITH TIME ZONE;

-- Create driver_locations table for real-time tracking
CREATE TABLE IF NOT EXISTS driver_locations (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
  delivery_order_id INTEGER REFERENCES delivery_orders(id) ON DELETE SET NULL,
  latitude DECIMAL(10, 8) NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude DECIMAL(11, 8) NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  altitude DECIMAL(10, 2),
  speed DECIMAL(8, 2) CHECK (speed >= 0),
  heading DECIMAL(5, 2) CHECK (heading BETWEEN 0 AND 360),
  accuracy DECIMAL(8, 2) CHECK (accuracy >= 0),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  device_id VARCHAR(100),
  battery_level INTEGER CHECK (battery_level BETWEEN 0 AND 100),
  signal_strength INTEGER,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_driver_locations_timestamp ON driver_locations(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_id_timestamp ON driver_locations(driver_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_driver_locations_vehicle_id_timestamp ON driver_locations(vehicle_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_driver_locations_delivery_order_id ON driver_locations(delivery_order_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_device_id ON driver_locations(device_id);

-- Add comments to document the table
COMMENT ON TABLE driver_locations IS 'Real-time GPS tracking data for vehicles and drivers';
COMMENT ON COLUMN driver_locations.driver_id IS 'Reference to driver user ID';
COMMENT ON COLUMN driver_locations.vehicle_id IS 'Reference to vehicle ID';
COMMENT ON COLUMN driver_locations.delivery_order_id IS 'Optional reference to active delivery order';
COMMENT ON COLUMN driver_locations.latitude IS 'GPS latitude coordinate';
COMMENT ON COLUMN driver_locations.longitude IS 'GPS longitude coordinate';
COMMENT ON COLUMN driver_locations.altitude IS 'Altitude in meters (if available)';
COMMENT ON COLUMN driver_locations.speed IS 'Speed in km/h';
COMMENT ON COLUMN driver_locations.heading IS 'Direction in degrees (0-360)';
COMMENT ON COLUMN driver_locations.accuracy IS 'GPS accuracy in meters';
COMMENT ON COLUMN driver_locations.timestamp IS 'Timestamp when GPS data was recorded';
COMMENT ON COLUMN driver_locations.device_id IS 'Inovatracks device identifier';
COMMENT ON COLUMN driver_locations.battery_level IS 'Device battery level percentage';
COMMENT ON COLUMN driver_locations.signal_strength IS 'GPS signal strength';
COMMENT ON COLUMN driver_locations.status IS 'Device status (active, idle, offline, etc.)';

-- Add comments to vehicles table new columns
COMMENT ON COLUMN vehicles.device_id IS 'Inovatracks GPS device identifier';
COMMENT ON COLUMN vehicles.last_gps_update IS 'Last time GPS data was received for this vehicle';

-- Create a function to clean up old location data (optional)
CREATE OR REPLACE FUNCTION cleanup_old_driver_locations()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM driver_locations 
  WHERE timestamp < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- You can manually run this to clean up old data:
-- SELECT cleanup_old_driver_locations(); 