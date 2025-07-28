"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Clock,
  Users,
  Zap,
  Trophy,
  Target,
  CheckCircle,
  Star,
  Flame,
  TrendingUp,
  Activity,
  Coins,
  Eye,
  RefreshCw,
  AlertCircle,
  BarChart3,
  History,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/hooks/useAuth";
import { useOptimizedFetch } from "@/lib/hooks/useOptimizedFetch";
import { useDualPoints } from "@/lib/hooks/useDualPoints";
import { EnhancedPointPurchaseModal } from "@/components/enhanced-point-purchase-modal";

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
}

interface UserBetV3 {
  id: string;
  user_id: string;
  match_id: string;
  bet_on_player_id: string;
  points_wagered: number;
  potential_winnings: number;
  stream_points_bonus: number;
  status: string;
  created_at: string;
  user: {
    display_name: string;
  };
}

interface BettingHistoryItem {
  bet_id: string;
  match_id: string;
  tournament_name: string;
  player1_name: string;
  player2_name: string;
  bet_on_player_name: string;
  points_wagered: number;
  potential_winnings: number;
  stream_points_bonus: number;
  status: string;
  created_at: string;
  winner_name: string | null;
  actual_winnings: number;
  profit_loss: number;
}

interface EnhancedLiveBettingV3Props {
  tournamentId: string;
  match?: {
    id: string;
    player1: { id: string; name: string; score: number; avatar?: string };
    player2: { id: string; name: string; score: number; avatar?: string };
    status: string;
    round: number;
    matchNumber: number;
  };
}

