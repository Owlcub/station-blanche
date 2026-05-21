-- Station Blanche - Serveur Central
-- Database Schema

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Stations table
CREATE TABLE IF NOT EXISTS stations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(500),
    version VARCHAR(50),
    status VARCHAR(50) DEFAULT 'offline', -- online, offline, error
    last_heartbeat TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stations_station_id ON stations(station_id);
CREATE INDEX idx_stations_status ON stations(status);
CREATE INDEX idx_stations_last_heartbeat ON stations(last_heartbeat);

-- API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key_hash VARCHAR(255) UNIQUE NOT NULL,
    key_prefix VARCHAR(20) NOT NULL, -- For identification (sk_live_xxx)
    station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    last_used TIMESTAMP,
    active BOOLEAN DEFAULT true
);

CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_station_id ON api_keys(station_id);

-- Certificates table
CREATE TABLE IF NOT EXISTS certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    certificate_id VARCHAR(255) UNIQUE NOT NULL,
    usb_uuid VARCHAR(255) NOT NULL,
    usb_serial VARCHAR(255),
    usb_label VARCHAR(255),
    usb_size BIGINT,
    station_id UUID REFERENCES stations(id),
    issued_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    revoked_by VARCHAR(255),
    revoke_reason TEXT,
    signature TEXT NOT NULL,
    scan_summary JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_certificates_certificate_id ON certificates(certificate_id);
CREATE INDEX idx_certificates_usb_uuid ON certificates(usb_uuid);
CREATE INDEX idx_certificates_station_id ON certificates(station_id);
CREATE INDEX idx_certificates_expires_at ON certificates(expires_at);
CREATE INDEX idx_certificates_revoked_at ON certificates(revoked_at);

-- Scan logs table
CREATE TABLE IF NOT EXISTS scan_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_id UUID REFERENCES stations(id),
    device VARCHAR(255),
    mount_point VARCHAR(500),
    usb_uuid VARCHAR(255),
    scan_duration_ms INTEGER,
    total_files INTEGER,
    infected_files INTEGER,
    clamav_clean BOOLEAN,
    ransomware_detected BOOLEAN,
    entropy_status VARCHAR(50),
    scan_result JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scan_logs_station_id ON scan_logs(station_id);
CREATE INDEX idx_scan_logs_usb_uuid ON scan_logs(usb_uuid);
CREATE INDEX idx_scan_logs_created_at ON scan_logs(created_at);
CREATE INDEX idx_scan_logs_infected_files ON scan_logs(infected_files);

-- Threat alerts table
CREATE TABLE IF NOT EXISTS threat_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_id UUID REFERENCES stations(id),
    scan_log_id UUID REFERENCES scan_logs(id),
    priority VARCHAR(50) NOT NULL, -- critical, high, medium, low
    threat_type VARCHAR(100) NOT NULL, -- virus, ransomware, entropy, suspicious
    threat_details JSONB,
    acknowledged BOOLEAN DEFAULT false,
    acknowledged_by VARCHAR(255),
    acknowledged_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_threat_alerts_station_id ON threat_alerts(station_id);
CREATE INDEX idx_threat_alerts_priority ON threat_alerts(priority);
CREATE INDEX idx_threat_alerts_acknowledged ON threat_alerts(acknowledged);
CREATE INDEX idx_threat_alerts_created_at ON threat_alerts(created_at);

-- EDR rules table
CREATE TABLE IF NOT EXISTS edr_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_name VARCHAR(255) UNIQUE NOT NULL,
    rule_type VARCHAR(100) NOT NULL, -- ransomware_extension, ransom_note, entropy_threshold, etc.
    rule_data JSONB NOT NULL,
    enabled BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 100,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_edr_rules_enabled ON edr_rules(enabled);
CREATE INDEX idx_edr_rules_rule_type ON edr_rules(rule_type);

-- Software updates table
CREATE TABLE IF NOT EXISTS software_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version VARCHAR(50) UNIQUE NOT NULL,
    git_tag VARCHAR(100) NOT NULL,
    release_notes TEXT,
    changelog TEXT,
    mandatory BOOLEAN DEFAULT false,
    published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deprecated_at TIMESTAMP
);

CREATE INDEX idx_software_updates_version ON software_updates(version);
CREATE INDEX idx_software_updates_published_at ON software_updates(published_at);

-- Station updates table (deployment tracking)
CREATE TABLE IF NOT EXISTS station_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_id UUID REFERENCES stations(id),
    update_id UUID REFERENCES software_updates(id),
    status VARCHAR(50) DEFAULT 'pending', -- pending, downloading, installing, success, failed
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_station_updates_station_id ON station_updates(station_id);
CREATE INDEX idx_station_updates_status ON station_updates(status);

-- Users table (for dashboard access)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    email VARCHAR(255),
    role VARCHAR(50) DEFAULT 'viewer', -- admin, operator, viewer
    ad_linked BOOLEAN DEFAULT false,
    ad_dn TEXT,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    details JSONB,
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- SMTP configuration table
CREATE TABLE IF NOT EXISTS smtp_config (
    id SERIAL PRIMARY KEY,
    host VARCHAR(255) NOT NULL,
    port INTEGER NOT NULL,
    secure BOOLEAN DEFAULT false,
    user VARCHAR(255) NOT NULL,
    password TEXT NOT NULL, -- Encrypted password
    from_email VARCHAR(255) NOT NULL,
    from_name VARCHAR(255) DEFAULT 'Station Blanche',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin user
INSERT INTO users (username, password_hash, role)
VALUES (
    'admin',
    '$2b$10$O5LkXh8bQfGlTZ7b9Z.S7eVPkI0uKYLH0YmKgT1LkZOeRaF0xfKd2', -- StationBlanche-Admin-2024
    'admin'
)
ON CONFLICT (username) DO NOTHING;

-- Insert default EDR rules
INSERT INTO edr_rules (rule_name, rule_type, rule_data, priority) VALUES
('ransomware_extensions', 'ransomware_extension', '{"extensions": [".encrypted", ".locked", ".crypto", ".cerber", ".locky", ".zepto"]}', 100),
('ransom_notes', 'ransom_note', '{"patterns": ["README.txt", "HOW_TO_DECRYPT.txt", "RESTORE_FILES.txt"]}', 100),
('entropy_threshold', 'entropy', '{"threshold": 7.5}', 90)
ON CONFLICT (rule_name) DO NOTHING;
