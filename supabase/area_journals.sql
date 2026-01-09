-- Area Journals Migration
-- Run this SQL in your Supabase SQL Editor
-- Creates tables for Area Journal feature

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Area Journals table (one per area)
CREATE TABLE IF NOT EXISTS area_journals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('heating', 'cooling', 'stable')),
  demand TEXT,
  inventory_trend TEXT,
  price_flexibility TEXT,
  rent_1br_min NUMERIC(10, 2),
  rent_1br_max NUMERIC(10, 2),
  rent_2br_min NUMERIC(10, 2),
  rent_2br_max NUMERIC(10, 2),
  rent_3br_min NUMERIC(10, 2),
  rent_3br_max NUMERIC(10, 2),
  sale_min NUMERIC(10, 2),
  sale_max NUMERIC(10, 2),
  driving_factors JSONB DEFAULT '[]'::jsonb,
  risks JSONB DEFAULT '[]'::jsonb,
  outlook TEXT CHECK (outlook IN ('up', 'sideways', 'down')),
  what_would_change TEXT,
  methodology TEXT,
  takeaway TEXT,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Area Journal Updates table (historical entries)
CREATE TABLE IF NOT EXISTS area_journal_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  area_journal_id UUID NOT NULL REFERENCES area_journals(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('heating', 'cooling', 'stable')),
  demand TEXT,
  inventory_trend TEXT,
  price_flexibility TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Area Journal Contributions table (verified notes from contributors)
CREATE TABLE IF NOT EXISTS area_journal_contributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  area_slug TEXT NOT NULL,
  contributor_name TEXT NOT NULL,
  contributor_role TEXT NOT NULL,
  contributor_area TEXT NOT NULL,
  note TEXT NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS area_journals_city_idx ON area_journals(city);
CREATE INDEX IF NOT EXISTS area_journals_slug_idx ON area_journals(slug);
CREATE INDEX IF NOT EXISTS area_journals_status_idx ON area_journals(status);
CREATE INDEX IF NOT EXISTS area_journals_last_updated_idx ON area_journals(last_updated DESC);
CREATE INDEX IF NOT EXISTS area_journal_updates_area_id_idx ON area_journal_updates(area_journal_id);
CREATE INDEX IF NOT EXISTS area_journal_contributions_area_slug_idx ON area_journal_contributions(area_slug);
CREATE INDEX IF NOT EXISTS area_journal_contributions_verified_idx ON area_journal_contributions(verified);

-- Enable Row Level Security (RLS)
ALTER TABLE area_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE area_journal_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE area_journal_contributions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: area_journals
-- Everyone can read area journals
CREATE POLICY "Anyone can view area journals"
  ON area_journals FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert/update (you can modify this based on your auth setup)
CREATE POLICY "Admins can manage area journals"
  ON area_journals FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin' -- Add role column to profiles if needed
    )
  );

-- RLS Policies: area_journal_updates
CREATE POLICY "Anyone can view area journal updates"
  ON area_journal_updates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can create area journal updates"
  ON area_journal_updates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies: area_journal_contributions
CREATE POLICY "Anyone can view verified contributions"
  ON area_journal_contributions FOR SELECT
  TO authenticated
  USING (verified = true);

CREATE POLICY "Verified users can create contributions"
  ON area_journal_contributions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can verify contributions"
  ON area_journal_contributions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_area_journal_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS area_journals_updated_at ON area_journals;
CREATE TRIGGER area_journals_updated_at
  BEFORE UPDATE ON area_journals
  FOR EACH ROW
  EXECUTE FUNCTION update_area_journal_updated_at();

