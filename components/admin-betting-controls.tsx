"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  stream_key?: string;
}

interface TournamentParticipant {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url?: string;
}

export function AdminBettingControls({
  tournamentId,
}: {
  tournamentId: string;
}) {
  const { user } = useAuth();
  const [currentMatch, setCurrentMatch] = useState<BettingMatch | null>(null);
  const [participants, setParticipants] = useState<TournamentParticipant[]>([]);
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

  // Enhanced match statistics
  const [matchStats, setMatchStats] = useState<{
    totalBets: number;
    totalPoints: number;
    player1Bets: number;
    player2Bets: number;
    player1Points: number;
    player2Points: number;
  } | null>(null);

  // Check if user is admin
  const isAdmin = user?.role === "admin";

  // Fetch current betting match
  const fetchCurrentMatch = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("current_betting_matches")
        .select("*")
        .eq("tournament_id", tournamentId)
        .in("status", ["pending", "betting_open", "betting_closed", "live"])
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching current match:", error);
        return;
      }

      setCurrentMatch(data || null);
    } catch (error) {
      console.error("Error fetching current match:", error);
    }
  }, [tournamentId]);

  // Fetch tournament participants
  const fetchParticipants = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("tournament_participants")
        .select(
          `
          id,
          user_id,
          user:users(display_name, avatar_url)
        `
        )
        .eq("tournament_id", tournamentId);

      if (error) {
        console.error("Error fetching participants:", error);
        return;
      }

      const formattedParticipants =
        data?.map((p) => ({
          id: p.id,
          user_id: p.user_id,
          display_name: p.user?.display_name || "Unknown",
          avatar_url: p.user?.avatar_url,
        })) || [];

      setParticipants(formattedParticipants);
    } catch (error) {
      console.error("Error fetching participants:", error);
    }
  }, [tournamentId]);

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

      // Refresh current match
      await fetchCurrentMatch();
    } catch (error) {
      setError("Failed to create betting match");
    } finally {
      setIsLoading(false);
    }
  }, [
    tournamentId,
    player1Id,
    player2Id,
    bettingDuration,
    streamUrl,
    streamKey,
    fetchCurrentMatch,
  ]);

  // Update match status
  const updateMatchStatus = useCallback(
    async (status: string) => {
      if (!currentMatch) return;

      setIsLoading(true);
      setError(null);
      setSuccess(null);

      try {
        const { error } = await supabase
          .from("betting_matches")
          .update({ status })
          .eq("id", currentMatch.id);

        if (error) {
          setError(error.message);
          return;
        }

        setSuccess(`Match status updated to ${status}`);
        await fetchCurrentMatch();
      } catch (error) {
        setError("Failed to update match status");
      } finally {
        setIsLoading(false);
      }
    },
    [currentMatch, fetchCurrentMatch]
  );

  // Set match winner
  const setMatchWinner = useCallback(
    async (winnerId: string) => {
      if (!currentMatch) return;

      setIsLoading(true);
      setError(null);
      setSuccess(null);

      try {
        // Update match with winner
        const { error: matchError } = await supabase
          .from("betting_matches")
          .update({
            winner_id: winnerId,
            status: "completed",
          })
          .eq("id", currentMatch.id);

        if (matchError) {
          setError(matchError.message);
          return;
        }

        // Update all bets with results
        const { data: bets, error: betsError } = await supabase
          .from("user_bets")
          .select("*")
          .eq("match_id", currentMatch.id);

        if (betsError) {
          setError(betsError.message);
          return;
        }

        // Process each bet
        for (const bet of bets || []) {
          const isWinner = bet.bet_on_player_id === winnerId;
          const newStatus = isWinner ? "won" : "lost";
          const pointsChange = isWinner ? bet.potential_winnings : 0;

          // Update bet status
          await supabase
            .from("user_bets")
            .update({ status: newStatus })
            .eq("id", bet.id);

          // Award points to winners
          if (isWinner) {
            await supabase.from("stream_points").insert({
              user_id: bet.user_id,
              points: pointsChange,
              transaction_type: "bet_won",
              description: `Won bet on match ${currentMatch.id}`,
              reference_id: bet.id,
              reference_type: "bet",
            });
          }
        }

        setSuccess("Match completed and points distributed!");
        await fetchCurrentMatch();
      } catch (error) {
        setError("Failed to complete match");
      } finally {
        setIsLoading(false);
      }
    },
    [currentMatch, fetchCurrentMatch]
  );

  // Fetch match statistics
  const fetchMatchStats = useCallback(async () => {
    if (!currentMatch) return;

    try {
      const { data, error } = await supabase
        .from("user_bets")
        .select("bet_on_player_id, points_wagered")
        .eq("match_id", currentMatch.id);

      if (error) {
        console.error("Error fetching match stats:", error);
        return;
      }

      const stats = {
        totalBets: data.length,
        totalPoints: 0,
        player1Bets: 0,
        player2Bets: 0,
        player1Points: 0,
        player2Points: 0,
      };

      data.forEach((bet) => {
        stats.totalPoints += bet.points_wagered;
        if (bet.bet_on_player_id === currentMatch.player1_id) {
          stats.player1Bets++;
          stats.player1Points += bet.points_wagered;
        } else {
          stats.player2Bets++;
          stats.player2Points += bet.points_wagered;
        }
      });

      setMatchStats(stats);
    } catch (error) {
      console.error("Error fetching match stats:", error);
    }
  }, [currentMatch]);

  // Get player initials
  const getInitials = useCallback((name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, []);

  // Load data on mount
  useEffect(() => {
    fetchCurrentMatch();
    fetchParticipants();
  }, [fetchCurrentMatch, fetchParticipants]);

  useEffect(() => {
    fetchMatchStats();
  }, [currentMatch?.id]);

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Admin Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You need admin privileges to access betting controls
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Match Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Current Betting Match
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentMatch ? (
            <div className="space-y-4">
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
                  <Badge variant="secondary">
                    {currentMatch.status.toUpperCase()}
                  </Badge>
                  <div className="text-sm text-muted-foreground mt-1">
                    {currentMatch.total_bets} bets •{" "}
                    {currentMatch.total_points_wagered} points
                  </div>
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

              {/* Status Controls */}
              <div className="grid grid-cols-2 gap-2">
                {currentMatch.status === "pending" && (
                  <Button
                    onClick={() => updateMatchStatus("betting_open")}
                    disabled={isLoading}
                    className="w-full"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Open Betting
                  </Button>
                )}

                {currentMatch.status === "betting_open" && (
                  <Button
                    onClick={() => updateMatchStatus("betting_closed")}
                    disabled={isLoading}
                    variant="destructive"
                    className="w-full"
                  >
                    <Square className="h-4 w-4 mr-2" />
                    Close Betting
                  </Button>
                )}

                {currentMatch.status === "betting_closed" && (
                  <Button
                    onClick={() => updateMatchStatus("live")}
                    disabled={isLoading}
                    className="w-full"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Match
                  </Button>
                )}

                {currentMatch.status === "live" && (
                  <div className="col-span-2 space-y-2">
                    <p className="text-sm font-medium">Set Winner:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={() => setMatchWinner(currentMatch.player1_id)}
                        disabled={isLoading}
                        variant="outline"
                        className="w-full"
                      >
                        {currentMatch.player1_name} Won
                      </Button>
                      <Button
                        onClick={() => setMatchWinner(currentMatch.player2_id)}
                        disabled={isLoading}
                        variant="outline"
                        className="w-full"
                      >
                        {currentMatch.player2_name} Won
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No active betting match</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Match Statistics */}
      {currentMatch && matchStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Match Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Total Bets</p>
                <p className="text-2xl font-bold">{matchStats.totalBets}</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Total Points</p>
                <p className="text-2xl font-bold text-green-600">
                  {matchStats.totalPoints}
                </p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  {currentMatch.player1_name}
                </p>
                <p className="text-lg font-bold">
                  {matchStats.player1Bets} bets
                </p>
                <p className="text-sm text-muted-foreground">
                  {matchStats.player1Points} points
                </p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  {currentMatch.player2_name}
                </p>
                <p className="text-lg font-bold">
                  {matchStats.player2Bets} bets
                </p>
                <p className="text-sm text-muted-foreground">
                  {matchStats.player2Points} points
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create New Match */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Create New Betting Match
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="player1">Player 1</Label>
                <Select value={player1Id} onValueChange={setPlayer1Id}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Player 1" />
                  </SelectTrigger>
                  <SelectContent>
                    {participants.map((participant) => (
                      <SelectItem
                        key={participant.user_id}
                        value={participant.user_id}
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

              <div>
                <Label htmlFor="player2">Player 2</Label>
                <Select value={player2Id} onValueChange={setPlayer2Id}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Player 2" />
                  </SelectTrigger>
                  <SelectContent>
                    {participants.map((participant) => (
                      <SelectItem
                        key={participant.user_id}
                        value={participant.user_id}
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="betting-duration">
                  Betting Duration (minutes)
                </Label>
                <Select
                  value={bettingDuration}
                  onValueChange={setBettingDuration}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 minutes</SelectItem>
                    <SelectItem value="5">5 minutes</SelectItem>
                    <SelectItem value="10">10 minutes</SelectItem>
                    <SelectItem value="15">15 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="stream-url">Stream URL (optional)</Label>
                <Input
                  id="stream-url"
                  value={streamUrl}
                  onChange={(e) => setStreamUrl(e.target.value)}
                  placeholder="rtmp://live-api-s.facebook.com/rtmp/"
                />
              </div>
              <div>
                <Label htmlFor="stream-key">
                  Facebook Stream Key (optional)
                </Label>
                <Input
                  id="stream-key"
                  value={streamKey}
                  onChange={(e) => setStreamKey(e.target.value)}
                  placeholder="FB-1390865243047660-0-Ab08nGnqPJjstViKw7tQpieS"
                  type="password"
                />
              </div>
            </div>

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

            <Button
              onClick={createBettingMatch}
              disabled={isLoading || !player1Id || !player2Id}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Creating Match...
                </>
              ) : (
                <>
                  <Target className="h-4 w-4 mr-2" />
                  Create Betting Match
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
