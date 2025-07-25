-- Check and fix database schema for Beyblade X tournaments

-- Check if round_robin_matches table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'round_robin_matches') THEN
        -- Create round_robin_matches table
        CREATE TABLE round_robin_matches (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
            player1_id UUID REFERENCES users(id),
            player2_id UUID REFERENCES users(id),
            winner_id UUID REFERENCES users(id),
            player1_score INTEGER DEFAULT 0,
            player2_score INTEGER DEFAULT 0,
            status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
            scheduled_at TIMESTAMP WITH TIME ZONE,
            completed_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Create index
        CREATE INDEX idx_round_robin_matches_tournament_id ON round_robin_matches(tournament_id);
        CREATE INDEX idx_round_robin_matches_status ON round_robin_matches(status);
        
        RAISE NOTICE 'Created round_robin_matches table';
    ELSE
        RAISE NOTICE 'round_robin_matches table already exists';
    END IF;
END $$;

-- Check if battles table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'battles') THEN
        -- Create battles table
        CREATE TABLE battles (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
            round_robin_match_id UUID REFERENCES round_robin_matches(id) ON DELETE CASCADE,
            battle_number INTEGER NOT NULL,
            winner_id UUID REFERENCES users(id),
            finish_type TEXT CHECK (finish_type IN ('burst', 'ringout', 'spinout')),
            player1_points INTEGER DEFAULT 0,
            player2_points INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Create indexes
        CREATE INDEX idx_battles_match_id ON battles(match_id);
        CREATE INDEX idx_battles_round_robin_match_id ON battles(round_robin_match_id);
        
        RAISE NOTICE 'Created battles table';
    ELSE
        RAISE NOTICE 'battles table already exists';
    END IF;
END $$;

-- Check if tournament_phases table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tournament_phases') THEN
        -- Create tournament_phases table
        CREATE TABLE tournament_phases (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
            phase_type TEXT NOT NULL CHECK (phase_type IN ('round_robin', 'elimination')),
            phase_order INTEGER NOT NULL,
            status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
            started_at TIMESTAMP WITH TIME ZONE,
            completed_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Create index
        CREATE INDEX idx_tournament_phases_tournament_id ON tournament_phases(tournament_id);
        
        RAISE NOTICE 'Created tournament_phases table';
    ELSE
        RAISE NOTICE 'tournament_phases table already exists';
    END IF;
END $$;

-- Add current_phase column to tournaments if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'tournaments' AND column_name = 'current_phase') THEN
        ALTER TABLE tournaments ADD COLUMN current_phase TEXT DEFAULT 'registration' CHECK (current_phase IN ('registration', 'round_robin', 'elimination', 'completed'));
        RAISE NOTICE 'Added current_phase column to tournaments table';
    ELSE
        RAISE NOTICE 'current_phase column already exists in tournaments table';
    END IF;
END $$;

-- Update format constraint to include beyblade_x
DO $$
BEGIN
    -- Drop existing constraint if it exists
    ALTER TABLE tournaments DROP CONSTRAINT IF EXISTS tournaments_format_check;
    
    -- Add new constraint
    ALTER TABLE tournaments ADD CONSTRAINT tournaments_format_check CHECK (format IN ('single_elimination', 'double_elimination', 'round_robin', 'beyblade_x'));
    
    RAISE NOTICE 'Updated tournaments format constraint to include beyblade_x';
END $$; 