-- ============================================================
-- SWIFT SPEED SENDER — SUPABASE SCHEMA
-- Run this entire file in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. SITE SETTINGS TABLE
-- Stores all admin-editable content: text, links, photos
-- ============================================================
CREATE TABLE IF NOT EXISTS site_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  value_type TEXT DEFAULT 'text' CHECK (value_type IN ('text', 'url', 'image', 'email', 'phone', 'json')),
  label TEXT,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. SERVICES TABLE
-- Each row is a service card shown on the Services page
-- ============================================================
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT DEFAULT 'package',
  price_from NUMERIC(10,2),
  currency TEXT DEFAULT 'USD',
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. PACKAGES TABLE
-- Core tracking table. tracking_number is unique + randomized
-- ============================================================
CREATE TABLE IF NOT EXISTS packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tracking_number TEXT UNIQUE NOT NULL,
  
  -- Sender info
  sender_name TEXT NOT NULL,
  sender_email TEXT,
  sender_phone TEXT,
  sender_address TEXT,
  sender_country TEXT NOT NULL,
  
  -- Receiver info
  receiver_name TEXT NOT NULL,
  receiver_email TEXT,
  receiver_phone TEXT,
  receiver_address TEXT,
  receiver_country TEXT NOT NULL,
  
  -- Package details
  service_type TEXT NOT NULL DEFAULT 'standard',
  weight_kg NUMERIC(8,2),
  dimensions_cm TEXT,
  description TEXT,
  declared_value NUMERIC(10,2),
  currency TEXT DEFAULT 'USD',
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending','picked_up','in_transit','customs','out_for_delivery','delivered','exception','returned')
  ),
  
  -- Current map location (most recent checkpoint)
  current_lat NUMERIC(10,7),
  current_lng NUMERIC(10,7),
  current_location_name TEXT,
  
  -- Timestamps
  estimated_delivery DATE,
  actual_delivery TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Soft delete
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- ============================================================
-- 4. TRACKING CHECKPOINTS TABLE
-- Every status update for a package gets a row here
-- ============================================================
CREATE TABLE IF NOT EXISTS tracking_checkpoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  
  status TEXT NOT NULL,
  location_name TEXT NOT NULL,
  description TEXT,
  lat NUMERIC(10,7),
  lng NUMERIC(10,7),
  
  -- Soft delete
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. QUOTES TABLE
-- Stores all quote requests and calculated results
-- ============================================================
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Request details
  origin_country TEXT NOT NULL,
  destination_country TEXT NOT NULL,
  weight_kg NUMERIC(8,2) NOT NULL CHECK (weight_kg > 0),
  package_type TEXT NOT NULL DEFAULT 'parcel',
  declared_value NUMERIC(10,2),
  
  -- Requester info (optional)
  requester_name TEXT,
  requester_email TEXT,
  
  -- Calculated result
  estimated_min NUMERIC(10,2),
  estimated_max NUMERIC(10,2),
  currency TEXT DEFAULT 'USD',
  transit_days_min INTEGER,
  transit_days_max INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. QUOTE PRICING RULES TABLE
-- Admin sets these to control quote calculations
-- ============================================================
CREATE TABLE IF NOT EXISTS quote_pricing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone_name TEXT NOT NULL,
  origin_region TEXT NOT NULL,
  destination_region TEXT NOT NULL,
  base_rate NUMERIC(10,2) NOT NULL DEFAULT 15.00,
  rate_per_kg NUMERIC(10,2) NOT NULL DEFAULT 2.50,
  min_weight_kg NUMERIC(8,2) DEFAULT 0.1,
  max_weight_kg NUMERIC(8,2) DEFAULT 70.0,
  transit_days_min INTEGER DEFAULT 3,
  transit_days_max INTEGER DEFAULT 7,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. CONTACTS TABLE
