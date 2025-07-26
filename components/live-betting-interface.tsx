"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Timer,
  Users,
  Trophy,
  Coins,
  AlertCircle,
  CheckCircle,
  Play,
  Clock,
  Target,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/hooks/useAuth";

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
  stream_url?: string;
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
}

interface BettingStats {
  player1_bets: number;
  player2_bets: number;
  player1_points: number;
  player2_points: number;
  total_bets: number;
  total_points: number;
}

export function LiveBettingInterface({
  tournamentId,
}: {
  tournamentId: string;
}) {
  const { user } = useAuth();
  const [currentMatch, setCurrentMatch] = useState<BettingMatch | null>(null);
  const [userBet, setUserBet] = useState<UserBet | null>(null);
  const [userPoints, setUserPoints] = useState(0);
  const [bettingStats, setBettingStats] = useState<BettingStats | null>(null);
  const [betAmount, setBetAmount] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Fetch current betting match
  const fetchCurrentMatch = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("current_betting_matches")
        .select("*")
        .eq("tournament_id", tournamentId)
        .in("status", ["betting_open", "betting_closed", "live"])
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching current match:", error);
        return;
      }

      if (data) {
        setCurrentMatch(data);
        calculateTimeLeft(data);
      }
    } catch (error) {
      console.error("Error fetching current match:", error);
    }
  }, [tournamentId]);

  // Fetch user's current bet
  const fetchUserBet = useCallback(async () => {
    if (!user || !currentMatch) return;

    try {
      const { data, error } = await supabase
        .from("user_bets")
        .select("*")
        .eq("user_id", user.id)
        .eq("match_id", currentMatch.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching user bet:", error);
        return;
      }

      setUserBet(data || null);
    } catch (error) {
      console.error("Error fetching user bet:", error);
    }
  }, [user, currentMatch]);

  // Fetch user's points balance
  const fetchUserPoints = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc("get_user_points_balance", {
        user_uuid: user.id,
      });

      if (error) {
        console.error("Error fetching user points:", error);
        return;
      }

      setUserPoints(data || 0);
    } catch (error) {
      console.error("Error fetching user points:", error);
    }
  }, [user]);

  // Fetch betting statistics
  const fetchBettingStats = useCallback(async () => {
    if (!currentMatch) return;

    try {
      const { data, error } = await supabase
        .from("user_bets")
        .select("bet_on_player_id, points_wagered")
        .eq("match_id", currentMatch.id);

      if (error) {
        console.error("Error fetching betting stats:", error);
        return;
      }

      const stats: BettingStats = {
        player1_bets: 0,
        player2_bets: 0,
        player1_points: 0,
        player2_points: 0,
        total_bets: data.length,
        total_points: 0,
      };

      data.forEach((bet) => {
        if (bet.bet_on_player_id === currentMatch.player1_id) {
          stats.player1_bets++;
          stats.player1_points += bet.points_wagered;
        } else {
          stats.player2_bets++;
          stats.player2_points += bet.points_wagered;
        }
        stats.total_points += bet.points_wagered;
      });

      setBettingStats(stats);
    } catch (error) {
      console.error("Error fetching betting stats:", error);
    }
  }, [currentMatch]);

  // Calculate time left until betting closes
  const calculateTimeLeft = useCallback((match: BettingMatch) => {
    if (match.status !== "betting_open") {
      setTimeLeft(0);
      return;
    }

    const endTime = new Date(match.betting_end_time).getTime();
    const now = new Date().getTime();
    const timeRemaining = Math.max(0, Math.floor((endTime - now) / 1000));
    setTimeLeft(timeRemaining);
  }, []);

  // Place bet
  const placeBet = useCallback(async () => {
    if (!user || !currentMatch || !selectedPlayer || !betAmount) return;

    const points = parseInt(betAmount);
    if (isNaN(points) || points <= 0) {
      setError("Please enter a valid bet amount");
      return;
    }

    if (points > userPoints) {
      setError("Insufficient points");
      return;
    }

    setIsPlacingBet(true);
    setError(null);

    try {
      const { error } = await supabase.rpc("place_bet", {
        match_uuid: currentMatch.id,
        bet_on_player_uuid: selectedPlayer,
        points_to_wager: points,
      });

      if (error) {
        setError(error.message);
        return;
      }

      // Refresh data
      await Promise.all([
        fetchUserBet(),
        fetchUserPoints(),
        fetchBettingStats(),
      ]);

      setBetAmount("");
      setSelectedPlayer(null);
    } catch (error) {
      setError("Failed to place bet. Please try again.");
    } finally {
      setIsPlacingBet(false);
    }
  }, [
    user,
    currentMatch,
    selectedPlayer,
    betAmount,
    userPoints,
    fetchUserBet,
    fetchUserPoints,
    fetchBettingStats,
  ]);

  // Format time
  const formatTime = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }, []);

  // Get player initials
  const getInitials = useCallback((name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    fetchCurrentMatch();
    fetchUserPoints();

    const interval = setInterval(() => {
      if (currentMatch) {
        calculateTimeLeft(currentMatch);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [tournamentId]); // Only depend on tournamentId to prevent infinite loops

  useEffect(() => {
    if (currentMatch) {
      fetchUserBet();
      fetchBettingStats();
    }
  }, [currentMatch?.id]); // Only depend on match ID

  // Real-time subscription
  useEffect(() => {
    if (!currentMatch) return;

    const channel = supabase
      .channel(`betting:${currentMatch.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_bets",
          filter: `match_id=eq.${currentMatch.id}`,
        },
        () => {
          fetchBettingStats();
          fetchUserBet();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "betting_matches",
          filter: `id=eq.${currentMatch.id}`,
        },
        () => {
          fetchCurrentMatch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentMatch?.id]); // Only depend on match ID

  if (!currentMatch) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Live Betting
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No active betting matches at the moment
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isBettingOpen = currentMatch.status === "betting_open";
  const isMatchLive = currentMatch.status === "live";
  const isCompleted = currentMatch.status === "completed";
  const hasUserBet = userBet !== null;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Live Betting
          {isBettingOpen && (
            <Badge variant="destructive" className="ml-auto">
              <Timer className="h-3 w-3 mr-1" />
              {formatTime(timeLeft)}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Match Info */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback>
                {getInitials(currentMatch.player1_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{currentMatch.player1_name}</p>
              <p className="text-sm text-muted-foreground">Player 1</p>
            </div>
          </div>

          <div className="text-center">
            <Badge variant={isMatchLive ? "destructive" : "secondary"}>
              {isMatchLive ? (
                <>
                  <Play className="h-3 w-3 mr-1" />
                  LIVE
                </>
              ) : isCompleted ? (
                <>
                  <Trophy className="h-3 w-3 mr-1" />
                  COMPLETED
                </>
              ) : (
                <>
                  <Clock className="h-3 w-3 mr-1" />
                  {isBettingOpen ? "BETTING OPEN" : "BETTING CLOSED"}
                </>
              )}
            </Badge>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-semibold">{currentMatch.player2_name}</p>
              <p className="text-sm text-muted-foreground">Player 2</p>
            </div>
            <Avatar className="h-12 w-12">
              <AvatarFallback>
                {getInitials(currentMatch.player2_name)}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Betting Statistics */}
        {bettingStats && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Betting Statistics</span>
              <Badge variant="outline">
                <Users className="h-3 w-3 mr-1" />
                {bettingStats.total_bets} bets
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  {currentMatch.player1_name}
                </p>
                <p className="text-lg font-bold">{bettingStats.player1_bets}</p>
                <p className="text-xs text-muted-foreground">
                  {bettingStats.player1_points} points
                </p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  {currentMatch.player2_name}
                </p>
                <p className="text-lg font-bold">{bettingStats.player2_bets}</p>
                <p className="text-xs text-muted-foreground">
                  {bettingStats.player2_points} points
                </p>
              </div>
            </div>

            <Progress
              value={
                (bettingStats.player1_points /
                  Math.max(bettingStats.total_points, 1)) *
                100
              }
              className="h-2"
            />
          </div>
        )}

        {/* User Points */}
        <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-primary" />
            <span className="font-medium">Your Points</span>
          </div>
          <span className="text-lg font-bold text-primary">{userPoints}</span>
        </div>

        {/* User's Current Bet */}
        {hasUserBet && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              You bet <strong>{userBet.points_wagered} points</strong> on{" "}
              <strong>
                {userBet.bet_on_player_id === currentMatch.player1_id
                  ? currentMatch.player1_name
                  : currentMatch.player2_name}
              </strong>
              {isCompleted && (
                <span className="ml-2">
                  - {userBet.status === "won" ? "WON!" : "Lost"}
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Betting Interface */}
        {isBettingOpen && !hasUserBet && user && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="bet-amount">Bet Amount (Points)</Label>
              <Input
                id="bet-amount"
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                placeholder="Enter points to bet"
                min="1"
                max={userPoints}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={
                  selectedPlayer === currentMatch.player1_id
                    ? "default"
                    : "outline"
                }
                onClick={() => setSelectedPlayer(currentMatch.player1_id)}
                disabled={isPlacingBet}
                className="h-16"
              >
                <div className="text-center">
                  <p className="font-semibold">{currentMatch.player1_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Bet on Player 1
                  </p>
                </div>
              </Button>

              <Button
                variant={
                  selectedPlayer === currentMatch.player2_id
                    ? "default"
                    : "outline"
                }
                onClick={() => setSelectedPlayer(currentMatch.player2_id)}
                disabled={isPlacingBet}
                className="h-16"
              >
                <div className="text-center">
                  <p className="font-semibold">{currentMatch.player2_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Bet on Player 2
                  </p>
                </div>
              </Button>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={placeBet}
              disabled={!selectedPlayer || !betAmount || isPlacingBet}
              className="w-full"
            >
              {isPlacingBet ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Placing Bet...
                </>
              ) : (
                <>
                  <Target className="h-4 w-4 mr-2" />
                  Place Bet ({betAmount ? parseInt(betAmount) * 2 : 0} potential
                  winnings)
                </>
              )}
            </Button>
          </div>
        )}

        {/* Match Result */}
        {isCompleted && currentMatch.winner_name && (
          <Alert>
            <Trophy className="h-4 w-4" />
            <AlertDescription>
              <strong>{currentMatch.winner_name}</strong> won the match!
            </AlertDescription>
          </Alert>
        )}

        {/* Login Required */}
        {!user && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please log in to participate in betting
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
