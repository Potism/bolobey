"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabase";

// Types
export interface Tournament {
  id: string;
  name: string;
  status: string;
  youtube_video_id?: string;
  stream_url?: string;
  created_by: string;
  created_at: string;
}

export interface Match {
  id: string;
  tournament_id: string;
  phase_id: string;
  player1_id: string;
  player2_id: string;
  player1_score: number;
  player2_score: number;
  status: string;
  round: number;
  match_number: number;
  bracket_type: string;
  created_at: string;
  player1?: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
  player2?: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
}

export interface Participant {
  id: string;
  user_id: string;
  tournament_id: string;
  seed: number;
  joined_at: string;
  user: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
}

interface TournamentDataState {
  tournament: Tournament | null;
  matches: Match[];
  participants: Participant[];
  currentMatch: Match | null;
  spectatorCount: number;
  isLoading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  isConnected: boolean;
}

export function useTournamentData(tournamentId: string) {
  // Generate unique tab ID to prevent conflicts
  const tabId = useMemo(() => {
    return `tab_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
  }, []);

  const [state, setState] = useState<TournamentDataState>({
    tournament: null,
    matches: [],
    participants: [],
    currentMatch: null,
    spectatorCount: 0,
    isLoading: true,
    error: null,
    lastUpdate: null,
    isConnected: false,
  });

  // Refs for cleanup
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch tournament data
  const fetchTournament = useCallback(async () => {
    if (!tournamentId) return;

    try {
      console.log(`[${tabId}] Fetching tournament:`, tournamentId);
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const { data, error } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", tournamentId)
        .single();

      if (error) {
        console.error(`[${tabId}] Supabase error fetching tournament:`, error);
        throw error;
      }

      console.log(`[${tabId}] Tournament data:`, data);
      setState((prev) => ({
        ...prev,
        tournament: data,
        lastUpdate: new Date(),
        isLoading: false,
      }));
    } catch (error) {
      console.error(`[${tabId}] Error fetching tournament:`, error);
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error ? error.message : "Failed to fetch tournament",
        isLoading: false,
      }));
    }
  }, [tournamentId, tabId]);

  // Fetch matches with optimized joins
  const fetchMatches = useCallback(async () => {
    if (!tournamentId) return;

    try {
      console.log(`[${tabId}] Fetching matches for tournament:`, tournamentId);

      const { data: matchesData, error: matchesError } = await supabase
        .from("matches")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("created_at", { ascending: false });

      if (matchesError) {
        console.error(
          `[${tabId}] Supabase error fetching matches:`,
          matchesError
        );
        throw matchesError;
      }

      console.log(`[${tabId}] Raw matches data:`, matchesData);

      if (!matchesData || matchesData.length === 0) {
        console.log(`[${tabId}] No matches found`);
        setState((prev) => ({
          ...prev,
          matches: [],
          currentMatch: null,
        }));
        return;
      }

      // Get user data for all players
      const playerIds = new Set();
      matchesData.forEach((match) => {
        if (match.player1_id) playerIds.add(match.player1_id);
        if (match.player2_id) playerIds.add(match.player2_id);
      });

      const userIds = Array.from(playerIds);
      console.log(`[${tabId}] Player IDs to fetch:`, userIds);

      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, display_name, avatar_url")
        .in("id", userIds);

      if (usersError) {
        console.error(`[${tabId}] Supabase error fetching users:`, usersError);
        throw usersError;
      }

      console.log(`[${tabId}] Users data for matches:`, usersData);

      // Create user lookup map
      const userMap = new Map(usersData?.map((user) => [user.id, user]) || []);

      // Enrich matches with user data
      const enrichedMatches = matchesData.map((match) => ({
        ...match,
        player1: match.player1_id ? userMap.get(match.player1_id) : undefined,
        player2: match.player2_id ? userMap.get(match.player2_id) : undefined,
      }));

      console.log(`[${tabId}] Enriched matches:`, enrichedMatches);
      setState((prev) => ({ ...prev, matches: enrichedMatches }));

      // Set current match (most recent in_progress or first pending)
      const currentMatch =
        enrichedMatches.find((match) => match.status === "in_progress") ||
        enrichedMatches.find((match) => match.status === "pending") ||
        null;

      console.log(`[${tabId}] Current match:`, currentMatch);
      setState((prev) => ({ ...prev, currentMatch }));
    } catch (error) {
      console.error(`[${tabId}] Error fetching matches:`, error);
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error ? error.message : "Failed to fetch matches",
      }));
    }
  }, [tournamentId, tabId]);

  // Fetch participants
  const fetchParticipants = useCallback(async () => {
    if (!tournamentId) return;

    try {
      console.log(
        `[${tabId}] Fetching participants for tournament:`,
        tournamentId
      );

      const { data, error } = await supabase
        .from("tournament_participants")
        .select(
          `
          *,
          user:users(id, display_name, avatar_url)
        `
        )
        .eq("tournament_id", tournamentId)
        .order("joined_at", { ascending: true });

      if (error) {
        console.error(
          `[${tabId}] Supabase error fetching participants:`,
          error
        );
        throw error;
      }

      console.log(`[${tabId}] Participants data:`, data);
      setState((prev) => ({ ...prev, participants: data || [] }));
    } catch (error) {
      console.error(`[${tabId}] Error fetching participants:`, error);
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch participants",
      }));
    }
  }, [tournamentId, tabId]);

  // Fetch spectator count
  const fetchSpectatorCount = useCallback(async () => {
    if (!tournamentId) return;

    try {
      console.log(
        `[${tabId}] Fetching spectator count for tournament:`,
        tournamentId
      );

      const { count, error } = await supabase
        .from("tournament_spectators")
        .select("*", { count: "exact", head: true })
        .eq("tournament_id", tournamentId);

      if (error) {
        console.error(
          `[${tabId}] Supabase error fetching spectator count:`,
          error
        );
        throw error;
      }

      console.log(`[${tabId}] Spectator count:`, count);
      setState((prev) => ({ ...prev, spectatorCount: count || 0 }));
    } catch (error) {
      console.error(`[${tabId}] Error fetching spectator count:`, error);
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch spectator count",
      }));
    }
  }, [tournamentId, tabId]);

  // Update match score
  const updateMatchScore = useCallback(
    async (matchId: string, player1Score: number, player2Score: number) => {
      try {
        console.log(`[${tabId}] Updating match score:`, {
          matchId,
          player1Score,
          player2Score,
        });

        const { error } = await supabase
          .from("matches")
          .update({
            player1_score: player1Score,
            player2_score: player2Score,
          })
          .eq("id", matchId);

        if (error) {
          console.error(`[${tabId}] Error updating match score:`, error);
          throw error;
        }

        console.log(`[${tabId}] Score updated successfully:`, {
          player1Score,
          player2Score,
        });

        // Update local state immediately for instant feedback
        setState((prev) => ({
          ...prev,
          matches: prev.matches.map((match) =>
            match.id === matchId
              ? {
                  ...match,
                  player1_score: player1Score,
                  player2_score: player2Score,
                }
              : match
          ),
          currentMatch:
            prev.currentMatch?.id === matchId
              ? {
                  ...prev.currentMatch,
                  player1_score: player1Score,
                  player2_score: player2Score,
                }
              : prev.currentMatch,
          lastUpdate: new Date(),
        }));
      } catch (error) {
        console.error(`[${tabId}] Error updating match score:`, error);
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error
              ? error.message
              : "Failed to update match score",
        }));
      }
    },
    [tabId]
  );

  // Setup real-time connection
  const setupRealTimeConnection = useCallback(() => {
    if (!tournamentId) return;

    console.log(`[${tabId}] Setting up real-time connection...`);

    // Clean up existing connection
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }

    // Create new connection with unique channel name
    const channelName = `tournament_${tournamentId}_${tabId}`;
    channelRef.current = supabase.channel(channelName);

    // Subscribe to tournament updates
    channelRef.current
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tournaments",
          filter: `id=eq.${tournamentId}`,
        },
        (payload) => {
          console.log(`[${tabId}] Tournament update received:`, payload);
          fetchTournament();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        (payload) => {
          console.log(`[${tabId}] Match update received:`, payload);
          fetchMatches();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournament_spectators",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        (payload) => {
          console.log(`[${tabId}] Spectator update received:`, payload);
          fetchSpectatorCount();
        }
      )
      .subscribe((status) => {
        console.log(`[${tabId}] Real-time connection status:`, status);
        setState((prev) => ({ ...prev, isConnected: status === "SUBSCRIBED" }));
      });

    // Set up heartbeat to maintain connection
    heartbeatIntervalRef.current = setInterval(() => {
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "heartbeat",
          payload: { tabId, timestamp: Date.now() },
        });
      }
    }, 30000); // Every 30 seconds

    console.log(`[${tabId}] Real-time connection setup completed`);
  }, [tournamentId, tabId, fetchTournament, fetchMatches, fetchSpectatorCount]);

  // Cleanup function
  const cleanup = useCallback(() => {
    console.log(`[${tabId}] Cleaning up resources...`);

    // Clean up real-time connection
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }

    // Clean up heartbeat
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    // Clean up abort controller
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    console.log(`[${tabId}] Cleanup completed`);
  }, [tabId]);

  // Initial data loading
  useEffect(() => {
    if (!tournamentId) return;

    console.log(`[${tabId}] Loading initial data...`);

    const loadInitialData = async () => {
      try {
        await Promise.all([
          fetchTournament(),
          fetchMatches(),
          fetchParticipants(),
          fetchSpectatorCount(),
        ]);
        console.log(`[${tabId}] Initial data loaded successfully`);
      } catch (error) {
        console.error(`[${tabId}] Error loading initial data:`, error);
      }
    };

    loadInitialData();
  }, [
    tournamentId,
    tabId,
    fetchTournament,
    fetchMatches,
    fetchParticipants,
    fetchSpectatorCount,
  ]);

  // Set up real-time connection
  useEffect(() => {
    if (tournamentId && !state.isLoading) {
      setupRealTimeConnection();
    }

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [tournamentId, state.isLoading, setupRealTimeConnection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    ...state,
    actions: {
      fetchTournament,
      fetchMatches,
      fetchParticipants,
      fetchSpectatorCount,
      updateMatchScore,
    },
    tabId,
  };
}