-- All contact form submissions stored here
-- ============================================================
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  replied_at TIMESTAMPTZ,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Soft delete
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- ============================================================
-- 8. ERROR LOGS TABLE
-- Captures frontend/function errors for admin review
-- ============================================================
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  error_type TEXT,
  error_message TEXT,
  page_url TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES — for fast lookups
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_packages_tracking ON packages(tracking_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_packages_status ON packages(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_checkpoints_package ON tracking_checkpoints(package_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_checkpoints_occurred ON tracking_checkpoints(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_read ON contacts(is_read) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_site_settings_key ON site_settings(key);

-- ============================================================
-- UPDATED_AT TRIGGER — auto-updates updated_at columns
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_packages_updated
  BEFORE UPDATE ON packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_services_updated
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_site_settings_updated
  BEFORE UPDATE ON site_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TRACKING NUMBER GENERATOR FUNCTION
-- Generates: SSS-YYYY-XXXXX (random 5 char alphanumeric)
-- ============================================================
CREATE OR REPLACE FUNCTION generate_tracking_number()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := 'SSS-' || TO_CHAR(NOW(), 'YYYY') || '-';
  i INTEGER;
BEGIN
  FOR i IN 1..5 LOOP
    result := result || SUBSTR(chars, FLOOR(RANDOM() * LENGTH(chars) + 1)::INT, 1);
  END LOOP;
  -- Check uniqueness, regenerate if collision (extremely rare)
  IF EXISTS (SELECT 1 FROM packages WHERE tracking_number = result) THEN
    RETURN generate_tracking_number();
  END IF;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- This is the security layer — every table locked down
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- ---- SITE SETTINGS ----
-- Public can READ settings (needed to display site content)
CREATE POLICY "public_read_settings" ON site_settings
  FOR SELECT TO anon USING (true);
-- Only authenticated admin can write
CREATE POLICY "admin_write_settings" ON site_settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---- SERVICES ----
-- Public can READ active services only
CREATE POLICY "public_read_services" ON services
  FOR SELECT TO anon USING (is_active = true);
-- Admin can do everything
CREATE POLICY "admin_all_services" ON services
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---- PACKAGES ----
-- Public can READ non-deleted packages (for tracking)
-- We allow anon read so customers can track without logging in
CREATE POLICY "public_read_packages" ON packages
  FOR SELECT TO anon USING (deleted_at IS NULL);
-- Admin can do everything
CREATE POLICY "admin_all_packages" ON packages
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---- TRACKING CHECKPOINTS ----
-- Public can READ non-deleted checkpoints
CREATE POLICY "public_read_checkpoints" ON tracking_checkpoints
  FOR SELECT TO anon USING (deleted_at IS NULL);
-- Admin can do everything
CREATE POLICY "admin_all_checkpoints" ON tracking_checkpoints
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---- QUOTES ----
-- Public can INSERT (submit quote requests)
CREATE POLICY "public_insert_quotes" ON quotes
  FOR INSERT TO anon WITH CHECK (true);
-- Admin can read all quotes
CREATE POLICY "admin_read_quotes" ON quotes
  FOR SELECT TO authenticated USING (true);

-- ---- QUOTE PRICING ----
-- Public can READ active pricing (needed for quote calc)
CREATE POLICY "public_read_pricing" ON quote_pricing
  FOR SELECT TO anon USING (is_active = true);
-- Admin full access
CREATE POLICY "admin_all_pricing" ON quote_pricing
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---- CONTACTS ----
-- Public can INSERT contact messages only
CREATE POLICY "public_insert_contacts" ON contacts
  FOR INSERT TO anon WITH CHECK (true);
-- Admin can read and update (mark as read, soft delete)
CREATE POLICY "admin_all_contacts" ON contacts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---- ERROR LOGS ----
-- Public can INSERT errors (for logging frontend issues)
CREATE POLICY "public_insert_errors" ON error_logs
  FOR INSERT TO anon WITH CHECK (true);
-- Admin can read
CREATE POLICY "admin_read_errors" ON error_logs
  FOR SELECT TO authenticated USING (true);
