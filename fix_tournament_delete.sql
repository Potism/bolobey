-- Fix tournament delete functionality by adding missing RLS DELETE policy
-- Run this in your Supabase SQL editor

-- Add DELETE policy for tournaments (creators can delete their own tournaments)
CREATE POLICY "Enable delete for tournament creators" ON tournaments
  FOR DELETE USING (auth.uid() = created_by);

-- Also add DELETE policy for tournament participants (users can remove themselves)
CREATE POLICY "Enable delete for participants" ON tournament_participants
  FOR DELETE USING (auth.uid() = user_id);

-- Add DELETE policy for matches (tournament creators can delete matches)
CREATE POLICY "Enable delete for tournament creators" ON matches
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM tournaments 
      WHERE id = tournament_id AND created_by = auth.uid()
    )
  );

-- Add DELETE policy for round robin matches (tournament creators can delete matches)
CREATE POLICY "Enable delete for tournament creators" ON round_robin_matches
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM tournaments 
      WHERE id = tournament_id AND created_by = auth.uid()
    )
  );

-- Add DELETE policy for battles (tournament creators can delete battles)
CREATE POLICY "Enable delete for tournament creators" ON battles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      LEFT JOIN matches m ON m.id = battles.match_id
      LEFT JOIN round_robin_matches rrm ON rrm.id = battles.round_robin_match_id
      WHERE (m.tournament_id = t.id OR rrm.tournament_id = t.id) 
      AND t.created_by = auth.uid()
    )
  );

-- Add DELETE policy for tournament phases (tournament creators can delete phases)
CREATE POLICY "Enable delete for tournament creators" ON tournament_phases
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM tournaments 
      WHERE id = tournament_id AND created_by = auth.uid()
    )
  ); 