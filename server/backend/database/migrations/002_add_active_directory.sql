-- Migration: Add Active Directory integration tables
-- Date: 2026-02-06
-- Description: Adds AD config and USB connection tracking

-- Create AD configuration table
CREATE TABLE IF NOT EXISTS ad_config (
    id SERIAL PRIMARY KEY,
    host VARCHAR(255) NOT NULL,
    port INTEGER NOT NULL DEFAULT 389,
    base_dn VARCHAR(255) NOT NULL,
    bind_dn VARCHAR(255) NOT NULL,
    bind_password TEXT NOT NULL, -- Encrypted
    enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create USB connections tracking table
CREATE TABLE IF NOT EXISTS usb_connections (
    id SERIAL PRIMARY KEY,
    station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
    usb_uuid VARCHAR(255) NOT NULL,
    usb_serial VARCHAR(255),
    ad_username VARCHAR(255),
    computer_name VARCHAR(255),
    ad_domain VARCHAR(255),
    connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Indexes for performance
    CONSTRAINT usb_connections_unique_entry UNIQUE (station_id, usb_uuid, connected_at)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_usb_connections_station ON usb_connections(station_id);
CREATE INDEX IF NOT EXISTS idx_usb_connections_uuid ON usb_connections(usb_uuid);
CREATE INDEX IF NOT EXISTS idx_usb_connections_username ON usb_connections(ad_username);
CREATE INDEX IF NOT EXISTS idx_usb_connections_connected_at ON usb_connections(connected_at DESC);
