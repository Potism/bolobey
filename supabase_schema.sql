-- Bolobey Tournament Management System Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT DEFAULT 'player' CHECK (role IN ('admin', 'player')),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tournaments table
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  registration_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  max_participants INTEGER DEFAULT 16 CHECK (max_participants > 0),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'in_progress', 'completed')),
  format TEXT DEFAULT 'beyblade_x' CHECK (format IN ('single_elimination', 'double_elimination', 'beyblade_x')),
  current_phase TEXT DEFAULT 'registration' CHECK (current_phase IN ('registration', 'round_robin', 'elimination', 'completed')),
  winner_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tournament participants table
CREATE TABLE tournament_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  seed INTEGER,
  total_points INTEGER DEFAULT 0,
  burst_points INTEGER DEFAULT 0,
  ringout_points INTEGER DEFAULT 0,
  spinout_points INTEGER DEFAULT 0,
  matches_played INTEGER DEFAULT 0,
  matches_won INTEGER DEFAULT 0,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tournament_id, user_id)
);

-- Tournament phases table
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

-- Round Robin matches table
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

-- Matches table (for elimination phase)
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES tournament_phases(id) ON DELETE CASCADE,
  round INTEGER NOT NULL CHECK (round > 0),
  match_number INTEGER NOT NULL CHECK (match_number > 0),
  bracket_type TEXT DEFAULT 'upper' CHECK (bracket_type IN ('upper', 'lower', 'final')),
  player1_id UUID REFERENCES users(id),
  player2_id UUID REFERENCES users(id),
  winner_id UUID REFERENCES users(id),
  player1_score INTEGER DEFAULT 0 CHECK (player1_score >= 0),
  player2_score INTEGER DEFAULT 0 CHECK (player2_score >= 0),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Battles table (individual Beyblade battles within matches)
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

-- Player statistics view (enhanced for Beyblade X)
CREATE VIEW player_stats AS
SELECT 
  u.id,
  u.display_name,
  COUNT(DISTINCT tp.tournament_id) as tournaments_played,
  COUNT(DISTINCT CASE WHEN t.winner_id = u.id THEN t.id END) as tournaments_won,
  COUNT(CASE WHEN m.winner_id = u.id THEN 1 END) + 
  COUNT(CASE WHEN rrm.winner_id = u.id THEN 1 END) as matches_won,
  COUNT(CASE WHEN (m.player1_id = u.id OR m.player2_id = u.id) AND m.status = 'completed' THEN 1 END) +
  COUNT(CASE WHEN (rrm.player1_id = u.id OR rrm.player2_id = u.id) AND rrm.status = 'completed' THEN 1 END) as total_matches,
  COALESCE(SUM(tp.total_points), 0) as total_points,
  COALESCE(SUM(tp.burst_points), 0) as total_burst_points,
  COALESCE(SUM(tp.ringout_points), 0) as total_ringout_points,
  COALESCE(SUM(tp.spinout_points), 0) as total_spinout_points,
  CASE 
    WHEN (COUNT(CASE WHEN (m.player1_id = u.id OR m.player2_id = u.id) AND m.status = 'completed' THEN 1 END) +
          COUNT(CASE WHEN (rrm.player1_id = u.id OR rrm.player2_id = u.id) AND rrm.status = 'completed' THEN 1 END)) > 0 
    THEN ROUND(
      (COUNT(CASE WHEN m.winner_id = u.id THEN 1 END) + 
       COUNT(CASE WHEN rrm.winner_id = u.id THEN 1 END))::DECIMAL / 
      (COUNT(CASE WHEN (m.player1_id = u.id OR m.player2_id = u.id) AND m.status = 'completed' THEN 1 END) +
       COUNT(CASE WHEN (rrm.player1_id = u.id OR rrm.player2_id = u.id) AND rrm.status = 'completed' THEN 1 END)) * 100, 
      2
    )
    ELSE 0 
  END as win_percentage
FROM users u
LEFT JOIN tournament_participants tp ON u.id = tp.user_id
LEFT JOIN tournaments t ON tp.tournament_id = t.id
LEFT JOIN matches m ON (m.player1_id = u.id OR m.player2_id = u.id) AND m.status = 'completed'
LEFT JOIN round_robin_matches rrm ON (rrm.player1_id = u.id OR rrm.player2_id = u.id) AND rrm.status = 'completed'
WHERE u.role = 'player'
GROUP BY u.id, u.display_name
ORDER BY tournaments_won DESC, total_points DESC, win_percentage DESC;

