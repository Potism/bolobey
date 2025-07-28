"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Users, Target, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Tournament {
  id: string;
  name: string;
  status: string;
  youtube_video_id?: string;
  stream_url?: string;
}

interface RawMatch {
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

interface Match extends RawMatch {
  player1_name: string;
  player2_name: string;
}

export default function StreamingOverlayPage() {
  const params = useParams();
  const tournamentId = params.tournamentId as string;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [spectatorCount, setSpectatorCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Memoized query selector for consistent joins
  const matchQuerySelector = useMemo(
    () => `
    *,
    player1:users!matches_player1_id_fkey(id, display_name, avatar_url),
    player2:users!matches_player2_id_fkey(id, display_name, avatar_url)
  `,
    []
  );

  // Optimized data transformation function
  const transformMatchData = useCallback(
    (data: RawMatch | null): Match | null => {
      if (!data) return null;

      return {
        ...data,
        player1_name: data.player1?.display_name || "Unknown Player",
        player2_name: data.player2?.display_name || "Unknown Player",
      };
    },
    []
  );

  // Fetch tournament data
  useEffect(() => {
    const fetchTournament = async () => {
      try {
        const { data, error } = await supabase
          .from("tournaments")
          .select("*")
          .eq("id", tournamentId)
          .single();

        if (error) throw error;
        setTournament(data);
      } catch (error) {
        console.error("Error fetching tournament:", error);
      }
    };

    if (tournamentId) {
      fetchTournament();
    }
  }, [tournamentId]);

  // Optimized function to fetch current match
  const fetchCurrentMatch = useCallback(async () => {
    try {
      // Single optimized query with proper status priority
      const { data, error } = await supabase
        .from("matches")
        .select(matchQuerySelector)
        .eq("tournament_id", tournamentId)
        .in("status", ["in_progress", "active"])
        .order("status", { ascending: false }) // in_progress first
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code === "PGRST116") {
        // Fallback: get most recent match for debugging
        const { data: recentData } = await supabase
          .from("matches")
          .select(matchQuerySelector)
          .eq("tournament_id", tournamentId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (recentData) {
          console.log("Debug: Most recent match found:", recentData);
          const transformedMatch = transformMatchData(recentData);
          setCurrentMatch(transformedMatch);
          return;
        }
      }

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching current match:", error);
      }

      const transformedMatch = transformMatchData(data);
      setCurrentMatch(transformedMatch);

      if (transformedMatch) {
        console.log("Current match found:", transformedMatch);
      } else {
        console.log("No active match found for tournament:", tournamentId);
      }
    } catch (error) {
      console.error("Error fetching current match:", error);
    }
  }, [tournamentId, matchQuerySelector, transformMatchData]);

  // Optimized spectator count fetching
  const fetchSpectatorCount = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("tournament_spectators")
        .select("active_spectators")
        .eq("tournament_id", tournamentId)
        .single();

      if (!error && data) {
        setSpectatorCount(data.active_spectators || 0);
      }
    } catch (error) {
      console.error("Error fetching spectator count:", error);
    }
  }, [tournamentId]);

  // Consolidated real-time subscriptions
  useEffect(() => {
    if (!tournamentId) return;

    // Initial fetches
    fetchCurrentMatch();
    fetchSpectatorCount();
    setIsLoading(false);

    // Single channel for all real-time updates
    const channel = supabase
      .channel(`streaming-overlay-${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        (payload) => {
          console.log("Match change detected:", payload);
          // Debounced refresh to prevent rapid updates
          setTimeout(() => fetchCurrentMatch(), 100);
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
        () => {
          fetchSpectatorCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId, fetchCurrentMatch, fetchSpectatorCount]);

  // Memoized YouTube embed URL
  const embedUrl = useMemo(() => {
    if (tournament?.youtube_video_id) {
      return `https://www.youtube.com/embed/${tournament.youtube_video_id}?autoplay=1&rel=0&modestbranding=1&showinfo=0&controls=0&disablekb=1&fs=0&iv_load_policy=3&cc_load_policy=0`;
    }
    return null;
  }, [tournament?.youtube_video_id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-2xl">Loading Stream Overlay...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* YouTube Stream Background */}
      {embedUrl && (
        <div className="absolute inset-0 z-0">
          <iframe
            src={embedUrl}
            width="100%"
            height="100%"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Live Stream"
            className="w-full h-full"
          />
        </div>
      )}

      {/* Overlay Elements */}
      <div className="relative z-10 min-h-screen">
        {/* Top Bar - Tournament Info & Live Score */}
        <AnimatePresence>
          {tournament && (
            <motion.div
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              className="absolute top-0 left-0 right-0 bg-gradient-to-r from-black/90 via-black/80 to-black/90 backdrop-blur-sm border-b border-white/20"
            >
              <div className="flex items-center justify-between p-4">
                {/* Tournament Info */}
                <div className="flex items-center gap-4">
                  <Trophy className="h-6 w-6 text-yellow-400" />
                  <div>
                    <h1 className="text-xl font-bold text-white">
                      {tournament.name}
                    </h1>
                    <p className="text-sm text-gray-300">
                      {tournament.status === "in_progress"
                        ? "LIVE TOURNAMENT"
                        : "Tournament"}
                    </p>
                  </div>
                </div>

                {/* Live Score Widget */}
                {currentMatch && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="flex items-center gap-8"
                  >
                    {/* Player 1 */}
                    <div className="text-center">
                      <div className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 rounded-lg px-6 py-3 border border-blue-400/30">
                        <h3 className="text-white font-bold text-lg mb-1">
                          {currentMatch.player1_name}
                        </h3>
                        <motion.div
                          key={currentMatch.player1_score}
                          initial={{ scale: 1.3, color: "#fbbf24" }}
                          animate={{ scale: 1, color: "#ffffff" }}
                          className="text-4xl font-bold text-white"
                        >
                          {currentMatch.player1_score}
                        </motion.div>
                      </div>
                    </div>

                    {/* VS Divider */}
                    <div className="text-center">
                      <div className="text-white font-bold text-2xl mb-1">
                        VS
                      </div>
                      <div className="w-12 h-1 bg-white/50 rounded-full"></div>
                      <div className="mt-2">
                        <Badge variant="destructive" className="animate-pulse">
                          LIVE
                        </Badge>
                      </div>
                    </div>

                    {/* Player 2 */}
                    <div className="text-center">
                      <div className="bg-gradient-to-r from-red-500/20 to-red-600/20 rounded-lg px-6 py-3 border border-red-400/30">
                        <h3 className="text-white font-bold text-lg mb-1">
                          {currentMatch.player2_name}
                        </h3>
                        <motion.div
                          key={currentMatch.player2_score}
                          initial={{ scale: 1.3, color: "#fbbf24" }}
                          animate={{ scale: 1, color: "#ffffff" }}
                          className="text-4xl font-bold text-white"
                        >
                          {currentMatch.player2_score}
                        </motion.div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Spectator Count */}
                <div className="flex items-center gap-2 bg-black/50 px-3 py-2 rounded-lg">
                  <Users className="h-4 w-4 text-blue-400" />
                  <span className="font-bold text-white">{spectatorCount}</span>
                  <span className="text-sm text-gray-300">spectators</span>
                </div>
              </div>

              {/* Match Info Bar */}
              {currentMatch && (
                <div className="px-4 pb-3">
                  <div className="flex items-center justify-center gap-4 text-white">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-red-400" />
                      <span className="text-sm font-medium">
                        Round {currentMatch.round} • Match{" "}
                        {currentMatch.match_number}
                      </span>
                    </div>
                    <div className="w-1 h-4 bg-white/30 rounded-full"></div>
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-400" />
                      <span className="text-sm">First to 3 points wins</span>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* No Active Match Message */}
        {!currentMatch && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
            <div className="bg-black/50 backdrop-blur-sm rounded-lg px-6 py-4 border border-white/20">
              <Target className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-white text-lg font-medium">
                Waiting for Match
              </p>
              <p className="text-gray-400 text-sm">
                No active match in progress
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
