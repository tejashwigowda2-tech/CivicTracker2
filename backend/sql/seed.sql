-- CivicTrack Sample Seed Reference for PostgreSQL / Supabase
-- Note: Running the FastAPI backend automatically seeds full demonstration data
-- (including generated PNG sample photographs, password hashes, and timeline chains)
-- via `backend/app/seed.py` on initial startup.

-- Sample Pilot Departments (Independent Demonstration Queues)
INSERT INTO departments (department_name, department_code, description)
VALUES
  ('Road & Carriageway Maintenance Queue (Demo)', 'ROADS-DEMO', 'Simulated road and pothole queue (independent demo)'),
  ('Solid Waste & Street Sanitation Queue (Demo)', 'SANITATION-DEMO', 'Simulated solid waste queue (independent demo)'),
  ('Stormwater & Sewerage Maintenance Queue (Demo)', 'DRAINS-DEMO', 'Simulated drainage and sewerage queue (independent demo)'),
  ('Streetlight & Utility Corridor Queue (Demo)', 'UTILITY-DEMO', 'Simulated utility queue for multi-agency routing demos')
ON CONFLICT (department_code) DO NOTHING;

-- Sample Bengaluru Pilot Areas (Demonstration Boundaries)
INSERT INTO areas (area_name, ward_code, boundary_data)
VALUES
  ('Indiranagar Pilot Zone (Demo)', 'BLR-PILOT-IND', '{"center_lat": 12.9784, "center_lng": 77.6408, "radius_meters": 2400, "verified_zone_tier": "high_footfall_pilot", "is_sample_boundary": true}'::jsonb),
  ('Koramangala Pilot Zone (Demo)', 'BLR-PILOT-KRM', '{"center_lat": 12.9352, "center_lng": 77.6245, "radius_meters": 2400, "verified_zone_tier": "high_footfall_pilot", "is_sample_boundary": true}'::jsonb),
  ('Jayanagar Pilot Zone (Demo)', 'BLR-PILOT-JYN', '{"center_lat": 12.9299, "center_lng": 77.5824, "radius_meters": 2400, "verified_zone_tier": "urban_pilot", "is_sample_boundary": true}'::jsonb),
  ('Whitefield Pilot Zone (Demo)', 'BLR-PILOT-WTF', '{"center_lat": 12.9698, "center_lng": 77.7500, "radius_meters": 2800, "verified_zone_tier": "urban_pilot", "is_sample_boundary": true}'::jsonb)
ON CONFLICT (ward_code) DO NOTHING;
