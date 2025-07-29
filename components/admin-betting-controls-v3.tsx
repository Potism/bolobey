"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Play,
  Square,
  Target,
  AlertCircle,
  CheckCircle,
  Settings,
  Users,
  Clock,
  Trophy,
  TrendingUp,
  Activity,
  BarChart3,
  RefreshCw,
  Eye,
  Zap,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/hooks/useAuth";
import { useOptimizedFetch } from "@/lib/hooks/useOptimizedFetch";

interface BettingMatchV3 {
  id: string;
  tournament_id: string;
  player1_id: string;
  player2_id: string;
  player1_name: string;
  player2_name: string;
  betting_start_time: string;
  betting_end_time: string;
  match_start_time: string;
  status: string;
  computed_status: string;
  winner_id: string | null;
  winner_name: string | null;
  total_bets: number;
  total_points_wagered: number;
  player1_bet_count: number;
  player1_total_points: number;
  player2_bet_count: number;
  player2_total_points: number;
  player1_odds: number;
  player2_odds: number;
  seconds_until_betting_ends: number;
  seconds_until_match_starts: number;
}

interface TournamentParticipant {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url?: string;
}

interface TournamentStats {
  tournament_id: string;
  tournament_name: string;
  total_matches: number;
  total_bets_placed: number;
  total_points_wagered: number;
  active_matches: number;
  completed_matches: number;
  total_winners: number;
  average_bets_per_match: number;
  average_points_per_match: number;
  most_active_players: Array<{
    display_name: string;
    bet_count: number;
    total_points_wagered: number;
  }>;
  recent_activity: Array<{
    created_at: string;
    bettor_name: string;
    points_wagered: number;
    player1_name: string;
    player2_name: string;
    bet_on_player_name: string;
  }>;
}

