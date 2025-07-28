"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Target,
  AlertCircle,
  CheckCircle,
  Clock,
  Trophy,
  TrendingUp,
  Activity,
  RefreshCw,
  Users,
  Zap,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/hooks/useAuth";
import { useDualPoints } from "@/lib/hooks/useDualPoints";

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

export function EnhancedLiveBettingV3Simple({
  tournamentId,
}: {
  tournamentId: string;
}) {
  const { user } = useAuth();
  const { userPoints, forceRefresh } = useDualPoints();
  const [currentMatch, setCurrentMatch] = useState<BettingMatch | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [betAmount, setBetAmount] = useState<string>("");
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Fetch current betting match
  const fetchCurrentMatch = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("current_betting_matches_v3")
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

      setCurrentMatch(data);
      if (data) {
        setTimeLeft(Math.max(0, data.seconds_until_betting_ends));
      }
    } catch (error) {
      console.error("Error fetching current match:", error);
    }
  }, [tournamentId]);

  // Load initial data
  useEffect(() => {
    fetchCurrentMatch();
  }, [fetchCurrentMatch]);

  // Update countdown timer
  useEffect(() => {
    if (!currentMatch || currentMatch.status !== "betting_open") return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = Math.max(0, prev - 1);
        if (newTime === 0) {
          fetchCurrentMatch(); // Refresh when time runs out
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentMatch, fetchCurrentMatch]);

  // Place bet
  const placeBet = async () => {
    if (!currentMatch || !selectedPlayer || !betAmount) {
      setError("Please select a player and enter bet amount");
      return;
    }

    const amount = parseInt(betAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid bet amount");
      return;
    }

    if (!userPoints || userPoints.betting_points < amount) {
      setError("Insufficient betting points");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.rpc("place_betting_match_bet_v3", {
        match_uuid: currentMatch.id,
        bet_on_player_uuid: selectedPlayer,
        points_to_wager: amount,
      });

      if (error) {
        setError(`Error placing bet: ${error.message}`);
        return;
      }

      if (data && data.success) {
        setSuccess(data.message || "Bet placed successfully!");
        setBetAmount("");
        setSelectedPlayer("");
        forceRefresh(); // Refresh user points
        fetchCurrentMatch(); // Refresh match data
      } else {
        setError(data?.error || "Failed to place bet");
      }
    } catch (error) {
      setError("Failed to place bet");
      console.error("Error placing bet:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  if (!currentMatch) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Live Betting V3
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No active betting matches at the moment.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Check back later or ask an admin to create a new match.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isBettingOpen = currentMatch.status === "betting_open" && timeLeft > 0;
  const userBettingPoints = userPoints?.betting_points || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">LIVE BETTING V3</h2>
          <p className="text-muted-foreground">
            Place your bets and watch the action unfold
          </p>
        </div>
        <Button
          onClick={fetchCurrentMatch}
          disabled={isLoading}
          variant="outline"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Current Match */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {currentMatch.player1_name} vs {currentMatch.player2_name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Match Info */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Status:</span>
                <Badge variant={isBettingOpen ? "default" : "secondary"}>
                  {currentMatch.status}
                </Badge>
              </div>

              {isBettingOpen && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Time Left:</span>
                    <span className="text-lg font-bold text-red-600">
                      {formatTime(timeLeft)}
                    </span>
                  </div>
                  <Progress
                    value={
                      (timeLeft /
                        Math.max(1, currentMatch.seconds_until_betting_ends)) *
                      100
                    }
                    className="h-2"
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="font-medium">Total Bets:</span>
                <span>{currentMatch.total_bets}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-medium">Total Wagered:</span>
                <span>{currentMatch.total_points_wagered} points</span>
              </div>

              {currentMatch.winner_name && (
                <div className="flex items-center justify-between">
                  <span className="font-medium">Winner:</span>
                  <span className="font-bold text-green-600">
                    {currentMatch.winner_name}
                  </span>
                </div>
              )}
            </div>

            {/* Betting Statistics */}
            <div className="space-y-4">
              <h4 className="font-semibold">Betting Statistics</h4>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <div className="font-medium">
                      {currentMatch.player1_name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {currentMatch.player1_bet_count} bets
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">
                      {currentMatch.player1_odds}x
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {currentMatch.player1_total_points} pts
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <div className="font-medium">
                      {currentMatch.player2_name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {currentMatch.player2_bet_count} bets
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">
                      {currentMatch.player2_odds}x
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {currentMatch.player2_total_points} pts
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Betting Interface */}
          {isBettingOpen && (
            <div className="mt-6 p-4 border rounded-lg bg-muted/30">
              <h4 className="font-semibold mb-4">Place Your Bet</h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="betAmount">Bet Amount (Points)</Label>
                  <Input
                    id="betAmount"
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    placeholder="Enter amount"
                    min="1"
                    max={userBettingPoints}
                  />
                  <div className="text-sm text-muted-foreground mt-1">
                    Available: {userBettingPoints} points
                  </div>
                </div>

                <div>
                  <Label>Select Player</Label>
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant={
                        selectedPlayer === currentMatch.player1_id
                          ? "default"
                          : "outline"
                      }
                      onClick={() => setSelectedPlayer(currentMatch.player1_id)}
                      className="flex-1"
                    >
                      {currentMatch.player1_name}
                    </Button>
                    <Button
                      variant={
                        selectedPlayer === currentMatch.player2_id
                          ? "default"
                          : "outline"
                      }
                      onClick={() => setSelectedPlayer(currentMatch.player2_id)}
                      className="flex-1"
                    >
                      {currentMatch.player2_name}
                    </Button>
                  </div>
                </div>

                <div className="flex items-end">
                  <Button
                    onClick={placeBet}
                    disabled={isLoading || !betAmount || !selectedPlayer}
                    className="w-full"
                  >
                    <Target className="h-4 w-4 mr-2" />
                    Place Bet
                  </Button>
                </div>
              </div>

              {selectedPlayer && betAmount && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-sm">
                    <div className="font-medium">Bet Preview:</div>
                    <div className="text-muted-foreground">
                      {betAmount} points on{" "}
                      {selectedPlayer === currentMatch.player1_id
                        ? currentMatch.player1_name
                        : currentMatch.player2_name}
                    </div>
                    <div className="text-muted-foreground">
                      Potential winnings: {parseInt(betAmount) * 2} points
                    </div>
                    <div className="text-muted-foreground">
                      Stream points bonus:{" "}
                      {Math.floor(parseInt(betAmount) * 0.5)} points
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {!isBettingOpen && currentMatch.status === "betting_closed" && (
            <div className="mt-6 p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="font-medium">Betting Closed</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Match will start in{" "}
                {formatTime(
                  Math.max(0, currentMatch.seconds_until_match_starts)
                )}
              </p>
            </div>
          )}

          {currentMatch.status === "live" && (
            <div className="mt-6 p-4 border rounded-lg bg-green-50 dark:bg-green-900/20">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <span className="font-medium">Match Live</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                The match is currently in progress. Results will be announced
                soon!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Your Betting Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{userBettingPoints}</div>
              <div className="text-sm text-muted-foreground">
                Betting Points
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {userPoints?.stream_points || 0}
              </div>
              <div className="text-sm text-muted-foreground">Stream Points</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">-</div>
              <div className="text-sm text-muted-foreground">Total Bets</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">-</div>
              <div className="text-sm text-muted-foreground">Win Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
