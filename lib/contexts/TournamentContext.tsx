"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
} from "react";
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

// State interface
interface TournamentState {
  tournament: Tournament | null;
  matches: Match[];
  participants: Participant[];
  currentMatch: Match | null;
  spectatorCount: number;
  isLoading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  tabId: string | null;
  isConnected: boolean;
}

// Action types
type TournamentAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_TOURNAMENT"; payload: Tournament }
  | { type: "SET_MATCHES"; payload: Match[] }
  | { type: "SET_PARTICIPANTS"; payload: Participant[] }
  | { type: "SET_CURRENT_MATCH"; payload: Match | null }
  | { type: "SET_SPECTATOR_COUNT"; payload: number }
  | {
      type: "UPDATE_MATCH_SCORE";
      payload: { matchId: string; player1Score: number; player2Score: number };
    }
  | { type: "SET_LAST_UPDATE"; payload: Date }
  | { type: "SET_TAB_ID"; payload: string }
  | { type: "SET_CONNECTION_STATUS"; payload: boolean }
  | { type: "RESET_STATE" };

// Initial state
const initialState: TournamentState = {
  tournament: null,
  matches: [],
  participants: [],
  currentMatch: null,
  spectatorCount: 0,
  isLoading: true,
  error: null,
  lastUpdate: null,
  tabId: null,
  isConnected: false,
};

// Reducer
function tournamentReducer(
  state: TournamentState,
  action: TournamentAction
): TournamentState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };

    case "SET_ERROR":
      return { ...state, error: action.payload, isLoading: false };

    case "SET_TOURNAMENT":
      return { ...state, tournament: action.payload, error: null };

    case "SET_MATCHES":
      return { ...state, matches: action.payload, error: null };

    case "SET_PARTICIPANTS":
      return { ...state, participants: action.payload, error: null };

    case "SET_CURRENT_MATCH":
      return { ...state, currentMatch: action.payload, error: null };

    case "SET_SPECTATOR_COUNT":
      return { ...state, spectatorCount: action.payload, error: null };

    case "UPDATE_MATCH_SCORE":
      return {
        ...state,
        matches: state.matches.map((match) =>
          match.id === action.payload.matchId
            ? {
                ...match,
                player1_score: action.payload.player1Score,
                player2_score: action.payload.player2Score,
                status:
                  action.payload.player1Score >= 3 ||
                  action.payload.player2Score >= 3
                    ? "completed"
                    : "in_progress",
              }
            : match
        ),
        currentMatch:
          state.currentMatch?.id === action.payload.matchId
            ? {
                ...state.currentMatch,
                player1_score: action.payload.player1Score,
                player2_score: action.payload.player2Score,
                status:
                  action.payload.player1Score >= 3 ||
                  action.payload.player2Score >= 3
                    ? "completed"
                    : "in_progress",
              }
            : state.currentMatch,
        error: null,
      };

    case "SET_LAST_UPDATE":
      return { ...state, lastUpdate: action.payload };

    case "SET_TAB_ID":
      return { ...state, tabId: action.payload };

    case "SET_CONNECTION_STATUS":
      return { ...state, isConnected: action.payload };

    case "RESET_STATE":
      return initialState;

    default:
      return state;
  }
}

// Context
interface TournamentContextType {
  state: TournamentState;
  actions: {
    fetchTournament: (tournamentId: string) => Promise<void>;
    fetchMatches: (tournamentId: string) => Promise<void>;
    fetchParticipants: (tournamentId: string) => Promise<void>;
    fetchSpectatorCount: (tournamentId: string) => Promise<void>;
    updateMatchScore: (
      matchId: string,
      player1Score: number,
      player2Score: number
    ) => Promise<void>;
    setCurrentMatch: (match: Match | null) => void;
    resetState: () => void;
    setTabId: (tabId: string) => void;
    setConnectionStatus: (isConnected: boolean) => void;
  };
}

const TournamentContext = createContext<TournamentContextType | undefined>(
  undefined
);

// Provider component
interface TournamentProviderProps {
  children: React.ReactNode;
}

