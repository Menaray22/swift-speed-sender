-- ============================================================
-- SWIFT SPEED SENDER — SEED DATA
-- Run AFTER schema.sql in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- SITE SETTINGS — All editable content
-- ============================================================
INSERT INTO site_settings (key, value, value_type, label, description) VALUES
-- Company identity
('company_name',        'Swift Speed Sender',                         'text',  'Company Name',        'Displayed in header and footer'),
('company_tagline',     'Delivering Trust Since 1940',                'text',  'Tagline',             'Hero section subtitle'),
('company_established', '1940',                                       'text',  'Year Established',    'Used in About page'),
('company_email',       'contact@swiftspeedsender.com',               'email', 'Contact Email',       'Shown on Contact page'),
('company_phone',       '+1 (800) 555-0192',                          'phone', 'Phone Number',        'Shown in header and contact'),
('company_address',     '1940 Commerce Boulevard, New York, NY 10001','text',  'Office Address',      'Contact page address'),
('company_hours',       'Mon–Fri: 8AM–8PM | Sat: 9AM–5PM',           'text',  'Business Hours',      'Contact page hours'),

-- Social / communication links
('social_facebook',     'https://facebook.com/',                      'url',   'Facebook URL',        'Facebook page link'),
('social_instagram',    'https://instagram.com/',                     'url',   'Instagram URL',       'Instagram profile link'),
('social_whatsapp',     'https://wa.me/18005550192',                  'url',   'WhatsApp Link',       'WhatsApp click-to-chat link'),
('social_twitter',      'https://twitter.com/',                       'url',   'Twitter/X URL',       'Twitter or X profile'),
('social_linkedin',     'https://linkedin.com/',                      'url',   'LinkedIn URL',        'LinkedIn company page'),

-- Hero section
('hero_headline',       'Your Shipment,\nOur Commitment.',            'text',  'Hero Headline',       'Main hero text (use \n for line break)'),
('hero_subtext',        'Eight decades of precision logistics. Trusted by families and businesses across 140 countries.', 'text', 'Hero Subtext', 'Hero paragraph'),
('hero_image_url',      '',                                           'image', 'Hero Background Image','Upload URL for hero background'),
('hero_cta_primary',    'Track Your Package',                         'text',  'Hero Primary Button', 'Primary CTA button text'),
('hero_cta_secondary',  'Get a Quote',                                'text',  'Hero Secondary Button','Secondary CTA button text'),

-- Stats bar
('stat_countries',      '140',                                        'text',  'Countries Served',    'Stats bar number'),
('stat_packages',       '2.4M+',                                      'text',  'Packages Delivered',  'Stats bar number'),
('stat_years',          '84',                                         'text',  'Years in Business',   'Stats bar number'),
('stat_satisfaction',   '99.2%',                                      'text',  'Customer Satisfaction','Stats bar number'),

-- About section
('about_headline',      'A Legacy of Reliability',                    'text',  'About Headline',      'About page main heading'),
('about_story',         'Founded in the post-war recovery of 1940 by maritime veteran Harold J. Swift, our company began with a single promise: that every parcel entrusted to us would arrive safely, on time, and with care. From humble roots in New York harbor, we grew alongside the modern world — adapting to air freight, containerization, digital tracking, and global commerce — while never losing the values that Harold built into every shipment. Today, Swift Speed Sender operates across 140 countries, employing over 3,000 logistics professionals who carry that same promise forward every single day.', 'text', 'About Story', 'About page story paragraph'),
('about_image_url',     '',                                           'image', 'About Page Image',    'Upload URL for about page photo'),
('about_mission',       'To connect people and businesses across every distance, delivering not just packages but peace of mind.', 'text', 'Mission Statement', 'About page mission'),

-- Footer
('footer_tagline',      'Delivering Trust Since 1940.',               'text',  'Footer Tagline',      'Footer bottom text'),
('footer_copyright',    'Swift Speed Sender. All rights reserved.',   'text',  'Copyright Text',      'Footer copyright line'),

-- SEO
('meta_description',    'Swift Speed Sender — International courier and logistics since 1940. Track packages, get quotes, and ship worldwide with confidence.', 'text', 'Meta Description', 'SEO meta description for all pages'),

-- Map defaults (where map centers when no package selected)
('map_default_lat',     '40.7128',                                    'text',  'Default Map Latitude', 'Map center latitude'),
('map_default_lng',     '-74.0060',                                   'text',  'Default Map Longitude','Map center longitude'),
('map_default_zoom',    '4',                                          'text',  'Default Map Zoom',    'Map zoom level 1-18')

ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- SERVICES
-- ============================================================
INSERT INTO services (title, description, icon, price_from, currency, is_active, sort_order) VALUES
('Express Delivery',
 'Door-to-door delivery within 1–3 business days. Ideal for urgent documents, legal papers, and time-critical shipments. Real-time tracking at every step.',
 'zap', 29.99, 'USD', true, 1),