export function AdminBettingControlsV3({
  tournamentId,
}: {
  tournamentId: string;
}) {
  const { user } = useAuth();
  const [currentMatch, setCurrentMatch] = useState<BettingMatchV3 | null>(null);
  const [participants, setParticipants] = useState<TournamentParticipant[]>([]);
  const [tournamentStats, setTournamentStats] =
    useState<TournamentStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states for creating new match
  const [player1Id, setPlayer1Id] = useState<string>("");
  const [player2Id, setPlayer2Id] = useState<string>("");
  const [bettingDuration, setBettingDuration] = useState<string>("5"); // minutes
  const [streamUrl, setStreamUrl] = useState<string>(
    "rtmp://live-api-s.facebook.com/rtmp/"
  );
  const [streamKey, setStreamKey] = useState<string>("");

  // Check if user is admin
  const isAdmin = user?.role === "admin";

  // Optimized fetch for current betting match with V3 view
  const { data: currentMatchData, refetch: refetchMatch } = useOptimizedFetch({
    key: `admin-current-match-v3-${tournamentId}`,
    fetcher: async () => {
      const { data, error } = await supabase
        .from("betting_match_stats")
        .select("*")
        .eq("tournament_id", tournamentId)
        .in("status", ["pending", "betting_open", "betting_closed", "live"])
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching current match:", error);
        return null;
      }

      return data;
    },
    retryOptions: { maxRetries: 3, delay: 1000, backoff: true },
    staleTime: 5 * 1000, // 5 seconds for real-time updates
  });

  // Fetch tournament participants
  const fetchParticipants = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("tournament_participants")
        .select("*")
        .eq("tournament_id", tournamentId);

      if (error) {
        console.error("Error fetching participants:", error);
        return;
      }

      // Fetch user information for participants
      if (data && data.length > 0) {
        const userIds = data.map((p) => p.user_id);
        const { data: users, error: usersError } = await supabase
          .from("users")
          .select("id, display_name, avatar_url")
          .in("id", userIds);

        if (usersError) {
          console.warn("Error fetching users:", usersError);
        }

        // Create a map of user_id to user data
        const userMap = new Map();
        if (users) {
          users.forEach((user) => userMap.set(user.id, user));
        }

        // Map participants with user data
        const formattedParticipants = data.map((p) => {
          const user = userMap.get(p.user_id);
          return {
            id: p.id,
            user_id: p.user_id,
            display_name: user?.display_name || "Unknown Player",
            avatar_url: user?.avatar_url,
          };
        });

        setParticipants(formattedParticipants);
      } else {
        setParticipants([]);
      }
    } catch (error) {
      console.error("Error fetching participants:", error);
    }
  }, [tournamentId]);

  // Fetch tournament statistics
  const fetchTournamentStats = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc(
        "get_tournament_betting_stats_v3",
        {
          tournament_uuid: tournamentId,
        }
      );

      if (error) {
        console.error("Error fetching tournament stats:", error);
        return;
      }

      setTournamentStats(data);
    } catch (error) {
      console.error("Error fetching tournament stats:", error);
    }
  }, [tournamentId]);

  // Update current match state when data changes
  useEffect(() => {
    if (currentMatchData) {
      setCurrentMatch(currentMatchData);
    } else {
      setCurrentMatch(null);
    }
  }, [currentMatchData]);

  // Load data on mount
  useEffect(() => {
    fetchParticipants();
    fetchTournamentStats();
  }, [fetchParticipants, fetchTournamentStats]);

  // Create new betting match
  const createBettingMatch = useCallback(async () => {
    if (!player1Id || !player2Id || player1Id === player2Id) {
      setError("Please select two different players");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const now = new Date();
      const bettingStartTime = new Date(now.getTime() + 60000); // Start in 1 minute
      const bettingEndTime = new Date(
        bettingStartTime.getTime() + parseInt(bettingDuration) * 60000
      );
      const matchStartTime = new Date(bettingEndTime.getTime() + 30000); // Start match 30 seconds after betting closes

      // First, update the tournament with stream settings if provided
      if (streamKey) {
        const { error: tournamentError } = await supabase
          .from("tournaments")
          .update({
            stream_url: streamUrl || "rtmp://live-api-s.facebook.com/rtmp/",
            stream_key: streamKey,
          })
          .eq("id", tournamentId);

        if (tournamentError) {
          console.error(
            "Error updating tournament stream settings:",
            tournamentError
          );
        }
      }

      const { error } = await supabase.from("betting_matches").insert({
        tournament_id: tournamentId,
        player1_id: player1Id,
        player2_id: player2Id,
        betting_start_time: bettingStartTime.toISOString(),
        betting_end_time: bettingEndTime.toISOString(),
        match_start_time: matchStartTime.toISOString(),
        status: "pending",
        stream_url: streamUrl || null,
      });

      if (error) {
        setError(error.message);
        return;
      }

      setSuccess(
        streamKey
          ? "Betting match created successfully! Stream key saved to tournament."
          : "Betting match created successfully!"
      );
      setPlayer1Id("");
      setPlayer2Id("");
      setStreamUrl("rtmp://live-api-s.facebook.com/rtmp/");
      setStreamKey("");

      // Refresh data
      await refetchMatch();
      await fetchTournamentStats();
    } catch (error) {
      console.error("Error creating betting match:", error);
      setError("Failed to create betting match");
    } finally {
      setIsLoading(false);
    }
  }, [
    player1Id,
    player2Id,
    bettingDuration,
    streamUrl,
    streamKey,
    tournamentId,
    refetchMatch,
    fetchTournamentStats,
  ]);

  // Start betting
  const startBetting = useCallback(async () => {
    if (!currentMatch) return;

    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from("betting_matches")
        .update({ status: "betting_open" })
        .eq("id", currentMatch.id);

      if (error) {
        setError(error.message);
        return;
      }

      setSuccess("Betting started successfully!");
      await refetchMatch();
    } catch (error) {
      console.error("Error starting betting:", error);
      setError("Failed to start betting");
    } finally {
      setIsLoading(false);
    }
  }, [currentMatch, refetchMatch]);

  // Close betting
  const closeBetting = useCallback(async () => {
    if (!currentMatch) return;

    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from("betting_matches")
        .update({ status: "betting_closed" })
        .eq("id", currentMatch.id);

      if (error) {
        setError(error.message);
        return;
      }

      setSuccess("Betting closed successfully!");
      await refetchMatch();
    } catch (error) {
      console.error("Error closing betting:", error);
      setError("Failed to close betting");
    } finally {
      setIsLoading(false);
    }
  }, [currentMatch, refetchMatch]);

  // Start match
  const startMatch = useCallback(async () => {
    if (!currentMatch) return;

    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from("betting_matches")
        .update({ status: "live" })
        .eq("id", currentMatch.id);

      if (error) {
        setError(error.message);
        return;
      }

      setSuccess("Match started successfully!");
      await refetchMatch();
    } catch (error) {
      console.error("Error starting match:", error);
      setError("Failed to start match");
    } finally {
      setIsLoading(false);
    }
  }, [currentMatch, refetchMatch]);

  // Set winner
  const setWinner = useCallback(
    async (winnerId: string) => {
      if (!currentMatch) return;

      setIsLoading(true);
      setError(null);

      try {
        const { error } = await supabase
          .from("betting_matches")
          .update({
            status: "completed",
            winner_id: winnerId,
          })
          .eq("id", currentMatch.id);

        if (error) {
          setError(error.message);
          return;
        }

        setSuccess(
          "Winner set successfully! Payouts will be processed automatically."
        );
        await refetchMatch();
        await fetchTournamentStats();
      } catch (error) {
        console.error("Error setting winner:", error);
        setError("Failed to set winner");
      } finally {
        setIsLoading(false);
      }
    },
    [currentMatch, refetchMatch, fetchTournamentStats]
  );

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Format time display
  const formatTime = (seconds: number) => {
    if (seconds <= 0) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!isAdmin) {
    return (
      <Card className="bg-gradient-to-br from-red-900 to-red-800 border-red-700">
        <CardContent className="p-6">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-white text-lg font-bold mb-2">Access Denied</h3>
            <p className="text-red-200">
              You need admin privileges to access betting controls.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-600 to-blue-700 border-blue-500">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Target className="h-6 w-6 text-white" />
              <div>
                <h3 className="text-white font-bold text-lg">
                  LIVE BETTING ADMIN V3
                </h3>
                <p className="text-blue-100 text-sm">
                  Manage betting matches and monitor activity
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchMatch();
                fetchTournamentStats();
              }}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Success/Error Messages */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Alert className="border-green-500 bg-green-500/10">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-700 dark:text-green-300">
                {success}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Alert className="border-red-500 bg-red-500/10">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-red-700 dark:text-red-300">
                {error}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create New Match */}
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Create New Betting Match
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Player Selection */}
            <div className="space-y-2">
              <Label className="text-slate-300">Player 1</Label>
              <Select value={player1Id} onValueChange={setPlayer1Id}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                  <SelectValue placeholder="Select Player 1" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  {participants.map((participant) => (
                    <SelectItem
                      key={participant.user_id}
                      value={participant.user_id}
                      className="text-white"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {getInitials(participant.display_name)}
                          </AvatarFallback>
                        </Avatar>
                        {participant.display_name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Player 2</Label>
              <Select value={player2Id} onValueChange={setPlayer2Id}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                  <SelectValue placeholder="Select Player 2" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  {participants.map((participant) => (
                    <SelectItem
                      key={participant.user_id}
                      value={participant.user_id}
                      className="text-white"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {getInitials(participant.display_name)}
                          </AvatarFallback>
                        </Avatar>
                        {participant.display_name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">
                Betting Duration (minutes)
              </Label>
              <Select
                value={bettingDuration}
                onValueChange={setBettingDuration}
              >
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  <SelectItem value="3">3 minutes</SelectItem>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="10">10 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Stream URL</Label>
              <Input
                value={streamUrl}
                onChange={(e) => setStreamUrl(e.target.value)}
                placeholder="rtmp://..."
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Stream Key</Label>
              <Input
                value={streamKey}
                onChange={(e) => setStreamKey(e.target.value)}
                placeholder="Enter stream key..."
                className="bg-slate-800 border-slate-600 text-white"
                type="password"
              />
            </div>
          </div>

          <Button
            onClick={createBettingMatch}
            disabled={isLoading || !player1Id || !player2Id}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-3"
            size="lg"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Creating Match...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Play className="h-4 w-4" />
                Create Betting Match
              </div>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Current Match Management */}
      {currentMatch && (
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Current Match
              </div>
              <Badge variant="outline" className="text-white border-white/20">
                {currentMatch.computed_status.toUpperCase()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Match Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-blue-600 text-white">
                    {getInitials(currentMatch.player1_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-white font-medium">
                    {currentMatch.player1_name}
                  </p>
                  <p className="text-slate-400 text-sm">
                    {currentMatch.player1_bet_count} bets (
                    {currentMatch.player1_total_points} pts)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-red-600 text-white">
                    {getInitials(currentMatch.player2_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-white font-medium">
                    {currentMatch.player2_name}
                  </p>
                  <p className="text-slate-400 text-sm">
                    {currentMatch.player2_bet_count} bets (
                    {currentMatch.player2_total_points} pts)
                  </p>
                </div>
              </div>
            </div>

            {/* Match Statistics */}
            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-slate-300 text-sm">Total Bets</p>
                  <p className="text-white font-bold text-lg">
                    {currentMatch.total_bets}
                  </p>
                </div>
                <div>
                  <p className="text-slate-300 text-sm">Total Wagered</p>
                  <p className="text-white font-bold text-lg">
                    {currentMatch.total_points_wagered} pts
                  </p>
                </div>
                <div>
                  <p className="text-slate-300 text-sm">Time Left</p>
                  <p className="text-white font-bold text-lg">
                    {formatTime(currentMatch.seconds_until_betting_ends)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-300 text-sm">Match Starts</p>
                  <p className="text-white font-bold text-lg">
                    {formatTime(currentMatch.seconds_until_match_starts)}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              {currentMatch.status === "pending" && (
                <Button
                  onClick={startBetting}
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Betting
                </Button>
              )}

              {currentMatch.status === "betting_open" && (
                <>
                  <Button
                    onClick={closeBetting}
                    disabled={isLoading}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white"
                  >
                    <Square className="h-4 w-4 mr-2" />
                    Close Betting
                  </Button>
                </>
              )}

              {currentMatch.status === "betting_closed" && (
                <Button
                  onClick={startMatch}
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Match
                </Button>
              )}

              {currentMatch.status === "live" && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => setWinner(currentMatch.player1_id)}
                    disabled={isLoading}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Trophy className="h-4 w-4 mr-2" />
                    {currentMatch.player1_name} Wins
                  </Button>
                  <Button
                    onClick={() => setWinner(currentMatch.player2_id)}
                    disabled={isLoading}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Trophy className="h-4 w-4 mr-2" />
                    {currentMatch.player2_name} Wins
                  </Button>
                </div>
              )}

              {currentMatch.winner_id && (
                <div className="w-full p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <p className="text-green-400 font-medium">
                    Winner: {currentMatch.winner_name}
                  </p>
                  <p className="text-green-300 text-sm">
                    Payouts have been processed automatically
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tournament Statistics */}
      {tournamentStats && (
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Tournament Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-slate-800/50 rounded-lg">
                <p className="text-slate-300 text-sm">Total Matches</p>
                <p className="text-white font-bold text-xl">
                  {tournamentStats.total_matches}
                </p>
              </div>
              <div className="text-center p-3 bg-slate-800/50 rounded-lg">
                <p className="text-slate-300 text-sm">Total Bets</p>
                <p className="text-white font-bold text-xl">
                  {tournamentStats.total_bets_placed}
                </p>
              </div>
              <div className="text-center p-3 bg-slate-800/50 rounded-lg">
                <p className="text-slate-300 text-sm">Total Wagered</p>
                <p className="text-white font-bold text-xl">
                  {tournamentStats.total_points_wagered} pts
                </p>
              </div>
              <div className="text-center p-3 bg-slate-800/50 rounded-lg">
                <p className="text-slate-300 text-sm">Active Matches</p>
                <p className="text-white font-bold text-xl">
                  {tournamentStats.active_matches}
                </p>
              </div>
            </div>

            {/* Most Active Players */}
            {tournamentStats.most_active_players &&
              tournamentStats.most_active_players.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-white font-semibold">
                    Most Active Players
                  </h4>
                  <div className="space-y-2">
                    {tournamentStats.most_active_players.map(
                      (player, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              #{index + 1}
                            </Badge>
                            <span className="text-white font-medium">
                              {player.display_name}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-white text-sm">
                              {player.bet_count} bets
                            </p>
                            <p className="text-slate-400 text-xs">
                              {player.total_points_wagered} pts
                            </p>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

            {/* Recent Activity */}
            {tournamentStats.recent_activity &&
              tournamentStats.recent_activity.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-white font-semibold">Recent Activity</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {tournamentStats.recent_activity.map((activity, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {getInitials(activity.bettor_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-white text-sm font-medium">
                              {activity.bettor_name}
                            </p>
                            <p className="text-slate-400 text-xs">
                              {activity.player1_name} vs {activity.player2_name}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white text-sm">
                            {activity.points_wagered} pts
                          </p>
                          <p className="text-slate-400 text-xs">
                            on {activity.bet_on_player_name}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