-- Indexes for better performance
CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_tournaments_format ON tournaments(format);
CREATE INDEX idx_tournaments_current_phase ON tournaments(current_phase);
CREATE INDEX idx_tournaments_created_by ON tournaments(created_by);
CREATE INDEX idx_tournament_participants_tournament_id ON tournament_participants(tournament_id);
CREATE INDEX idx_tournament_participants_user_id ON tournament_participants(user_id);
CREATE INDEX idx_tournament_participants_total_points ON tournament_participants(total_points DESC);
CREATE INDEX idx_tournament_phases_tournament_id ON tournament_phases(tournament_id);
CREATE INDEX idx_round_robin_matches_tournament_id ON round_robin_matches(tournament_id);
CREATE INDEX idx_round_robin_matches_status ON round_robin_matches(status);
CREATE INDEX idx_matches_tournament_id ON matches(tournament_id);
CREATE INDEX idx_matches_phase_id ON matches(phase_id);
CREATE INDEX idx_matches_bracket_type ON matches(bracket_type);
CREATE INDEX idx_matches_player1_id ON matches(player1_id);
CREATE INDEX idx_matches_player2_id ON matches(player2_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_battles_match_id ON battles(match_id);
CREATE INDEX idx_battles_round_robin_match_id ON battles(round_robin_match_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to calculate battle points
CREATE OR REPLACE FUNCTION calculate_battle_points(finish_type TEXT)
RETURNS INTEGER AS $$
BEGIN
  CASE finish_type
    WHEN 'burst' THEN RETURN 3;
    WHEN 'ringout' THEN RETURN 2;
    WHEN 'spinout' THEN RETURN 1;
    ELSE RETURN 0;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to update participant points when battle is added
CREATE OR REPLACE FUNCTION update_participant_points()
RETURNS TRIGGER AS $$
DECLARE
  match_record RECORD;
  round_robin_record RECORD;
  winner_points INTEGER;
  loser_points INTEGER;
BEGIN
  -- Get the finish type points
  winner_points := calculate_battle_points(NEW.finish_type);
  loser_points := 0;
  
  -- Update participant points based on match type
  IF NEW.match_id IS NOT NULL THEN
    -- Elimination match
    SELECT player1_id, player2_id, tournament_id INTO match_record 
    FROM matches WHERE id = NEW.match_id;
    
    IF match_record.player1_id = NEW.winner_id THEN
      UPDATE tournament_participants 
      SET total_points = total_points + winner_points,
          burst_points = burst_points + CASE WHEN NEW.finish_type = 'burst' THEN winner_points ELSE 0 END,
          ringout_points = ringout_points + CASE WHEN NEW.finish_type = 'ringout' THEN winner_points ELSE 0 END,
          spinout_points = spinout_points + CASE WHEN NEW.finish_type = 'spinout' THEN winner_points ELSE 0 END
      WHERE tournament_id = match_record.tournament_id AND user_id = NEW.winner_id;
      
      UPDATE tournament_participants 
      SET total_points = total_points + loser_points
      WHERE tournament_id = match_record.tournament_id AND user_id = match_record.player2_id;
    ELSE
      UPDATE tournament_participants 
      SET total_points = total_points + winner_points,
          burst_points = burst_points + CASE WHEN NEW.finish_type = 'burst' THEN winner_points ELSE 0 END,
          ringout_points = ringout_points + CASE WHEN NEW.finish_type = 'ringout' THEN winner_points ELSE 0 END,
          spinout_points = spinout_points + CASE WHEN NEW.finish_type = 'spinout' THEN winner_points ELSE 0 END
      WHERE tournament_id = match_record.tournament_id AND user_id = NEW.winner_id;
      
      UPDATE tournament_participants 
      SET total_points = total_points + loser_points
      WHERE tournament_id = match_record.tournament_id AND user_id = match_record.player1_id;
    END IF;
  ELSIF NEW.round_robin_match_id IS NOT NULL THEN
    -- Round robin match
    SELECT player1_id, player2_id, tournament_id INTO round_robin_record 
    FROM round_robin_matches WHERE id = NEW.round_robin_match_id;
    
    IF round_robin_record.player1_id = NEW.winner_id THEN
      UPDATE tournament_participants 
      SET total_points = total_points + winner_points,
          burst_points = burst_points + CASE WHEN NEW.finish_type = 'burst' THEN winner_points ELSE 0 END,
          ringout_points = ringout_points + CASE WHEN NEW.finish_type = 'ringout' THEN winner_points ELSE 0 END,
          spinout_points = spinout_points + CASE WHEN NEW.finish_type = 'spinout' THEN winner_points ELSE 0 END
      WHERE tournament_id = round_robin_record.tournament_id AND user_id = NEW.winner_id;
      
      UPDATE tournament_participants 
      SET total_points = total_points + loser_points
      WHERE tournament_id = round_robin_record.tournament_id AND user_id = round_robin_record.player2_id;
    ELSE
      UPDATE tournament_participants 
      SET total_points = total_points + winner_points,
          burst_points = burst_points + CASE WHEN NEW.finish_type = 'burst' THEN winner_points ELSE 0 END,
          ringout_points = ringout_points + CASE WHEN NEW.finish_type = 'ringout' THEN winner_points ELSE 0 END,
          spinout_points = spinout_points + CASE WHEN NEW.finish_type = 'spinout' THEN winner_points ELSE 0 END
      WHERE tournament_id = round_robin_record.tournament_id AND user_id = NEW.winner_id;
      
      UPDATE tournament_participants 
      SET total_points = total_points + loser_points
      WHERE tournament_id = round_robin_record.tournament_id AND user_id = round_robin_record.player1_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tournaments_updated_at BEFORE UPDATE ON tournaments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for battle points update
CREATE TRIGGER update_participant_points_trigger
  AFTER INSERT ON battles
  FOR EACH ROW EXECUTE FUNCTION update_participant_points();

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_robin_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE battles ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view all profiles" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Tournaments policies
CREATE POLICY "Anyone can view tournaments" ON tournaments FOR SELECT USING (true);
CREATE POLICY "Admins can create tournaments" ON tournaments FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Creators can update their tournaments" ON tournaments FOR UPDATE 
  USING (created_by = auth.uid());

-- Tournament participants policies
CREATE POLICY "Anyone can view participants" ON tournament_participants FOR SELECT USING (true);
CREATE POLICY "Users can join tournaments" ON tournament_participants FOR INSERT 
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can leave tournaments" ON tournament_participants FOR DELETE 
  USING (user_id = auth.uid());

-- Tournament phases policies
CREATE POLICY "Anyone can view phases" ON tournament_phases FOR SELECT USING (true);
CREATE POLICY "Tournament creators can manage phases" ON tournament_phases FOR ALL 
  USING (EXISTS (SELECT 1 FROM tournaments WHERE id = tournament_id AND created_by = auth.uid()));

-- Round robin matches policies
CREATE POLICY "Anyone can view round robin matches" ON round_robin_matches FOR SELECT USING (true);
CREATE POLICY "Tournament creators can manage round robin matches" ON round_robin_matches FOR ALL 
  USING (EXISTS (SELECT 1 FROM tournaments WHERE id = tournament_id AND created_by = auth.uid()));

-- Matches policies
CREATE POLICY "Anyone can view matches" ON matches FOR SELECT USING (true);
CREATE POLICY "Tournament creators can manage matches" ON matches FOR ALL 
  USING (EXISTS (SELECT 1 FROM tournaments WHERE id = tournament_id AND created_by = auth.uid()));

-- Battles policies
CREATE POLICY "Anyone can view battles" ON battles FOR SELECT USING (true);
CREATE POLICY "Tournament creators can manage battles" ON battles FOR ALL 
  USING (EXISTS (SELECT 1 FROM tournaments WHERE id = tournament_id AND created_by = auth.uid()));

-- Function to create user profile when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to prevent users from joining tournaments after deadline
CREATE OR REPLACE FUNCTION check_registration_deadline()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM tournaments 
    WHERE id = NEW.tournament_id 
    AND (registration_deadline < NOW() OR status != 'open')
  ) THEN
    RAISE EXCEPTION 'Registration deadline has passed or tournament is not open';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_registration_deadline_trigger
  BEFORE INSERT ON tournament_participants
  FOR EACH ROW EXECUTE FUNCTION check_registration_deadline();

-- Function to check max participants
CREATE OR REPLACE FUNCTION check_max_participants()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM tournament_participants WHERE tournament_id = NEW.tournament_id) >= 
     (SELECT max_participants FROM tournaments WHERE id = NEW.tournament_id) THEN
    RAISE EXCEPTION 'Tournament is full';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_max_participants_trigger
  BEFORE INSERT ON tournament_participants
  FOR EACH ROW EXECUTE FUNCTION check_max_participants(); 

