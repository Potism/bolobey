"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Clock,
  Users,
  Zap,
  Trophy,
  Target,
  CheckCircle,
  Star,
  Flame,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/hooks/useAuth";
import { useOptimizedFetch } from "@/lib/hooks/useOptimizedFetch";

interface BettingMatch {
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
  winner_id: string | null;
  winner_name: string | null;
  total_bets: number;
  total_points_wagered: number;
}

interface UserBet {
  id: string;
  user_id: string;
  match_id: string;
  bet_on_player_id: string;
  points_wagered: number;
  potential_winnings: number;
  status: string;
  created_at: string;
  user: {
    display_name: string;
  };
}

interface BettingStats {
  player1_bets: number;
  player2_bets: number;
  player1_points: number;
  player2_points: number;
  total_bets: number;
  total_points: number;
  player1_odds: number;
  player2_odds: number;
}

interface EnhancedLiveBettingProps {
  tournamentId: string;
  userPoints?: number;
}

export function EnhancedLiveBetting({
  tournamentId,
  userPoints = 0,
}: EnhancedLiveBettingProps) {
  const { user } = useAuth();
  const [currentMatch, setCurrentMatch] = useState<BettingMatch | null>(null);
  const [userBet, setUserBet] = useState<UserBet | null>(null);
  const [bettingStats, setBettingStats] = useState<BettingStats | null>(null);
  const [betAmount, setBetAmount] = useState<string>("");
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [recentBets, setRecentBets] = useState<UserBet[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Quick bet amounts
  const quickBetAmounts = [10, 25, 50, 100, 250, 500];

  // Optimized fetch for current betting match
  const {
    data: currentMatchData,
    loading: matchLoading,
    refetch: refetchMatch,
  } = useOptimizedFetch({
    key: `current-match-${tournamentId}`,
    fetcher: async () => {
      console.log("🔍 Fetching betting data for tournament:", tournamentId);

      // First, let's check if current_betting_matches view exists
      const { error: viewError } = await supabase
        .from("current_betting_matches")
        .select("count")
        .limit(1);

      if (viewError) {
        console.error("❌ current_betting_matches view error:", viewError);

        // Fallback: try to get data from betting_matches table directly
        console.log("🔄 Trying fallback to betting_matches table...");
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("betting_matches")
          .select("*")
          .eq("tournament_id", tournamentId)
          .in("status", ["betting_open", "betting_closed", "live"])
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (fallbackError) {
          console.error("❌ Fallback betting_matches error:", fallbackError);
          return null;
        }

        console.log("✅ Found betting match via fallback:", fallbackData);
        return fallbackData;
      }

      // Original query to current_betting_matches view
      const { data, error } = await supabase
        .from("current_betting_matches")
        .select("*")
        .eq("tournament_id", tournamentId)
        .in("status", ["betting_open", "betting_closed", "live"])
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("❌ Error fetching current match:", error);
        return null;
      }

      console.log("✅ Found betting match:", data);
      return data;
    },
    retryOptions: { maxRetries: 3, delay: 1000, backoff: true },
    staleTime: 30 * 1000, // 30 seconds
  });

  // Update current match state when data changes
  useEffect(() => {
    if (currentMatchData) {
      console.log("Current betting match data:", currentMatchData);
      setCurrentMatch(currentMatchData);
      calculateTimeLeft(currentMatchData);

      // Use the statistics from the view directly
      const stats = {
        player1_bets: 0, // Will be calculated from user_bets
        player2_bets: 0, // Will be calculated from user_bets
        player1_points: 0, // Will be calculated from user_bets
        player2_points: 0, // Will be calculated from user_bets
        total_bets: currentMatchData.total_bets || 0,
        total_points: currentMatchData.total_points_wagered || 0,
        player1_odds: 2.0,
        player2_odds: 2.0,
      };

      console.log("Setting initial stats from view:", stats);
      setBettingStats(stats);

      // Fetch detailed stats and recent bets
      fetchBettingStats(currentMatchData.id);
      fetchRecentBets(currentMatchData.id);
      fetchUserBet(currentMatchData.id);
    } else {
      setCurrentMatch(null);
      setBettingStats(null);
      setRecentBets([]);
      setUserBet(null);
    }
  }, [currentMatchData]);

  // Calculate time left for betting
  const calculateTimeLeft = (match: BettingMatch) => {
    if (match.status !== "betting_open") {
      setTimeLeft(0);
      return;
    }

    const endTime = new Date(match.betting_end_time).getTime();
    const now = new Date().getTime();
    const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
    setTimeLeft(remaining);
  };

  // Fetch betting statistics
  const fetchBettingStats = async (matchId: string) => {
    try {
      console.log("Fetching betting stats for match:", matchId);

      const { data: bets, error } = await supabase
        .from("user_bets")
        .select("bet_on_player_id, points_wagered")
        .eq("match_id", matchId);

      if (error) {
        console.error("Error fetching betting stats:", error);
        return;
      }

      console.log("Found bets:", bets);

      if (bets && bets.length > 0) {
        // Get the current match data to access player IDs
        const { data: matchData, error: matchError } = await supabase
          .from("current_betting_matches")
          .select("player1_id, player2_id, total_bets, total_points_wagered")
          .eq("id", matchId)
          .single();

        if (matchError) {
          console.error("Error fetching match data:", matchError);
          return;
        }

        console.log("Match data:", matchData);

        const player1Bets = bets.filter(
          (bet) => bet.bet_on_player_id === matchData.player1_id
        );
        const player2Bets = bets.filter(
          (bet) => bet.bet_on_player_id === matchData.player2_id
        );

        console.log("Player 1 bets:", player1Bets);
        console.log("Player 2 bets:", player2Bets);

        const player1Points = player1Bets.reduce(
          (sum, bet) => sum + bet.points_wagered,
          0
        );
        const player2Points = player2Bets.reduce(
          (sum, bet) => sum + bet.points_wagered,
          0
        );
        console.log("Player 1 points:", player1Points);
        console.log("Player 2 points:", player2Points);
        console.log("Total points from view:", matchData.total_points_wagered);

        // Calculate dynamic odds (simplified)
        const totalWagered = matchData.total_points_wagered || 0;
        const player1Odds =
          totalWagered > 0 && player1Points > 0
            ? totalWagered / player1Points
            : 2.0;
        const player2Odds =
          totalWagered > 0 && player2Points > 0
            ? totalWagered / player2Points
            : 2.0;

        const stats = {
          player1_bets: player1Bets.length,
          player2_bets: player2Bets.length,
          player1_points: player1Points,
          player2_points: player2Points,
          total_bets: matchData.total_bets || 0,
          total_points: totalWagered,
          player1_odds: Math.max(1.1, Math.min(10, player1Odds)),
          player2_odds: Math.max(1.1, Math.min(10, player2Odds)),
        };

        console.log("Setting betting stats:", stats);
        setBettingStats(stats);
      } else {
        console.log("No bets found, keeping current stats");
        // Don't reset stats if no bets found, keep the ones from the view
      }
    } catch (error) {
      console.error("Error calculating betting stats:", error);
    }
  };

  // Fetch recent bets
  const fetchRecentBets = async (matchId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_bets")
        .select(
          `
          *,
          user:users!user_bets_user_id_fkey(display_name)
        `
        )
        .eq("match_id", matchId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error fetching recent bets:", error);
        return;
      }

      setRecentBets(data || []);
    } catch (error) {
      console.error("Error fetching recent bets:", error);
    }
  };

  // Fetch user's bet for this match
  const fetchUserBet = async (matchId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("user_bets")
        .select("*")
        .eq("match_id", matchId)
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching user bet:", error);
        return;
      }

      setUserBet(data || null);
    } catch (error) {
      console.error("Error fetching user bet:", error);
    }
  };

  // Handle quick bet selection
  const handleQuickBet = (amount: number) => {
    setBetAmount(amount.toString());
  };

  // Handle player selection
  const handlePlayerSelect = (playerId: string) => {
    setSelectedPlayer(playerId);
    if (betAmount) {
      setShowConfirmation(true);
    }
  };

  // Handle bet placement
  const handlePlaceBet = async () => {
    if (!selectedPlayer || !betAmount || !currentMatch || !user) return;

    const amount = parseInt(betAmount);
    if (amount <= 0 || amount > userPoints) return;

    setIsPlacingBet(true);
    setError(null);

    try {
      // Calculate potential winnings based on current odds
      const potentialWinnings = bettingStats
        ? selectedPlayer === currentMatch.player1_id
          ? Math.floor(amount * bettingStats.player1_odds)
          : Math.floor(amount * bettingStats.player2_odds)
        : amount * 2;

      const { data, error } = await supabase
        .from("user_bets")
        .insert({
          user_id: user.id,
          match_id: currentMatch.id,
          bet_on_player_id: selectedPlayer,
          points_wagered: amount,
          potential_winnings: potentialWinnings,
        })
        .select()
        .single();

      if (error) {
        console.error("Error placing bet:", error);
        setError("Failed to place bet. Please try again.");
        return;
      }

      if (data) {
        // Update local state
        setUserBet(data);
        setBetAmount("");
        setSelectedPlayer(null);
        setShowConfirmation(false);

        // Refresh data
        await refetchMatch();
        await fetchBettingStats(currentMatch.id);
        await fetchRecentBets(currentMatch.id);
      }
    } catch (error) {
      console.error("Error placing bet:", error);
      setError("Failed to place bet. Please try again.");
    } finally {
      setIsPlacingBet(false);
    }
  };

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Load data on mount and when tournament changes
  // Initial fetch is handled by useOptimizedFetch

  // Update timer
  useEffect(() => {
    if (currentMatch && currentMatch.status === "betting_open") {
      const timer = setInterval(() => {
        calculateTimeLeft(currentMatch);
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [currentMatch]);

  if (!currentMatch) {
    console.log(
      "🔍 No current betting match found for tournament:",
      tournamentId
    );
    return (
      <Card className="w-full bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Zap className="h-5 w-5 text-yellow-400" />
            Live Betting
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Target className="h-12 w-12 mx-auto mb-4 text-slate-400" />
            <p className="text-slate-400">No active matches for betting</p>
            <p className="text-sm text-slate-500 mt-2">
              Check back when a match starts!
            </p>
            <div className="mt-4 p-2 bg-slate-800 rounded text-xs text-slate-400">
              <p>Debug: Tournament ID: {tournamentId}</p>
              <p>Loading: {matchLoading ? "Yes" : "No"}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isBettingOpen = currentMatch.status === "betting_open";
  const hasUserBet = userBet !== null;

  return (
    <div className="space-y-6">
      {/* Header with Timer */}
      <Card className="bg-gradient-to-r from-red-600 to-red-700 border-red-500">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Flame className="h-6 w-6 text-white" />
              <div>
                <h3 className="text-white font-bold text-lg">LIVE BETTING</h3>
                <p className="text-red-100 text-sm">
                  {isBettingOpen ? "Betting Open" : "Betting Closed"}
                </p>
              </div>
            </div>
            {isBettingOpen && (
              <div className="text-center">
                <div className="flex items-center gap-2 text-white">
                  <Clock className="h-5 w-5" />
                  <span className="text-2xl font-bold">
                    {formatTime(timeLeft)}
                  </span>
                </div>
                <p className="text-red-100 text-xs">Time Remaining</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Match Info */}
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <span>Match Details</span>
            <Badge variant={isBettingOpen ? "default" : "secondary"}>
              {isBettingOpen ? "BETTING OPEN" : "CLOSED"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Players */}
          <div className="grid grid-cols-2 gap-4">
            {/* Player 1 */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedPlayer === currentMatch.player1_id
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-slate-600 bg-slate-800/50"
              }`}
              onClick={() =>
                isBettingOpen && handlePlayerSelect(currentMatch.player1_id)
              }
            >
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-blue-600 text-white">
                    {getInitials(currentMatch.player1_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="text-white font-semibold">
                    {currentMatch.player1_name}
                  </h4>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-yellow-400" />
                    <span className="text-xs text-slate-300">Player 1</span>
                  </div>
                </div>
              </div>

              {/* Odds and Stats */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300 text-sm">Odds</span>
                  <span className="text-green-400 font-bold text-lg">
                    {bettingStats
                      ? bettingStats.player1_odds.toFixed(2)
                      : "2.00"}
                    x
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300 text-sm">Bets</span>
                  <span className="text-white">
                    {bettingStats?.player1_bets || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300 text-sm">Total</span>
                  <span className="text-white">
                    {bettingStats?.player1_points || 0} pts
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Player 2 */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedPlayer === currentMatch.player2_id
                  ? "border-red-500 bg-red-500/10"
                  : "border-slate-600 bg-slate-800/50"
              }`}
              onClick={() =>
                isBettingOpen && handlePlayerSelect(currentMatch.player2_id)
              }
            >
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-red-600 text-white">
                    {getInitials(currentMatch.player2_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="text-white font-semibold">
                    {currentMatch.player2_name}
                  </h4>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-yellow-400" />
                    <span className="text-xs text-slate-300">Player 2</span>
                  </div>
                </div>
              </div>

              {/* Odds and Stats */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300 text-sm">Odds</span>
                  <span className="text-green-400 font-bold text-lg">
                    {bettingStats
                      ? bettingStats.player2_odds.toFixed(2)
                      : "2.00"}
                    x
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300 text-sm">Bets</span>
                  <span className="text-white">
                    {bettingStats?.player2_bets || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300 text-sm">Total</span>
                  <span className="text-white">
                    {bettingStats?.player2_points || 0} pts
                  </span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Match Stats */}
          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-slate-300 text-sm">Total Bets</p>
                <p className="text-white font-bold text-lg">
                  {bettingStats?.total_bets || 0}
                </p>
              </div>
              <div>
                <p className="text-slate-300 text-sm">Total Wagered</p>
                <p className="text-white font-bold text-lg">
                  {bettingStats?.total_points || 0} pts
                </p>
              </div>
              <div>
                <p className="text-slate-300 text-sm">Your Points</p>
                <p className="text-green-400 font-bold text-lg">{userPoints}</p>
              </div>
            </div>
          </div>

          {/* User's Bet */}
          {hasUserBet && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-400 font-medium">Your Bet</p>
                  <p className="text-white text-sm">
                    {userBet.points_wagered} pts on{" "}
                    {userBet.bet_on_player_id === currentMatch.player1_id
                      ? currentMatch.player1_name
                      : currentMatch.player2_name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-green-400 font-bold">Potential Winnings</p>
                  <p className="text-white font-bold">
                    {userBet.potential_winnings} pts
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Betting Interface */}
      {isBettingOpen && !hasUserBet && (
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Place Your Bet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Error Display */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Bet Amount */}
            <div>
              <label className="text-slate-300 text-sm mb-2 block">
                Bet Amount (Points)
              </label>
              <Input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                placeholder="Enter amount..."
                className="bg-slate-800 border-slate-600 text-white"
                min="1"
                max={userPoints}
              />
            </div>

            {/* Quick Bet Buttons */}
            <div>
              <p className="text-slate-300 text-sm mb-2">Quick Bet</p>
              <div className="grid grid-cols-3 gap-2">
                {quickBetAmounts.map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickBet(amount)}
                    className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
                    disabled={amount > userPoints}
                  >
                    {amount}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBetAmount(userPoints.toString())}
                  className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
                >
                  All ({userPoints})
                </Button>
              </div>
            </div>

            {/* Potential Winnings */}
            {selectedPlayer && betAmount && bettingStats && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-green-400 font-medium">
                    Potential Winnings
                  </span>
                  <span className="text-green-400 font-bold text-xl">
                    {Math.floor(
                      parseInt(betAmount) *
                        (selectedPlayer === currentMatch.player1_id
                          ? bettingStats.player1_odds
                          : bettingStats.player2_odds)
                    )}{" "}
                    pts
                  </span>
                </div>
              </div>
            )}

            {/* Place Bet Button */}
            <Button
              onClick={() => setShowConfirmation(true)}
              disabled={
                !selectedPlayer ||
                !betAmount ||
                parseInt(betAmount) <= 0 ||
                parseInt(betAmount) > userPoints
              }
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-3"
              size="lg"
            >
              <Trophy className="h-5 w-5 mr-2" />
              Place Bet
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recent Bets */}
      {recentBets.length > 0 && (
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="h-5 w-5" />
              Recent Bets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {recentBets.map((bet) => (
                <motion.div
                  key={bet.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {getInitials(bet.user.display_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-slate-300 text-sm">
                      {bet.user.display_name}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-white font-medium">
                      {bet.points_wagered} pts
                    </span>
                    <span className="text-slate-400 text-xs block">
                      {new Date(bet.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {showConfirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowConfirmation(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-slate-700 rounded-lg p-6 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-white text-lg font-bold mb-2">
                  Confirm Your Bet
                </h3>
                <p className="text-slate-300 mb-4">
                  You&apos;re betting{" "}
                  <span className="text-white font-bold">
                    {betAmount} points
                  </span>{" "}
                  on{" "}
                  <span className="text-white font-bold">
                    {selectedPlayer === currentMatch.player1_id
                      ? currentMatch.player1_name
                      : currentMatch.player2_name}
                  </span>
                </p>
                {bettingStats && (
                  <p className="text-green-400 font-medium mb-6">
                    Potential winnings:{" "}
                    {Math.floor(
                      parseInt(betAmount) *
                        (selectedPlayer === currentMatch.player1_id
                          ? bettingStats.player1_odds
                          : bettingStats.player2_odds)
                    )}{" "}
                    points
                  </p>
                )}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowConfirmation(false)}
                    className="flex-1 bg-slate-800 border-slate-600 text-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handlePlaceBet}
                    disabled={isPlacingBet}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isPlacingBet ? "Placing..." : "Confirm Bet"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