export function EnhancedLiveBettingV3({
  tournamentId,
  match, // eslint-disable-line @typescript-eslint/no-unused-vars
}: EnhancedLiveBettingV3Props) {
  const { user } = useAuth();
  const { userPoints: userPointData, forceRefresh } = useDualPoints();
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [currentMatch, setCurrentMatch] = useState<BettingMatchV3 | null>(null);
  const [userBet, setUserBet] = useState<UserBetV3 | null>(null);
  const [betAmount, setBetAmount] = useState<string>("");
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [recentBets, setRecentBets] = useState<UserBetV3[]>([]);
  const [bettingHistory, setBettingHistory] = useState<BettingHistoryItem[]>(
    []
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("betting");

  // Quick bet amounts
  const quickBetAmounts = [10, 25, 50, 100, 250, 500];

  // Optimized fetch for current betting match with V3 view
  const { data: currentMatchData, refetch: refetchMatch } = useOptimizedFetch({
    key: `current-match-v3-${tournamentId}`,
    fetcher: async () => {
      const { data, error } = await supabase
        .from("current_betting_matches")
        .select("*")
        .eq("tournament_id", tournamentId)
        .in("computed_status", ["betting_open", "betting_closed", "live"])
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
    staleTime: 10 * 1000, // 10 seconds for real-time updates
  });

  // Update current match state when data changes
  useEffect(() => {
    if (currentMatchData) {
      setCurrentMatch(currentMatchData);
      calculateTimeLeft(currentMatchData);
      fetchRecentBets(currentMatchData.id);
      fetchUserBet(currentMatchData.id);
    } else {
      setCurrentMatch(null);
      setRecentBets([]);
      setUserBet(null);
    }
  }, [currentMatchData]);

  // Calculate time left for betting
  const calculateTimeLeft = useCallback((match: BettingMatchV3) => {
    if (match.computed_status !== "betting_open") {
      setTimeLeft(0);
      return;
    }

    const endTime = new Date(match.betting_end_time).getTime();
    const now = new Date().getTime();
    const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
    setTimeLeft(remaining);
  }, []);

  // Fetch recent bets
  const fetchRecentBets = useCallback(async (matchId: string) => {
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
  }, []);

  // Fetch user's bet for this match
  const fetchUserBet = useCallback(
    async (matchId: string) => {
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
    },
    [user]
  );

  // Fetch user betting history
  const fetchBettingHistory = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc(
        "get_user_betting_history_v3",
        {
          user_uuid: user.id,
          limit_count: 20,
        }
      );

      if (error) {
        console.error("Error fetching betting history:", error);
        return;
      }

      setBettingHistory(data || []);
    } catch (error) {
      console.error("Error fetching betting history:", error);
    }
  }, [user]);

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

  // Handle bet placement with V3 function
  const handlePlaceBet = async () => {
    if (!selectedPlayer || !betAmount || !currentMatch || !user) return;

    const amount = parseInt(betAmount);
    if (amount <= 0) return;

    // Check if user has enough betting points
    if (!userPointData || amount > userPointData.betting_points) {
      setError(
        "Insufficient betting points. Purchase more points to continue betting."
      );
      setShowPurchaseModal(true);
      return;
    }

    setIsPlacingBet(true);
    setError(null);
    setSuccess(null);

    try {
      // Use the V3 function to place bet
      const { data: result, error: betError } = await supabase.rpc(
        "place_betting_match_bet_v3",
        {
          match_uuid: currentMatch.id,
          bet_on_player_uuid: selectedPlayer,
          points_to_wager: amount,
        }
      );

      if (betError) {
        setError(betError.message || "Failed to place bet");
        return;
      }

      if (result && result.success) {
        setSuccess(result.message || "Bet placed successfully!");
        setBetAmount("");
        setSelectedPlayer(null);
        setShowConfirmation(false);

        // Refresh data
        await forceRefresh();
        await refetchMatch();
        await fetchRecentBets(currentMatch.id);
        await fetchUserBet(currentMatch.id);
      } else {
        setError(result?.error || "Failed to place bet");
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

  // Calculate potential winnings
  const potentialWinnings = useMemo(() => {
    if (!selectedPlayer || !betAmount || !currentMatch) return 0;
    const amount = parseInt(betAmount);
    if (isNaN(amount)) return 0;

    const odds =
      selectedPlayer === currentMatch.player1_id
        ? currentMatch.player1_odds
        : currentMatch.player2_odds;

    return Math.floor(amount * odds);
  }, [selectedPlayer, betAmount, currentMatch]);

  // Update timer
  useEffect(() => {
    if (currentMatch && currentMatch.computed_status === "betting_open") {
      const timer = setInterval(() => {
        calculateTimeLeft(currentMatch);
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [currentMatch, calculateTimeLeft]);

  // Load betting history on mount
  useEffect(() => {
    fetchBettingHistory();
  }, [fetchBettingHistory]);

  if (!currentMatch) {
    return (
      <Card className="w-full bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Zap className="h-5 w-5 text-yellow-400" />
            Live Betting V3
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Target className="h-12 w-12 mx-auto mb-4 text-slate-400" />
            <p className="text-slate-400">No active matches for betting</p>
            <p className="text-sm text-slate-500 mt-2">
              Check back when a match starts!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isBettingOpen = currentMatch.computed_status === "betting_open";
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
                <h3 className="text-white font-bold text-lg">
                  LIVE BETTING V3
                </h3>
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

      {/* Main Content with Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-slate-800">
          <TabsTrigger value="betting" className="text-white">
            <Target className="h-4 w-4 mr-2" />
            Betting
          </TabsTrigger>
          <TabsTrigger value="stats" className="text-white">
            <BarChart3 className="h-4 w-4 mr-2" />
            Statistics
          </TabsTrigger>
          <TabsTrigger value="history" className="text-white">
            <History className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Betting Tab */}
        <TabsContent value="betting" className="space-y-6">
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
                        {currentMatch.player1_odds.toFixed(2)}x
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300 text-sm">Bets</span>
                      <span className="text-white">
                        {currentMatch.player1_bet_count}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300 text-sm">Total</span>
                      <span className="text-white">
                        {currentMatch.player1_total_points} pts
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
                        {currentMatch.player2_odds.toFixed(2)}x
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300 text-sm">Bets</span>
                      <span className="text-white">
                        {currentMatch.player2_bet_count}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300 text-sm">Total</span>
                      <span className="text-white">
                        {currentMatch.player2_total_points} pts
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
                    <p className="text-slate-300 text-sm">Your Points</p>
                    <p className="text-green-400 font-bold text-lg">
                      {userPointData?.betting_points || 0}
                    </p>
                    <p className="text-slate-400 text-xs">
                      Stream: {userPointData?.stream_points || 0}
                    </p>
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
                      <p className="text-green-400 font-bold">
                        Potential Winnings
                      </p>
                      <p className="text-white font-bold">
                        {userBet.potential_winnings} pts
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Success/Error Messages */}
              {success && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                  <p className="text-green-400 text-sm">{success}</p>
                </div>
              )}

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{error}</p>
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
                    max={userPointData?.betting_points || 0}
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
                        disabled={amount > (userPointData?.betting_points || 0)}
                      >
                        {amount}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setBetAmount(
                          (userPointData?.betting_points || 0).toString()
                        )
                      }
                      className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
                    >
                      All ({userPointData?.betting_points || 0})
                    </Button>
                  </div>
                </div>

                {/* Potential Winnings */}
                {selectedPlayer && betAmount && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-green-400 font-medium">
                        Potential Winnings
                      </span>
                      <span className="text-green-400 font-bold text-xl">
                        {potentialWinnings} pts
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
                    parseInt(betAmount) > (userPointData?.betting_points || 0)
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
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="stats" className="space-y-6">
          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Match Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Betting Distribution */}
              <div className="space-y-3">
                <h4 className="text-white font-semibold">
                  Betting Distribution
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">
                      {currentMatch.player1_name}
                    </span>
                    <span className="text-white font-medium">
                      {currentMatch.player1_bet_count} bets (
                      {currentMatch.player1_total_points} pts)
                    </span>
                  </div>
                  <Progress
                    value={
                      (currentMatch.player1_total_points /
                        Math.max(currentMatch.total_points_wagered, 1)) *
                      100
                    }
                    className="h-2"
                  />

                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">
                      {currentMatch.player2_name}
                    </span>
                    <span className="text-white font-medium">
                      {currentMatch.player2_bet_count} bets (
                      {currentMatch.player2_total_points} pts)
                    </span>
                  </div>
                  <Progress
                    value={
                      (currentMatch.player2_total_points /
                        Math.max(currentMatch.total_points_wagered, 1)) *
                      100
                    }
                    className="h-2"
                  />
                </div>
              </div>

              {/* Match Summary */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700">
                <div className="text-center">
                  <p className="text-slate-300 text-sm">Total Bets</p>
                  <p className="text-white font-bold text-xl">
                    {currentMatch.total_bets}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-slate-300 text-sm">Total Wagered</p>
                  <p className="text-white font-bold text-xl">
                    {currentMatch.total_points_wagered} pts
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <History className="h-5 w-5" />
                Your Betting History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bettingHistory.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {bettingHistory.map((item) => (
                    <div
                      key={item.bet_id}
                      className="p-3 bg-slate-800/50 rounded-lg"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-white font-medium">
                            {item.player1_name} vs {item.player2_name}
                          </p>
                          <p className="text-slate-400 text-sm">
                            Bet on {item.bet_on_player_name} -{" "}
                            {item.points_wagered} pts
                          </p>
                        </div>
                        <Badge
                          variant={
                            item.status === "won"
                              ? "default"
                              : item.status === "lost"
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {item.status.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">
                          {new Date(item.created_at).toLocaleDateString()}
                        </span>
                        <span
                          className={`font-medium ${
                            item.profit_loss > 0
                              ? "text-green-400"
                              : item.profit_loss < 0
                              ? "text-red-400"
                              : "text-slate-400"
                          }`}
                        >
                          {item.profit_loss > 0 ? "+" : ""}
                          {item.profit_loss} pts
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <History className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                  <p className="text-slate-400">No betting history yet</p>
                  <p className="text-sm text-slate-500 mt-2">
                    Start betting to see your history here!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
                <p className="text-green-400 font-medium mb-6">
                  Potential winnings: {potentialWinnings} points
                </p>
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

      {/* Purchase Modal */}
      <EnhancedPointPurchaseModal
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        onSuccess={() => {
          console.log("Purchase successful!");
        }}
      />
    </div>
  );
}
