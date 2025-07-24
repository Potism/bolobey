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
  format TEXT DEFAULT 'single_elimination' CHECK (format IN ('single_elimination', 'double_elimination')),
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
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tournament_id, user_id)
);

-- Matches table
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  round INTEGER NOT NULL CHECK (round > 0),
  match_number INTEGER NOT NULL CHECK (match_number > 0),
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

-- Player statistics view
CREATE VIEW player_stats AS
SELECT 
  u.id,
  u.display_name,
  COUNT(DISTINCT tp.tournament_id) as tournaments_played,
  COUNT(DISTINCT CASE WHEN t.winner_id = u.id THEN t.id END) as tournaments_won,
  COUNT(CASE WHEN m.winner_id = u.id THEN 1 END) as matches_won,
  COUNT(CASE WHEN (m.player1_id = u.id OR m.player2_id = u.id) AND m.status = 'completed' THEN 1 END) as total_matches,
  CASE 
    WHEN COUNT(CASE WHEN (m.player1_id = u.id OR m.player2_id = u.id) AND m.status = 'completed' THEN 1 END) > 0 
    THEN ROUND(
      COUNT(CASE WHEN m.winner_id = u.id THEN 1 END)::DECIMAL / 
      COUNT(CASE WHEN (m.player1_id = u.id OR m.player2_id = u.id) AND m.status = 'completed' THEN 1 END) * 100, 
      2
    )
    ELSE 0 
  END as win_percentage
FROM users u
LEFT JOIN tournament_participants tp ON u.id = tp.user_id
LEFT JOIN tournaments t ON tp.tournament_id = t.id
LEFT JOIN matches m ON (m.player1_id = u.id OR m.player2_id = u.id) AND m.status = 'completed'
WHERE u.role = 'player'
GROUP BY u.id, u.display_name
ORDER BY tournaments_won DESC, win_percentage DESC;

-- Indexes for better performance
CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_tournaments_created_by ON tournaments(created_by);
CREATE INDEX idx_tournament_participants_tournament_id ON tournament_participants(tournament_id);
CREATE INDEX idx_tournament_participants_user_id ON tournament_participants(user_id);
CREATE INDEX idx_matches_tournament_id ON matches(tournament_id);
CREATE INDEX idx_matches_player1_id ON matches(player1_id);
CREATE INDEX idx_matches_player2_id ON matches(player2_id);
CREATE INDEX idx_matches_status ON matches(status);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tournaments_updated_at BEFORE UPDATE ON tournaments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

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

-- Matches policies
CREATE POLICY "Anyone can view matches" ON matches FOR SELECT USING (true);
CREATE POLICY "Tournament creators can manage matches" ON matches FOR ALL 
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