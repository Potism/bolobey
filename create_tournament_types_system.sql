-- Tournament Types System for V3
-- This creates the foundation for different tournament types

-- Create tournament_types table
CREATE TABLE IF NOT EXISTS tournament_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN ('real', 'stream_only')),
    entry_fee_eur DECIMAL(10,2) DEFAULT 0,
    has_physical_prizes BOOLEAN DEFAULT false,
    has_stream_points_prizes BOOLEAN DEFAULT true,
    max_participants INTEGER DEFAULT 32,
    default_duration_hours INTEGER DEFAULT 24,
    features JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default tournament types
INSERT INTO tournament_types (name, description, category, entry_fee_eur, has_physical_prizes, has_stream_points_prizes, max_participants, default_duration_hours, features) VALUES
-- Real Tournaments (with entry fees)
('Championship Series', 'High-stakes competitive tournament with physical prizes', 'real', 25.00, true, true, 16, 336, '["Live Streaming", "Advanced Analytics", "Physical Trophies", "Professional Commentary", "Sponsorship Opportunities"]'),
('Community Event', 'Casual community tournament with merchandise prizes', 'real', 10.00, false, true, 32, 24, '["Community Chat", "Social Features", "Merchandise Prizes", "Local Leaderboards", "Community Badges"]'),

-- Stream-Only Tournaments (free entry)
('Stream Tournament', 'Entertainment-focused virtual event for streaming', 'stream_only', 0.00, false, true, 8, 3, '["Live Streaming", "Betting System", "Audience Interaction", "Chat Integration", "Stream Points Only"]'),
('Betting Event', 'Pure betting tournament with no entry fees', 'stream_only', 0.00, false, true, 16, 6, '["Advanced Betting", "Live Odds", "Betting Analytics", "Stream Points Rewards", "No Physical Prizes"]'),
('Community Fun', 'Free social tournament for community building', 'stream_only', 0.00, false, true, 64, 12, '["Social Features", "Community Chat", "Fun Challenges", "Stream Points", "Community Building"]');

-- Add tournament_type_id to tournaments table
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS tournament_type_id INTEGER REFERENCES tournament_types(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_tournaments_type_id ON tournaments(tournament_type_id);

-- Update existing tournaments to have a default type (Stream Tournament)
UPDATE tournaments SET tournament_type_id = (SELECT id FROM tournament_types WHERE name = 'Stream Tournament' LIMIT 1) WHERE tournament_type_id IS NULL;

-- Create function to get tournament type details
CREATE OR REPLACE FUNCTION get_tournament_type_details(tournament_uuid UUID)
RETURNS TABLE (
    type_name VARCHAR(100),
    category VARCHAR(50),
    entry_fee_eur DECIMAL(10,2),
    has_physical_prizes BOOLEAN,
    has_stream_points_prizes BOOLEAN,
    max_participants INTEGER,
    features JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tt.name,
        tt.category,
        tt.entry_fee_eur,
        tt.has_physical_prizes,
        tt.has_stream_points_prizes,
        tt.max_participants,
        tt.features
    FROM tournaments t
    JOIN tournament_types tt ON t.tournament_type_id = tt.id
    WHERE t.id = tournament_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for tournament type statistics
CREATE OR REPLACE VIEW tournament_type_stats AS
SELECT 
    tt.name as tournament_type,
    tt.category,
    COUNT(t.id) as total_tournaments,
    COUNT(CASE WHEN t.status = 'active' THEN 1 END) as active_tournaments,
    COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tournaments,
    AVG(tp.participant_count) as avg_participants,
    SUM(tt.entry_fee_eur) as total_entry_fees,
    tt.entry_fee_eur as entry_fee
FROM tournament_types tt
LEFT JOIN tournaments t ON tt.id = t.tournament_type_id
LEFT JOIN (
    SELECT tournament_id, COUNT(*) as participant_count 
    FROM tournament_participants 
    GROUP BY tournament_id
) tp ON t.id = tp.tournament_id
WHERE tt.is_active = true
GROUP BY tt.id, tt.name, tt.category, tt.entry_fee_eur
ORDER BY tt.category, tt.entry_fee_eur DESC;

-- Enable RLS
ALTER TABLE tournament_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Tournament types are viewable by everyone" ON tournament_types
    FOR SELECT USING (true);

CREATE POLICY "Only admins can modify tournament types" ON tournament_types
    FOR ALL USING (auth.role() = 'admin');

-- Grant permissions
GRANT SELECT ON tournament_types TO authenticated, anon;
GRANT ALL ON tournament_types TO admin;
GRANT SELECT ON tournament_type_stats TO authenticated, anon; 