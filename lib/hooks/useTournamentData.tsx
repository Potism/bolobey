"use client";

import { useOptimizedFetch } from "./useOptimizedFetch";
import { supabase } from "@/lib/supabase";

interface Tournament {
  id: string;
  name: string;
  description?: string;
  status: string;
  created_at: string;
  updated_at: string;
  tournament_type_id?: string;
  [key: string]: unknown;
}

interface Participant {
  id: string;
  user_id: string;
  tournament_id: string;
  total_points: number;
  created_at: string;
  users?: {
    display_name: string;
    avatar_url?: string;
  };
}

interface Match {
  id: string;
  tournament_id: string;
  player1_id: string;
  player2_id: string;
  winner_id?: string;
  status: string;
  round: number;
  match_number: number;
  created_at: string;
  [key: string]: unknown;
}

interface BettingMatch {
  id: string;
  tournament_id: string;
  player1_id: string;
  player2_id: string;
  status: string;
  betting_start_time: string;
  betting_end_time: string;
  created_at: string;
  [key: string]: unknown;
}

interface TournamentData {
  tournament: Tournament;
  participants: Participant[];
  matches: Match[];
  betting_matches: BettingMatch[];
}

export function useTournamentData(tournamentId: string) {
  return useOptimizedFetch<TournamentData>({
    key: `tournament-${tournamentId}`,
    fetcher: async () => {
      // Use Promise.all for parallel requests
      const [
        tournamentResult,
        participantsResult,
        matchesResult,
        bettingMatchesResult,
      ] = await Promise.all([
        supabase
          .from("tournaments")
          .select("*")
          .eq("id", tournamentId)
          .single(),

        supabase
          .from("tournament_participants")
          .select(
            `
            *,
            users:user_id(display_name, avatar_url)
          `
          )
          .eq("tournament_id", tournamentId),

        supabase
          .from("matches")
          .select("*")
          .eq("tournament_id", tournamentId)
          .order("round", { ascending: true })
          .order("match_number", { ascending: true }),

        supabase
          .from("betting_matches")
          .select("*")
          .eq("tournament_id", tournamentId)
          .order("created_at", { ascending: false }),
      ]);

      // Handle errors gracefully
      if (tournamentResult.error) {
        throw new Error(
          `Failed to fetch tournament: ${tournamentResult.error.message}`
        );
      }

      if (participantsResult.error) {
        console.warn("Failed to fetch participants:", participantsResult.error);
      }

      if (matchesResult.error) {
        console.warn("Failed to fetch matches:", matchesResult.error);
      }

      if (bettingMatchesResult.error) {
        console.warn(
          "Failed to fetch betting matches:",
          bettingMatchesResult.error
        );
      }

      return {
        tournament: tournamentResult.data,
        participants: participantsResult.data || [],
        matches: matchesResult.data || [],
        betting_matches: bettingMatchesResult.data || [],
      };
    },
    staleTime: 30 * 1000, // 30 seconds
    retryOptions: { maxRetries: 3, delay: 1000, backoff: true },
    onError: (error) => {
      console.error("Tournament data fetch failed:", error);
    },
  });
}