('Standard Shipping',
 'Reliable international shipping in 5–10 business days. Our most popular service for parcels up to 30kg with full insurance coverage.',
 'package', 12.99, 'USD', true, 2),

('Freight & Cargo',
 'Heavy and oversized shipment solutions for businesses. Sea and air freight options with dedicated account management and customs brokerage.',
 'anchor', 199.00, 'USD', true, 3),

('Same-Day Courier',
 'Local same-day delivery within metropolitan areas. Perfect for last-minute gifts, business documents, and medical supplies.',
 'clock', 49.99, 'USD', true, 4),

('Cold Chain Logistics',
 'Temperature-controlled shipping for perishables, pharmaceuticals, and sensitive goods. Monitored continuously from pickup to delivery.',
 'thermometer', 89.99, 'USD', true, 5),

('Customs Clearance',
 'Expert handling of all customs documentation, duties, and regulations. Our licensed brokers ensure smooth cross-border movement for your goods.',
 'file-check', 35.00, 'USD', true, 6);

-- ============================================================
-- QUOTE PRICING RULES
-- ============================================================
INSERT INTO quote_pricing (zone_name, origin_region, destination_region, base_rate, rate_per_kg, transit_days_min, transit_days_max) VALUES
('Zone 1 — Domestic US',      'US', 'US', 8.00,  1.20, 1, 3),
('Zone 2 — North America',    'US', 'NA', 15.00, 2.00, 2, 5),
('Zone 3 — Europe',           'US', 'EU', 22.00, 3.50, 5, 10),
('Zone 4 — Asia Pacific',     'US', 'AP', 28.00, 4.00, 6, 12),
('Zone 5 — Middle East',      'US', 'ME', 30.00, 4.50, 7, 14),
('Zone 6 — Africa',           'US', 'AF', 35.00, 5.00, 8, 16),
('Zone 7 — Latin America',    'US', 'LA', 25.00, 3.80, 5, 11),
('Zone 8 — Rest of World',    'US', 'RW', 40.00, 5.50, 10, 18),
('Zone 2 — North America',    'EU', 'NA', 20.00, 3.00, 3, 7),
('Zone 1 — European',         'EU', 'EU', 12.00, 2.00, 2, 5),
('Zone 3 — Asia Pacific',     'EU', 'AP', 25.00, 3.80, 5, 10);

-- ============================================================
-- SAMPLE PACKAGE (for testing tracking page)
-- ============================================================
INSERT INTO packages (
  tracking_number,
  sender_name, sender_email, sender_country,
  receiver_name, receiver_email, receiver_country,
  service_type, weight_kg, description, declared_value,
  status, current_lat, current_lng, current_location_name,
  estimated_delivery
) VALUES (
  'SSS-2024-DEMO1',
  'Harold Swift', 'harold@example.com', 'US',
  'Emma Richardson', 'emma@example.com', 'GB',
  'express', 2.5, 'Books and documents', 85.00,
  'in_transit', 51.5074, -0.1278, 'London, United Kingdom',
  CURRENT_DATE + INTERVAL '2 days'
);

-- ============================================================
-- SAMPLE CHECKPOINTS for demo package
-- ============================================================
INSERT INTO tracking_checkpoints (package_id, status, location_name, description, lat, lng, occurred_at)
SELECT
  p.id,
  c.status, c.location_name, c.description, c.lat, c.lng, c.occurred_at
FROM packages p
CROSS JOIN (VALUES
  ('pending',          'New York, USA',             'Package picked up from sender',                       40.7128,  -74.0060, NOW() - INTERVAL '6 days'),
  ('picked_up',        'JFK International Airport', 'Package checked in at departure facility',            40.6413,  -73.7781, NOW() - INTERVAL '5 days 18 hours'),
  ('in_transit',       'JFK International Airport', 'Departed on flight AA0714 to London Heathrow',        40.6413,  -73.7781, NOW() - INTERVAL '5 days 10 hours'),
  ('in_transit',       'London Heathrow Airport',   'Arrived at destination country — customs pending',   51.4775,  -0.4614,  NOW() - INTERVAL '4 days 14 hours'),
  ('customs',          'London Heathrow Airport',   'Package cleared customs — released for delivery',    51.4775,  -0.4614,  NOW() - INTERVAL '3 days 8 hours'),
  ('in_transit',       'London, United Kingdom',    'In transit to local delivery hub',                   51.5074,  -0.1278,  NOW() - INTERVAL '1 day')
) AS c(status, location_name, description, lat, lng, occurred_at)
WHERE p.tracking_number = 'SSS-2024-DEMO1';