export function TournamentProvider({ children }: TournamentProviderProps) {
  const [state, dispatch] = useReducer(tournamentReducer, initialState);

  // Fetch tournament data
  const fetchTournament = useCallback(async (tournamentId: string) => {
    try {
      console.log("Fetching tournament:", tournamentId);
      dispatch({ type: "SET_LOADING", payload: true });

      const { data, error } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", tournamentId)
        .single();

      if (error) {
        console.error("Supabase error fetching tournament:", error);
        throw error;
      }

      console.log("Tournament data:", data);
      dispatch({ type: "SET_TOURNAMENT", payload: data });
      dispatch({ type: "SET_LAST_UPDATE", payload: new Date() });
    } catch (error) {
      console.error("Error fetching tournament:", error);
      dispatch({
        type: "SET_ERROR",
        payload:
          error instanceof Error ? error.message : "Failed to fetch tournament",
      });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, []);

  // Fetch matches with optimized joins
  const fetchMatches = useCallback(async (tournamentId: string) => {
    try {
      console.log("Fetching matches for tournament:", tournamentId);

      const { data: matchesData, error: matchesError } = await supabase
        .from("matches")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("created_at", { ascending: false });

      if (matchesError) {
        console.error("Supabase error fetching matches:", matchesError);
        throw matchesError;
      }

      console.log("Raw matches data:", matchesData);

      if (!matchesData || matchesData.length === 0) {
        console.log("No matches found");
        dispatch({ type: "SET_MATCHES", payload: [] });
        dispatch({ type: "SET_CURRENT_MATCH", payload: null });
        return;
      }

      // Get user data for all players
      const playerIds = new Set();
      matchesData.forEach((match) => {
        if (match.player1_id) playerIds.add(match.player1_id);
        if (match.player2_id) playerIds.add(match.player2_id);
      });

      const userIds = Array.from(playerIds);
      console.log("Player IDs to fetch:", userIds);

      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, display_name, avatar_url")
        .in("id", userIds);

      if (usersError) {
        console.error("Supabase error fetching users:", usersError);
        throw usersError;
      }

      console.log("Users data for matches:", usersData);

      // Create user lookup map
      const userMap = new Map(usersData?.map((user) => [user.id, user]) || []);

      // Enrich matches with user data
      const enrichedMatches = matchesData.map((match) => ({
        ...match,
        player1: match.player1_id ? userMap.get(match.player1_id) : undefined,
        player2: match.player2_id ? userMap.get(match.player2_id) : undefined,
      }));

      console.log("Enriched matches:", enrichedMatches);
      dispatch({ type: "SET_MATCHES", payload: enrichedMatches });

      // Set current match (most recent in_progress or first pending)
      const currentMatch =
        enrichedMatches.find((match) => match.status === "in_progress") ||
        enrichedMatches.find((match) => match.status === "pending") ||
        null;

      console.log("Current match:", currentMatch);
      dispatch({ type: "SET_CURRENT_MATCH", payload: currentMatch });
      dispatch({ type: "SET_LAST_UPDATE", payload: new Date() });
    } catch (error) {
      console.error("Error fetching matches:", error);
      dispatch({
        type: "SET_ERROR",
        payload:
          error instanceof Error ? error.message : "Failed to fetch matches",
      });
    }
  }, []);

  // Fetch participants
  const fetchParticipants = useCallback(async (tournamentId: string) => {
    try {
      console.log("Fetching participants for tournament:", tournamentId);

      // First, get all participants
      const { data: participantsData, error: participantsError } =
        await supabase
          .from("tournament_participants")
          .select("*")
          .eq("tournament_id", tournamentId)
          .order("seed", { ascending: true });

      if (participantsError) {
        console.error("Error fetching participants data:", participantsError);
        throw participantsError;
      }

      console.log("Raw participants data:", participantsData);

      if (!participantsData || participantsData.length === 0) {
        console.log("No participants found");
        dispatch({ type: "SET_PARTICIPANTS", payload: [] });
        dispatch({ type: "SET_LAST_UPDATE", payload: new Date() });
        return;
      }

      // Then, get user data for all participants
      const userIds = participantsData.map((p) => p.user_id);
      console.log("User IDs to fetch:", userIds);

      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, display_name, avatar_url")
        .in("id", userIds);

      if (usersError) {
        console.error("Error fetching users:", usersError);
        throw usersError;
      }

      console.log("Users data:", usersData);

      // Create a map for quick lookup
      const userMap = new Map();
      if (usersData) {
        usersData.forEach((user) => userMap.set(user.id, user));
      }

      // Combine the data
      const participantsWithUsers = participantsData.map((p) => {
        const user = userMap.get(p.user_id);
        console.log(`Mapping participant ${p.user_id}:`, user);
        return {
          id: p.id,
          user_id: p.user_id,
          tournament_id: p.tournament_id,
          seed: p.seed,
          joined_at: p.joined_at,
          user: {
            id: p.user_id,
            display_name: user?.display_name || "Unknown Player",
            avatar_url: user?.avatar_url,
          },
        };
      });

      console.log("Final participants with users:", participantsWithUsers);
      dispatch({ type: "SET_PARTICIPANTS", payload: participantsWithUsers });
      dispatch({ type: "SET_LAST_UPDATE", payload: new Date() });
    } catch (error) {
      console.error("Error fetching participants:", error);
      dispatch({
        type: "SET_ERROR",
        payload:
          error instanceof Error
            ? error.message
            : "Failed to fetch participants",
      });
    }
  }, []);

  // Fetch spectator count
  const fetchSpectatorCount = useCallback(async (tournamentId: string) => {
    try {
      console.log("Fetching spectator count for tournament:", tournamentId);

      // Try the new table structure first
      const { data: spectatorData, error: spectatorError } = await supabase
        .from("tournament_spectators")
        .select("active_spectators")
        .eq("tournament_id", tournamentId)
        .single();

      if (!spectatorError && spectatorData) {
        console.log(
          "Spectator count from new table:",
          spectatorData.active_spectators
        );
        dispatch({
          type: "SET_SPECTATOR_COUNT",
          payload: spectatorData.active_spectators || 0,
        });
        dispatch({ type: "SET_LAST_UPDATE", payload: new Date() });
        return;
      }

      // Fallback to count method
      const { count, error: countError } = await supabase
        .from("tournament_spectators")
        .select("*", { count: "exact", head: true })
        .eq("tournament_id", tournamentId);

      if (countError) {
        console.warn("Error fetching spectator count:", countError);
        // Don't throw error for spectator count as it's not critical
        dispatch({ type: "SET_SPECTATOR_COUNT", payload: 0 });
        return;
      }

      console.log("Spectator count from count method:", count);
      dispatch({ type: "SET_SPECTATOR_COUNT", payload: count || 0 });
      dispatch({ type: "SET_LAST_UPDATE", payload: new Date() });
    } catch (error) {
      console.error("Error fetching spectator count:", error);
      // Don't set error for spectator count as it's not critical
      dispatch({ type: "SET_SPECTATOR_COUNT", payload: 0 });
    }
  }, []);

  // Update match score
  const updateMatchScore = useCallback(
    async (matchId: string, player1Score: number, player2Score: number) => {
      try {
        // Immediately update the state optimistically for instant UI feedback
        dispatch({
          type: "UPDATE_MATCH_SCORE",
          payload: { matchId, player1Score, player2Score },
        });
        dispatch({ type: "SET_LAST_UPDATE", payload: new Date() });

        // Then update the database
        const { error } = await supabase
          .from("matches")
          .update({
            player1_score: Math.max(0, player1Score),
            player2_score: Math.max(0, player2Score),
            status:
              player1Score >= 3 || player2Score >= 3
                ? "completed"
                : "in_progress",
          })
          .eq("id", matchId);

        if (error) {
          // If database update fails, revert the optimistic update
          console.error(
            "Database update failed, reverting optimistic update:",
            error
          );
          // Fetch the actual data to revert
          await fetchMatches(matchId.split("_")[0]); // Extract tournament ID from match ID
          throw error;
        }

        console.log(
          `Score updated successfully: ${player1Score} - ${player2Score}`
        );
      } catch (error) {
        console.error("Error updating match score:", error);
        dispatch({
          type: "SET_ERROR",
          payload:
            error instanceof Error ? error.message : "Failed to update score",
        });
      }
    },
    []
  );

  // Set current match
  const setCurrentMatch = useCallback((match: Match | null) => {
    dispatch({ type: "SET_CURRENT_MATCH", payload: match });
  }, []);

  // Set tab ID
  const setTabId = useCallback((tabId: string) => {
    dispatch({ type: "SET_TAB_ID", payload: tabId });
  }, []);

  // Set connection status
  const setConnectionStatus = useCallback((isConnected: boolean) => {
    dispatch({ type: "SET_CONNECTION_STATUS", payload: isConnected });
  }, []);

  // Reset state
  const resetState = useCallback(() => {
    dispatch({ type: "RESET_STATE" });
  }, []);

  // Memoized actions
  const actions = useMemo(
    () => ({
      fetchTournament,
      fetchMatches,
      fetchParticipants,
      fetchSpectatorCount,
      updateMatchScore,
      setCurrentMatch,
      resetState,
      setTabId,
      setConnectionStatus,
    }),
    [
      fetchTournament,
      fetchMatches,
      fetchParticipants,
      fetchSpectatorCount,
      updateMatchScore,
      setCurrentMatch,
      resetState,
      setTabId,
      setConnectionStatus,
    ]
  );

  const value = useMemo(
    () => ({
      state,
      actions,
    }),
    [state, actions]
  );

  return (
    <TournamentContext.Provider value={value}>
      {children}
    </TournamentContext.Provider>
  );
}

// Hook to use the context
export function useTournament() {
  const context = useContext(TournamentContext);
  if (context === undefined) {
    throw new Error("useTournament must be used within a TournamentProvider");
  }
  return context;
}