## 🏆 **Beyblade X Tournament System - Phase 1 Complete!**

### ✅ **What We've Built**

#### **1. Enhanced Database Schema**
- **Tournament Phases**: Support for Round Robin → Elimination progression
- **Round Robin Matches**: All vs all competition phase
- **Battles Table**: Individual Beyblade battles with point tracking
- **Point System**: Burst (3pts), Ring-Out (2pts), Spin-Out (1pt)
- **Enhanced Player Stats**: Track total points, burst points, ringout points, spinout points

#### **2. Updated TypeScript Types**
- **New Interfaces**: `TournamentPhase`, `RoundRobinMatch`, `Battle`, `BattleResult`
- **Enhanced Types**: Support for Beyblade X mechanics
- **Bracket Types**: Support for both Round Robin and Elimination phases

#### **3. Bracket Generation Logic**
- **Round Robin Generation**: All possible pairings algorithm
- **Standings Calculation**: Point-based ranking system
- **Elimination Bracket**: Single/double elimination support
- **Battle Point Calculation**: Beyblade X scoring system

### 🚀 **Next Steps to Complete the System**

#### **Phase 2: Database Update**
You need to run this SQL in your Supabase dashboard to update the schema:

## ✅ **Simplified SQL - Run This Version**

```sql
-- Add new columns to tournaments table
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS current_phase TEXT DEFAULT 'registration' CHECK (current_phase IN ('registration', 'round_robin', 'elimination', 'completed'));

-- Add new columns to tournament_participants table
ALTER TABLE tournament_participants 
ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS burst_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ringout_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS spinout_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS matches_played INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS matches_won INTEGER DEFAULT 0;

-- Add bracket_type to matches table
ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS bracket_type TEXT DEFAULT 'upper' CHECK (bracket_type IN ('upper', 'lower', 'final'));

-- Create tournament_phases table
CREATE TABLE IF NOT EXISTS tournament_phases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  phase_type TEXT NOT NULL CHECK (phase_type IN ('round_robin', 'elimination')),
  phase_order INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create round_robin_matches table
CREATE TABLE IF NOT EXISTS round_robin_matches (
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

-- Create battles table
CREATE TABLE IF NOT EXISTS battles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID,
  round_robin_match_id UUID,
  battle_number INTEGER NOT NULL,
  winner_id UUID REFERENCES users(id),
  finish_type TEXT CHECK (finish_type IN ('burst', 'ringout', 'spinout')),
  player1_points INTEGER DEFAULT 0,
  player2_points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add phase_id to matches table
ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS phase_id UUID REFERENCES tournament_phases(id) ON DELETE CASCADE;

-- Create basic indexes (only for existing columns)
CREATE INDEX IF NOT EXISTS idx_tournaments_format ON tournaments(format);
CREATE INDEX IF NOT EXISTS idx_tournaments_current_phase ON tournaments(current_phase);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_total_points ON tournament_participants(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_tournament_phases_tournament_id ON tournament_phases(tournament_id);
CREATE INDEX IF NOT EXISTS idx_round_robin_matches_tournament_id ON round_robin_matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_round_robin_matches_status ON round_robin_matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_phase_id ON matches(phase_id);
CREATE INDEX IF NOT EXISTS idx_matches_bracket_type ON matches(bracket_type);

-- Enable RLS on new tables
ALTER TABLE tournament_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_robin_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE battles ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Anyone can view phases" ON tournament_phases FOR SELECT USING (true);
CREATE POLICY "Tournament creators can manage phases" ON tournament_phases FOR ALL 
  USING (EXISTS (SELECT 1 FROM tournaments WHERE id = tournament_id AND created_by = auth.uid()));

CREATE POLICY "Anyone can view round robin matches" ON round_robin_matches FOR SELECT USING (true);
CREATE POLICY "Tournament creators can manage round robin matches" ON round_robin_matches FOR ALL 
  USING (EXISTS (SELECT 1 FROM tournaments WHERE id = tournament_id AND created_by = auth.uid()));

CREATE POLICY "Anyone can view battles" ON battles FOR SELECT USING (true);
CREATE POLICY "Tournament creators can manage battles" ON battles FOR ALL 
  USING (EXISTS (SELECT 1 FROM tournaments WHERE id = tournament_id AND created_by = auth.uid()));
```