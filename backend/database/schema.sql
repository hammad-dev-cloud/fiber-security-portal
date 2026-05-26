-- =====================================================================
-- Fiber Security Portal — Database Schema
-- Run this entire script in Supabase SQL Editor (Project → SQL Editor → New Query)
-- =====================================================================

-- Drop existing tables (use only on fresh setup or full reset)
DROP TABLE IF EXISTS login_attempts CASCADE;
DROP TABLE IF EXISTS security_alerts CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS router_status_logs CASCADE;
DROP TABLE IF EXISTS routers CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS packages CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;

-- ---------------------------------------------------------------------
-- 1. ADMIN USERS (Portal login accounts)
-- ---------------------------------------------------------------------
CREATE TABLE admin_users (
    id              SERIAL PRIMARY KEY,
    username        VARCHAR(60)  UNIQUE NOT NULL,
    email           VARCHAR(120) UNIQUE NOT NULL,
    password_hash   TEXT         NOT NULL,
    full_name       VARCHAR(120),
    role            VARCHAR(20)  DEFAULT 'admin',   -- admin | viewer
    is_active       BOOLEAN      DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 2. INTERNET PACKAGES (Plans offered to customers)
-- ---------------------------------------------------------------------
CREATE TABLE packages (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(80)  NOT NULL,
    speed_mbps      INTEGER      NOT NULL,
    price_pkr       NUMERIC(10,2) NOT NULL,
    data_limit_gb   INTEGER,                       -- NULL = unlimited
    duration_days   INTEGER      DEFAULT 30,
    description     TEXT,
    is_active       BOOLEAN      DEFAULT TRUE,
    created_at      TIMESTAMPTZ  DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 3. CUSTOMERS (Fiber internet subscribers)
-- ---------------------------------------------------------------------
CREATE TABLE customers (
    id              SERIAL PRIMARY KEY,
    full_name       VARCHAR(120) NOT NULL,
    email           VARCHAR(120) UNIQUE,
    phone           VARCHAR(20),
    cnic            VARCHAR(20),
    address         TEXT,
    mac_address     VARCHAR(17)  UNIQUE NOT NULL,  -- format AA:BB:CC:DD:EE:FF
    ip_address      VARCHAR(45)  UNIQUE NOT NULL,
    package_id      INTEGER      REFERENCES packages(id) ON DELETE SET NULL,
    activation_date DATE         DEFAULT CURRENT_DATE,
    expiry_date     DATE         NOT NULL,
    status          VARCHAR(20)  DEFAULT 'active', -- active | expired | suspended | terminated
    notes           TEXT,
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX idx_customers_mac      ON customers(mac_address);
CREATE INDEX idx_customers_ip       ON customers(ip_address);
CREATE INDEX idx_customers_status   ON customers(status);
CREATE INDEX idx_customers_expiry   ON customers(expiry_date);

-- ---------------------------------------------------------------------
-- 4. ROUTERS (Customer-side network equipment)
-- ---------------------------------------------------------------------
CREATE TABLE routers (
    id              SERIAL PRIMARY KEY,
    customer_id     INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    router_name     VARCHAR(80),
    ip_address      VARCHAR(45)  NOT NULL,
    mac_address     VARCHAR(17),
    model           VARCHAR(60),
    location        VARCHAR(120),
    status          VARCHAR(20)  DEFAULT 'unknown', -- online | offline | unknown
    last_ping_ms    INTEGER,
    last_checked_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX idx_routers_customer ON routers(customer_id);
CREATE INDEX idx_routers_status   ON routers(status);

-- Optional: keep a history of online/offline transitions
CREATE TABLE router_status_logs (
    id          SERIAL PRIMARY KEY,
    router_id   INTEGER REFERENCES routers(id) ON DELETE CASCADE,
    status      VARCHAR(20) NOT NULL,
    ping_ms     INTEGER,
    checked_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_router_logs_router ON router_status_logs(router_id);

-- ---------------------------------------------------------------------
-- 5. PAYMENTS (Billing records)
-- ---------------------------------------------------------------------
CREATE TABLE payments (
    id              SERIAL PRIMARY KEY,
    customer_id     INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    package_id      INTEGER REFERENCES packages(id) ON DELETE SET NULL,
    amount_pkr      NUMERIC(10,2) NOT NULL,
    payment_method  VARCHAR(40),                  -- cash | bank | jazzcash | easypaisa
    transaction_id  VARCHAR(80),
    period_start    DATE NOT NULL,
    period_end      DATE NOT NULL,
    status          VARCHAR(20) DEFAULT 'paid',   -- paid | pending | failed
    paid_at         TIMESTAMPTZ DEFAULT NOW(),
    notes           TEXT
);

CREATE INDEX idx_payments_customer ON payments(customer_id);
CREATE INDEX idx_payments_status   ON payments(status);

-- ---------------------------------------------------------------------
-- 6. SECURITY ALERTS (IDS, brute force, MAC spoofing, etc.)
-- ---------------------------------------------------------------------
CREATE TABLE security_alerts (
    id              SERIAL PRIMARY KEY,
    alert_type      VARCHAR(60) NOT NULL,         -- brute_force | mac_spoof | failed_login | port_scan | router_down | package_expiry
    severity        VARCHAR(20) DEFAULT 'medium', -- low | medium | high | critical
    source_ip       VARCHAR(45),
    source_mac      VARCHAR(17),
    target          VARCHAR(120),                 -- target endpoint/customer/router
    message         TEXT NOT NULL,
    metadata        JSONB,                        -- extra structured info
    is_resolved     BOOLEAN DEFAULT FALSE,
    resolved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_type     ON security_alerts(alert_type);
CREATE INDEX idx_alerts_severity ON security_alerts(severity);
CREATE INDEX idx_alerts_resolved ON security_alerts(is_resolved);
CREATE INDEX idx_alerts_created  ON security_alerts(created_at DESC);

-- ---------------------------------------------------------------------
-- 7. LOGIN ATTEMPTS (Brute force detection source)
-- ---------------------------------------------------------------------
CREATE TABLE login_attempts (
    id          SERIAL PRIMARY KEY,
    username    VARCHAR(60),
    source_ip   VARCHAR(45),
    user_agent  TEXT,
    success     BOOLEAN DEFAULT FALSE,
    reason      VARCHAR(120),                     -- wrong_password | user_not_found | locked | ok
    attempted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_login_ip      ON login_attempts(source_ip);
CREATE INDEX idx_login_user    ON login_attempts(username);
CREATE INDEX idx_login_time    ON login_attempts(attempted_at DESC);

-- =====================================================================
-- SEED DATA — for instant demo (default admin + sample packages)
-- =====================================================================

-- Default admin user
-- Username:  admin
-- Password:  Admin@123
-- Hash below is bcrypt of "Admin@123" (cost 12)
INSERT INTO admin_users (username, email, password_hash, full_name, role)
VALUES (
    'admin',
    'admin@fiberportal.local',
    '$2b$12$WgVgaCm6OQGo4pXcwGm3O.eEHj1g1FuZDR0CYg5xS0Glv2QHcl1Pa',
    'System Administrator',
    'admin'
);

-- Sample packages
INSERT INTO packages (name, speed_mbps, price_pkr, data_limit_gb, duration_days, description) VALUES
('Starter Fiber',     10,  1500.00,  100,  30, 'Entry-level home plan — perfect for browsing & streaming.'),
('Home Plus',         25,  2500.00,  300,  30, 'Family-friendly speed for HD streaming and online classes.'),
('Pro Streamer',      50,  4000.00,  600,  30, '4K streaming, video calls, gaming — no buffering.'),
('Power User',       100,  6500.00, NULL,  30, 'Unlimited data with gigabit-class speeds.'),
('Business Elite',   200, 12000.00, NULL,  30, 'Symmetric speeds with priority support for businesses.');

-- Sample customers (3 demo entries)
INSERT INTO customers (full_name, email, phone, cnic, address, mac_address, ip_address, package_id, expiry_date, status)
VALUES
('Ahmed Khan',    'ahmed.khan@example.com',   '03001234567', '42101-1234567-1', 'House 12, Block B, Gulshan, Karachi', 'AA:BB:CC:11:22:33', '192.168.10.101', 2, CURRENT_DATE + INTERVAL '15 days', 'active'),
('Sara Ali',      'sara.ali@example.com',     '03217654321', '42101-7654321-2', 'Flat 305, Clifton Heights, Karachi',   'AA:BB:CC:44:55:66', '192.168.10.102', 3, CURRENT_DATE + INTERVAL '5 days',  'active'),
('Bilal Hussain', 'bilal.h@example.com',      '03335551111', '42101-5555111-3', 'Plot 88, DHA Phase 6, Karachi',        'AA:BB:CC:77:88:99', '192.168.10.103', 4, CURRENT_DATE - INTERVAL '2 days',  'expired');

-- Sample routers
INSERT INTO routers (customer_id, router_name, ip_address, mac_address, model, location, status, last_ping_ms, last_checked_at)
VALUES
(1, 'Ahmed-Router',  '192.168.10.101', 'AA:BB:CC:11:22:33', 'TP-Link Archer C6',  'Gulshan',  'online',   12, NOW()),
(2, 'Sara-Router',   '192.168.10.102', 'AA:BB:CC:44:55:66', 'Tenda AC10',         'Clifton',  'online',   24, NOW()),
(3, 'Bilal-Router',  '192.168.10.103', 'AA:BB:CC:77:88:99', 'Huawei HG8245H5',    'DHA',      'offline',  NULL, NOW() - INTERVAL '20 minutes');

-- Sample payments
INSERT INTO payments (customer_id, package_id, amount_pkr, payment_method, transaction_id, period_start, period_end, status)
VALUES
(1, 2, 2500.00, 'jazzcash',  'JC-2026-0001', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '15 days', 'paid'),
(2, 3, 4000.00, 'easypaisa', 'EP-2026-0002', CURRENT_DATE - INTERVAL '25 days', CURRENT_DATE + INTERVAL '5 days',  'paid'),
(3, 4, 6500.00, 'cash',      'CSH-2026-003', CURRENT_DATE - INTERVAL '32 days', CURRENT_DATE - INTERVAL '2 days',  'paid');

-- A few seed alerts so the dashboard isn't empty on first run
INSERT INTO security_alerts (alert_type, severity, source_ip, target, message)
VALUES
('failed_login',  'low',      '192.168.1.55',  'admin',           'Single failed login attempt for user "admin".'),
('router_down',   'high',     '192.168.10.103','Bilal-Router',    'Router has been offline for over 20 minutes.'),
('package_expiry','medium',   NULL,            'Bilal Hussain',   'Customer package expired 2 days ago.');

-- Final notice
DO $$
BEGIN
  RAISE NOTICE 'Fiber Security Portal schema created successfully.';
  RAISE NOTICE 'Default admin → username: admin  |  password: Admin@123';
END $$;
