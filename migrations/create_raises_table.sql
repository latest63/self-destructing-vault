# Create raises table for ShipGuard
CREATE TABLE IF NOT EXISTS raises (
  id VARCHAR(255) PRIMARY KEY,
  company VARCHAR(255) NOT NULL,
  tagline TEXT,
  initials VARCHAR(10),
  tint VARCHAR(7),
  raised VARCHAR(50),
  progress INTEGER DEFAULT 0,
  closes_on DATE,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security
ALTER TABLE raises ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Anyone can view raises" ON raises FOR SELECT USING (true);

-- Insert seed data
INSERT INTO raises (id, company, tagline, initials, tint, raised, progress, closes_on, verified) VALUES
  ('amazon', 'Amazon', 'Logistics automation', 'AM', '#ff9900', '4.20M', 84, '2026-11-02', true),
  ('apple', 'Apple', 'Silicon design tooling', 'AP', '#a3a3a3', '6.85M', 96, '2026-10-18', true),
  ('tesla', 'Tesla', 'Charging infrastructure', 'TE', '#e82127', '3.10M', 71, '2026-12-05', false),
  ('google', 'Google', 'On-device inference', 'GO', '#4285f4', '5.40M', 89, '2026-11-21', true),
  ('nvidia', 'NVIDIA', 'CUDA developer cloud', 'NV', '#76b900', '7.60M', 93, '2026-10-30', true),
  ('microsoft', 'Microsoft', 'Open source runtime', 'MS', '#00a4ef', '2.95M', 64, '2026-12-14', false),
  ('meta', 'Meta', 'Spatial compute SDK', 'ME', '#0866ff', '4.75M', 78, '2026-11-09', true),
  ('spacex', 'SpaceX', 'Ground station network', 'SX', '#005288', '8.20M', 91, '2026-10-25', true)
ON CONFLICT (id) DO NOTHING;
