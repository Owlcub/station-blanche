-- Migration: Add SMTP configuration table
-- Date: 2026-02-05
-- Description: Adds smtp_config table for email alert configuration

-- Create smtp_config table if it doesn't exist
CREATE TABLE IF NOT EXISTS smtp_config (
    id SERIAL PRIMARY KEY,
    host VARCHAR(255) NOT NULL,
    port INTEGER NOT NULL,
    secure BOOLEAN DEFAULT false,
    smtp_user VARCHAR(255) NOT NULL,
    smtp_password TEXT NOT NULL, -- Encrypted password
    from_email VARCHAR(255) NOT NULL,
    from_name VARCHAR(255) DEFAULT 'Station Blanche',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Also fix api_keys table column names if needed
DO $$
BEGIN
    -- Rename is_active to active if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'api_keys' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE api_keys RENAME COLUMN is_active TO active;
    END IF;

    -- Rename last_used_at to last_used if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'api_keys' AND column_name = 'last_used_at'
    ) THEN
        ALTER TABLE api_keys RENAME COLUMN last_used_at TO last_used;
    END IF;
END $$;
