-- Infrastructure Inventory System Migration
-- Created: 2024-12-25
-- Description: Creates tables for infrastructure inventory management similar to stock system

-- Infrastructure Categories Table
CREATE TABLE infrastructure_categories (
    id SERIAL PRIMARY KEY,
    category_name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Infrastructure Locations Table (will integrate with cash book)
CREATE TABLE infrastructure_locations (
    id SERIAL PRIMARY KEY,
    location_name VARCHAR(255) NOT NULL UNIQUE,
    location_code VARCHAR(50) UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Infrastructure Items Table
CREATE TABLE infrastructure_items (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES infrastructure_categories(id),
    location_id INTEGER REFERENCES infrastructure_locations(id),
    item_code VARCHAR(50) UNIQUE,
    item_name VARCHAR(255) NOT NULL,
    supplier VARCHAR(255),
    unit VARCHAR(20) NOT NULL DEFAULT 'Pcs',
    min_quantity NUMERIC(10,2) NOT NULL DEFAULT 0,
    average_unit_price NUMERIC(15,2) DEFAULT 0,
    total_value NUMERIC(15,2) DEFAULT 0,
    expired_date DATE, -- New field for infrastructure items with expiration
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Infrastructure Batches Table
CREATE TABLE infrastructure_batches (
    id SERIAL PRIMARY KEY,
    item_id INTEGER REFERENCES infrastructure_items(id) ON DELETE CASCADE,
    batch_number VARCHAR(100) NOT NULL,
    quantity NUMERIC(10,2) NOT NULL DEFAULT 0,
    original_quantity NUMERIC(10,2) NOT NULL,
    unit_price NUMERIC(15,2) NOT NULL,
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expired_date DATE, -- Batch-level expiration date
    supplier VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(item_id, batch_number)
);

-- Infrastructure Transactions Table
CREATE TABLE infrastructure_transactions (
    id SERIAL PRIMARY KEY,
    item_id INTEGER REFERENCES infrastructure_items(id) ON DELETE CASCADE,
    batch_id INTEGER REFERENCES infrastructure_batches(id) ON DELETE SET NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK(transaction_type IN ('in','out','adjustment')),
    quantity NUMERIC(10,2) NOT NULL,
    unit_price NUMERIC(15,2),
    total_amount NUMERIC(15,2),
    reference_type VARCHAR(50),
    reference_id INTEGER,
    supplier VARCHAR(255),
    notes TEXT,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default infrastructure categories
INSERT INTO infrastructure_categories (category_name, description) VALUES
('Tools & Equipment', 'Tools and equipment for maintenance and operations'),
('Safety Equipment', 'Safety gear and protective equipment'),
('Office Supplies', 'Office materials and supplies'),
('IT Equipment', 'Computers, printers, and IT infrastructure'),
('Vehicle Parts', 'Spare parts and components for vehicles'),
('Building Materials', 'Construction and building materials'),
('Electrical', 'Electrical components and supplies'),
('Other', 'Other infrastructure items');

-- Insert default infrastructure locations
INSERT INTO infrastructure_locations (location_name, location_code, description) VALUES
('Main Warehouse', 'WH001', 'Primary storage warehouse'),
('Office', 'OFF001', 'Office storage area'),
('Workshop', 'WS001', 'Workshop and maintenance area'),
('Garage', 'GAR001', 'Vehicle garage storage'),
('IT Room', 'IT001', 'IT equipment storage room'),
('Safety Storage', 'SAF001', 'Safety equipment storage area');

-- Create indexes for better performance
CREATE INDEX idx_infrastructure_items_category ON infrastructure_items(category_id);
CREATE INDEX idx_infrastructure_items_location ON infrastructure_items(location_id);
CREATE INDEX idx_infrastructure_items_supplier ON infrastructure_items(supplier);
CREATE INDEX idx_infrastructure_items_expired_date ON infrastructure_items(expired_date);
CREATE INDEX idx_infrastructure_batches_item ON infrastructure_batches(item_id);
CREATE INDEX idx_infrastructure_batches_expired_date ON infrastructure_batches(expired_date);
CREATE INDEX idx_infrastructure_transactions_item ON infrastructure_transactions(item_id);
CREATE INDEX idx_infrastructure_transactions_batch ON infrastructure_transactions(batch_id);
CREATE INDEX idx_infrastructure_transactions_date ON infrastructure_transactions(transaction_date);