-- Seed data: Beirut areas
INSERT INTO area_journals (
  slug, name, city, status, demand, inventory_trend, price_flexibility,
  rent_1br_min, rent_1br_max, rent_2br_min, rent_2br_max, rent_3br_min, rent_3br_max,
  sale_min, sale_max,
  driving_factors, risks, outlook, what_would_change, methodology, takeaway
) VALUES
(
  'achrafieh',
  'Achrafieh',
  'beirut',
  'heating',
  'High',
  'Decreasing',
  'Low - sellers holding firm',
  800, 1200, 1500, 2200, 2500, 3500,
  2500, 4000,
  '["Strong expat community driving demand", "Limited new construction", "Proximity to business districts", "High-end retail and dining options"]'::jsonb,
  '["Prices may be reaching peak levels", "Limited parking availability", "Older building stock requires renovation"]'::jsonb,
  'up',
  'Significant new supply coming online, economic downturn affecting expat community, or major infrastructure changes',
  'Based on analysis of 50+ recent transactions, 30+ active listings, and interviews with 5 local agents',
  'High demand from expats and investors, limited inventory driving prices up'
),
(
  'downtown',
  'Downtown',
  'beirut',
  'stable',
  'Steady',
  'Stable',
  'Moderate',
  1000, 1500, 2000, 3000, 3500, 5000,
  3000, 5000,
  '["Premium location with historical significance", "Mixed-use development attracting businesses", "Central location for both work and leisure"]'::jsonb,
  '["High maintenance costs", "Traffic congestion", "Tourism-dependent economy"]'::jsonb,
  'sideways',
  'Major economic recovery, significant infrastructure improvements, or new landmark developments',
  'Based on analysis of 40+ recent transactions, 25+ active listings, and market trend analysis',
  'Premium location with steady demand, prices holding steady'
),
(
  'hamra',
  'Hamra',
  'beirut',
  'cooling',
  'Moderate',
  'Increasing',
  'High - more negotiation room',
  600, 900, 1200, 1800, 2000, 2800,
  2000, 3500,
  '["Student area with university proximity", "Vibrant nightlife and culture", "More affordable than central areas"]'::jsonb,
  '["Student population volatility", "Older building stock", "Parking challenges"]'::jsonb,
  'down',
  'University expansion, major redevelopment projects, or economic recovery increasing demand',
  'Based on analysis of 35+ recent transactions, 40+ active listings, and local market observations',
  'Student area seeing reduced demand, more negotiation room'
),
(
  'verdun',
  'Verdun',
  'beirut',
  'heating',
  'High',
  'Decreasing',
  'Low',
  900, 1300, 1600, 2400, 2800, 3800,
  2800, 4200,
  '["Family-friendly area gaining popularity", "Good schools and amenities", "Residential feel with city access"]'::jsonb,
  '["Rapid price increases may limit affordability", "Traffic during peak hours", "Limited new development"]'::jsonb,
  'up',
  'New school openings, major infrastructure improvements, or economic downturn',
  'Based on analysis of 45+ recent transactions, 28+ active listings, and family buyer trends',
  'Family-friendly area gaining popularity, prices rising'
),
(
  'ain-el-mreisse',
  'Ain El Mreisse',
  'beirut',
  'stable',
  'Steady',
  'Stable',
  'Moderate',
  700, 1100, 1400, 2000, 2400, 3200,
  2200, 3800,
  '["Coastal location with sea views", "Mixed residential and commercial", "Access to corniche"]'::jsonb,
  '["Coastal property maintenance costs", "Tourism seasonality", "Limited parking"]'::jsonb,
  'sideways',
  'Major waterfront development, tourism recovery, or infrastructure improvements',
  'Based on analysis of 30+ recent transactions, 22+ active listings, and coastal property trends',
  'Coastal area with consistent demand, stable pricing'
),
(
  'mar-mikhael',
  'Mar Mikhael',
  'beirut',
  'heating',
  'Very High',
  'Decreasing',
  'Very Low',
  850, 1250, 1500, 2300, 2600, 3600,
  2700, 4100,
  '["Trendy neighborhood attracting young professionals", "Art scene and nightlife", "Gentrification in progress"]'::jsonb,
  '["Rapid gentrification concerns", "Limited parking", "Rising prices may push out original residents"]'::jsonb,
  'up',
  'Market saturation, economic downturn, or major development projects',
  'Based on analysis of 55+ recent transactions, 20+ active listings, and demographic shifts',
  'Trendy neighborhood attracting young professionals, inventory tight'
),
(
  'saifi',
  'Saifi',
  'beirut',
  'stable',
  'Steady',
  'Stable',
  'Moderate',
  1200, 1800, 2200, 3500, 4000, 6000,
  3500, 5500,
  '["Luxury area with high-end properties", "Central location", "Premium amenities"]'::jsonb,
  '["Very high prices limit buyer pool", "Maintenance costs", "Economic sensitivity"]'::jsonb,
  'sideways',
  'Major luxury development, economic boom, or significant infrastructure changes',
  'Based on analysis of 25+ recent transactions, 15+ active listings, and luxury market trends',
  'Luxury area with steady high-end demand'
)
ON CONFLICT (slug) DO NOTHING;

-- Seed contributor notes
INSERT INTO area_journal_contributions (
  area_slug, contributor_name, contributor_role, contributor_area, note, verified
) VALUES
(
  'achrafieh',
  'Sarah Khoury',
  'Local Real Estate Agent',
  'Achrafieh',
  'Seeing increased interest from European expats, especially in renovated buildings. Sellers are very firm on pricing.',
  true
),
(
  'achrafieh',
  'Michael Fadel',
  'Property Investor',
  'Achrafieh',
  'Inventory is tight. Good properties sell within 2-3 weeks. Cash buyers have advantage.',
  true
),
(
  'achrafieh',
  'Layla Mansour',
  'Property Manager',
  'Achrafieh',
  'Rental market is strong. Tenants willing to pay premium for quality units with parking.',
  true
)
ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT SELECT ON area_journals TO authenticated;
GRANT SELECT ON area_journal_updates TO authenticated;
GRANT SELECT ON area_journal_contributions TO authenticated;





