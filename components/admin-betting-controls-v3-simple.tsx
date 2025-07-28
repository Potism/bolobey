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
import {
  Play,
  Square,
  Target,
  AlertCircle,
  CheckCircle,
  Users,
  Clock,
  Trophy,
  TrendingUp,
  Activity,
  RefreshCw,
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
  player1_bet_count: number;
  player1_total_points: number;
  player2_bet_count: number;
  player2_total_points: number;
  player1_odds: number;
  player2_odds: number;
}

interface TournamentParticipant {
  id: string;
  user_id: string;
  display_name: string;
}

export function AdminBettingControlsV3Simple({
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
  const [bettingDuration, setBettingDuration] = useState<string>("5");
  const [streamUrl, setStreamUrl] = useState<string>("");
  const [streamKey, setStreamKey] = useState<string>("");

  // Check if user is admin
  const isAdmin = user?.role === "admin";

  // Fetch current betting match
  const fetchCurrentMatch = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("current_betting_matches_v3")
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

      setCurrentMatch(data);
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
          user:users!tournament_participants_user_id_fkey(display_name)
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
          display_name: p.user.display_name,
        })) || [];

      setParticipants(formattedParticipants);
    } catch (error) {
      console.error("Error fetching participants:", error);
    }
  }, [tournamentId]);

  // Load initial data
  useEffect(() => {
    fetchCurrentMatch();
    fetchParticipants();
  }, [fetchCurrentMatch, fetchParticipants]);

  // Create new betting match
  const createBettingMatch = async () => {
    if (!player1Id || !player2Id || !bettingDuration) {
      setError("Please fill in all required fields");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const bettingDurationMinutes = parseInt(bettingDuration);
      const now = new Date();
      const bettingEndTime = new Date(
        now.getTime() + bettingDurationMinutes * 60000
      );
      const matchStartTime = new Date(bettingEndTime.getTime() + 60000); // 1 minute after betting ends

      const { data, error } = await supabase
        .from("betting_matches")
        .insert({
          tournament_id: tournamentId,
          player1_id: player1Id,
          player2_id: player2Id,
          betting_start_time: now.toISOString(),
          betting_end_time: bettingEndTime.toISOString(),
          match_start_time: matchStartTime.toISOString(),
          status: "betting_open",
          stream_url: streamUrl || null,
          stream_key: streamKey || null,
        })
        .select()
        .single();

      if (error) {
        setError(`Error creating match: ${error.message}`);
        return;
      }

      setSuccess("Betting match created successfully!");
      setCurrentMatch(data);

      // Reset form
      setPlayer1Id("");
      setPlayer2Id("");
      setBettingDuration("5");
      setStreamUrl("");
      setStreamKey("");

      // Refresh data
      setTimeout(() => {
        fetchCurrentMatch();
      }, 1000);
    } catch (error) {
      setError("Failed to create betting match");
      console.error("Error creating match:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Set match winner
  const setMatchWinner = async (matchId: string, winnerId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from("betting_matches")
        .update({
          winner_id: winnerId,
          status: "completed",
        })
        .eq("id", matchId);

      if (error) {
        setError(`Error setting winner: ${error.message}`);
        return;
      }

      setSuccess(
        "Winner set successfully! Payouts will be processed automatically."
      );

      // Refresh data
      setTimeout(() => {
        fetchCurrentMatch();
      }, 1000);
    } catch (error) {
      setError("Failed to set winner");
      console.error("Error setting winner:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete betting match
  const deleteBettingMatch = async (matchId: string) => {
    if (!confirm("Are you sure you want to delete this betting match?")) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from("betting_matches")
        .delete()
        .eq("id", matchId);

      if (error) {
        setError(`Error deleting match: ${error.message}`);
        return;
      }

      setSuccess("Betting match deleted successfully!");
      setCurrentMatch(null);
    } catch (error) {
      setError("Failed to delete betting match");
      console.error("Error deleting match:", error);
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

  if (!isAdmin) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Admin privileges required to manage betting matches.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">LIVE BETTING ADMIN V3</h2>
          <p className="text-muted-foreground">
            Manage betting matches and monitor activity
          </p>
        </div>
        <Button
          onClick={() => {
            fetchCurrentMatch();
            fetchParticipants();
          }}
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
      {currentMatch && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Current Betting Match
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Match Details</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Players:</span>
                    <span className="font-medium">
                      {currentMatch.player1_name} vs {currentMatch.player2_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <Badge
                      variant={
                        currentMatch.status === "betting_open"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {currentMatch.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Bets:</span>
                    <span>{currentMatch.total_bets}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Wagered:</span>
                    <span>{currentMatch.total_points_wagered} points</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Betting Statistics</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>{currentMatch.player1_name}:</span>
                    <span>
                      {currentMatch.player1_bet_count} bets (
                      {currentMatch.player1_total_points} pts)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{currentMatch.player2_name}:</span>
                    <span>
                      {currentMatch.player2_bet_count} bets (
                      {currentMatch.player2_total_points} pts)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Player 1 Odds:</span>
                    <span>{currentMatch.player1_odds}x</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Player 2 Odds:</span>
                    <span>{currentMatch.player2_odds}x</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Match Actions */}
            <div className="flex gap-2 mt-4">
              {currentMatch.status === "betting_open" && (
                <>
                  <Button
                    onClick={() =>
                      setMatchWinner(currentMatch.id, currentMatch.player1_id)
                    }
                    disabled={isLoading}
                    variant="outline"
                  >
                    <Trophy className="h-4 w-4 mr-2" />
                    {currentMatch.player1_name} Wins
                  </Button>
                  <Button
                    onClick={() =>
                      setMatchWinner(currentMatch.id, currentMatch.player2_id)
                    }
                    disabled={isLoading}
                    variant="outline"
                  >
                    <Trophy className="h-4 w-4 mr-2" />
                    {currentMatch.player2_name} Wins
                  </Button>
                </>
              )}
              <Button
                onClick={() => deleteBettingMatch(currentMatch.id)}
                disabled={isLoading}
                variant="destructive"
              >
                <Square className="h-4 w-4 mr-2" />
                Delete Match
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create New Match */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Create New Betting Match
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="player1">Player 1</Label>
                <Select value={player1Id} onValueChange={setPlayer1Id}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Player 1" />
                  </SelectTrigger>
                  <SelectContent>
                    {participants.map((participant) => (
                      <SelectItem
                        key={participant.id}
                        value={participant.user_id}
                      >
                        {participant.display_name}
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
                        key={participant.id}
                        value={participant.user_id}
                      >
                        {participant.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="bettingDuration">
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
                    <SelectItem value="1">1 minute</SelectItem>
                    <SelectItem value="3">3 minutes</SelectItem>
                    <SelectItem value="5">5 minutes</SelectItem>
                    <SelectItem value="10">10 minutes</SelectItem>
                    <SelectItem value="15">15 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="streamUrl">Stream URL (Optional)</Label>
                <Input
                  id="streamUrl"
                  value={streamUrl}
                  onChange={(e) => setStreamUrl(e.target.value)}
                  placeholder="rtmp://live-api-s.facebook.com/rtmp/"
                />
              </div>

              <div>
                <Label htmlFor="streamKey">Stream Key (Optional)</Label>
                <Input
                  id="streamKey"
                  value={streamKey}
                  onChange={(e) => setStreamKey(e.target.value)}
                  placeholder="Enter stream key"
                />
              </div>

              <Button
                onClick={createBettingMatch}
                disabled={isLoading || !player1Id || !player2Id}
                className="w-full"
              >
                <Play className="h-4 w-4 mr-2" />
                Create Betting Match
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tournament Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Tournament Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{participants.length}</div>
              <div className="text-sm text-muted-foreground">Participants</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {currentMatch ? "1" : "0"}
              </div>
              <div className="text-sm text-muted-foreground">
                Active Matches
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {currentMatch?.total_bets || 0}
              </div>
              <div className="text-sm text-muted-foreground">Total Bets</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {currentMatch?.total_points_wagered || 0}
              </div>
              <div className="text-sm text-muted-foreground">
                Points Wagered
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
