"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { motion } from "framer-motion";
import { MatchStatusDebug } from "@/components/match-status-debug";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Trophy,
  Target,
  Users,
  Settings,
  ExternalLink,
  Copy,
  RefreshCw,
  Monitor,
  Zap,
  CheckCircle,
  AlertCircle,
  Award,
} from "lucide-react";

interface Tournament {
  id: string;
  name: string;
  status: string;
  youtube_video_id?: string;
  stream_url?: string;
  created_by: string;
  created_at: string;
}

interface Match {
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

interface Participant {
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

export default function StreamingControlPage() {
  const params = useParams();
  const { user } = useAuth();
  const tournamentId = params.tournamentId as string;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedPlayer1, setSelectedPlayer1] = useState<string>("");
  const [selectedPlayer2, setSelectedPlayer2] = useState<string>("");
  const [showParticipantSelector, setShowParticipantSelector] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [spectatorCount, setSpectatorCount] = useState(0);
  const [overlayUrl, setOverlayUrl] = useState("");
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [copied, setCopied] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [matchHistory, setMatchHistory] = useState<Match[]>([]);
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);

  // Check if user is admin or tournament creator
  const isAuthorized = useMemo(() => {
    if (!user || !tournament) return false;
    return user.id === tournament.created_by || user.role === "admin";
  }, [user, tournament]);

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

        // Set overlay URL
        const baseUrl = window.location.origin;
        setOverlayUrl(`${baseUrl}/streaming-overlay/${tournamentId}`);
      } catch (error) {
        console.error("Error fetching tournament:", error);
      }
    };

    if (tournamentId) {
      fetchTournament();
    }
  }, [tournamentId]);

  // Fetch matches with proper joins
  const fetchMatches = useCallback(async () => {
    try {
      console.log("Fetching matches for tournament:", tournamentId);

      // First, get all matches
      const { data: matchesData, error: matchesError } = await supabase
        .from("matches")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("created_at", { ascending: false });

      if (matchesError) {
        console.error("Error fetching matches:", matchesError);
        throw matchesError;
      }

      console.log("Raw matches data:", matchesData);

      if (!matchesData || matchesData.length === 0) {
        console.log("No matches found");
        setMatches([]);
        setCurrentMatch(null);
        setMatchHistory([]);
        return;
      }

      // Then, get user data for all players
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
        console.error("Error fetching users for matches:", usersError);
        throw usersError;
      }

      console.log("Users data for matches:", usersData);

      // Create a map for quick lookup
      const userMap = new Map();
      if (usersData) {
        usersData.forEach((user) => userMap.set(user.id, user));
      }

      // Transform matches with player data
      const transformedMatches = matchesData.map((match) => {
        const player1 = userMap.get(match.player1_id);
        const player2 = userMap.get(match.player2_id);

        return {
          ...match,
          player1: player1
            ? {
                id: match.player1_id,
                display_name: player1.display_name,
                avatar_url: player1.avatar_url,
              }
            : undefined,
          player2: player2
            ? {
                id: match.player2_id,
                display_name: player2.display_name,
                avatar_url: player2.avatar_url,
              }
            : undefined,
        };
      });

      console.log("Transformed matches:", transformedMatches);
      setMatches(transformedMatches);

      // Find current match
      const activeMatch = transformedMatches.find(
        (match) => match.status === "in_progress"
      );
      setCurrentMatch(activeMatch || null);

      // Set match history (completed matches)
      const completedMatches = transformedMatches.filter(
        (match) => match.status === "completed"
      );
      setMatchHistory(completedMatches);
    } catch (error) {
      console.error("Error fetching matches:", error);
      setMatches([]);
      setCurrentMatch(null);
      setMatchHistory([]);
    }
  }, [tournamentId]);

  // Fetch participants with proper joins
  const fetchParticipants = useCallback(async () => {
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
        console.error("Error fetching participants:", participantsError);
        throw participantsError;
      }

      console.log("Raw participants data:", participantsData);

      if (!participantsData || participantsData.length === 0) {
        console.log("No participants found");
        setParticipants([]);
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
          ...p,
          user: {
            id: p.user_id,
            display_name: user?.display_name || "Unknown Player",
            avatar_url: user?.avatar_url,
          },
        };
      });

      console.log("Final participants with users:", participantsWithUsers);
      setParticipants(participantsWithUsers);
    } catch (error) {
      console.error("Error fetching participants:", error);
      setParticipants([]);
    }
  }, [tournamentId]);

  // Fetch spectator count
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

  // Initial data fetch
  useEffect(() => {
    if (tournamentId) {
      Promise.all([
        fetchMatches(),
        fetchParticipants(),
        fetchSpectatorCount(),
      ]).finally(() => setIsLoading(false));
    }
  }, [tournamentId, fetchMatches, fetchParticipants, fetchSpectatorCount]);

  // Real-time updates
  useEffect(() => {
    if (!tournamentId) return;

    const channel = supabase
      .channel(`streaming-control-${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        (payload) => {
          console.log("Match change detected in control:", payload);
          // Immediate refresh for better responsiveness
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
        () => {
          fetchSpectatorCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId, fetchMatches, fetchSpectatorCount]);

  // Update match score
  const updateMatchScore = useCallback(
    async (matchId: string, player1Score: number, player2Score: number) => {
      try {
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

        if (error) throw error;
      } catch (error) {
        console.error("Error updating match score:", error);
      }
    },
    []
  );

  // Copy overlay URL
  const copyOverlayUrl = async () => {
    try {
      await navigator.clipboard.writeText(overlayUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Error copying URL:", error);
    }
  };

  // Start a match
  const startMatch = useCallback(
    async (matchId: string) => {
      try {
        const { error } = await supabase
          .from("matches")
          .update({ status: "in_progress" })
          .eq("id", matchId);

        if (error) throw error;

        // Force refresh matches immediately
        setTimeout(() => {
          fetchMatches();
        }, 500);
      } catch (error) {
        console.error("Error starting match:", error);
      }
    },
    [fetchMatches]
  );

  // Stop the current match
  const stopMatch = useCallback(
    async (matchId: string) => {
      try {
        const { error } = await supabase
          .from("matches")
          .update({ status: "completed" })
          .eq("id", matchId);

        if (error) throw error;

        // Force refresh matches immediately
        setTimeout(() => {
          fetchMatches();
        }, 500);
      } catch (error) {
        console.error("Error stopping match:", error);
      }
    },
    [fetchMatches]
  );

  // Create a new match with selected participants
  const createMatchWithParticipants = useCallback(async () => {
    if (!selectedPlayer1 || !selectedPlayer2) {
      alert("Please select both players");
      return;
    }

    if (selectedPlayer1 === selectedPlayer2) {
      alert("Please select different players");
      return;
    }

    try {
      const player1 = participants.find((p) => p.user_id === selectedPlayer1);
      const player2 = participants.find((p) => p.user_id === selectedPlayer2);

      if (!player1 || !player2) {
        alert("Selected players not found");
        return;
      }

      // Get or create a phase for this tournament
      let phaseId = null;
      const { data: existingPhase } = await supabase
        .from("tournament_phases")
        .select("id")
        .eq("tournament_id", tournamentId)
        .eq("phase_type", "elimination")
        .single();

      if (existingPhase) {
        phaseId = existingPhase.id;
      } else {
        const { data: newPhase, error: phaseError } = await supabase
          .from("tournament_phases")
          .insert({
            tournament_id: tournamentId,
            phase_type: "elimination",
            phase_order: 1,
            status: "in_progress",
          })
          .select("id")
          .single();

        if (phaseError) throw new Error("Failed to create tournament phase");
        phaseId = newPhase.id;
      }

      const { error } = await supabase.from("matches").insert({
        tournament_id: tournamentId,
        phase_id: phaseId,
        player1_id: selectedPlayer1,
        player2_id: selectedPlayer2,
        player1_score: 0,
        player2_score: 0,
        status: "in_progress",
        round: 1,
        match_number: matches.length + 1,
        bracket_type: "upper",
      });

      if (error) throw error;

      // Reset selections
      setSelectedPlayer1("");
      setSelectedPlayer2("");
      setShowParticipantSelector(false);

      // Force refresh matches immediately
      setTimeout(() => {
        fetchMatches();
      }, 500);
    } catch (error) {
      console.error("Error creating match:", error);
      alert("Error creating match: " + (error as Error).message);
    }
  }, [
    selectedPlayer1,
    selectedPlayer2,
    participants,
    tournamentId,
    matches.length,
  ]);

  // Reset match scores
  const resetMatchScores = useCallback(async (matchId: string) => {
    try {
      const { error } = await supabase
        .from("matches")
        .update({
          player1_score: 0,
          player2_score: 0,
          status: "in_progress",
        })
        .eq("id", matchId);

      if (error) throw error;
    } catch (error) {
      console.error("Error resetting match scores:", error);
    }
  }, []);

  // Get match winner
  const getMatchWinner = useCallback((match: Match) => {
    if (match.status !== "completed") return null;
    if (match.player1_score > match.player2_score) {
      return match.player1?.display_name || "Player 1";
    } else if (match.player2_score > match.player1_score) {
      return match.player2?.display_name || "Player 2";
    }
    return "Tie";
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading streaming control...</div>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Tournament not found</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You don't have permission to access this streaming control.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Streaming Control</h1>
              <p className="text-muted-foreground">
                Remote control for {tournament.name} streaming overlay
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  tournament.status === "in_progress"
                    ? "destructive"
                    : "secondary"
                }
              >
                {tournament.status === "in_progress"
                  ? "LIVE"
                  : tournament.status}
              </Badge>
              <Button
                onClick={() => setShowAdvancedControls(!showAdvancedControls)}
                variant="outline"
                size="sm"
              >
                <Settings className="h-4 w-4 mr-2" />
                Advanced
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Overlay URL Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                OBS Browser Source URL
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Overlay URL for OBS</Label>
                <div className="flex gap-2">
                  <Input
                    value={overlayUrl}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button onClick={copyOverlayUrl} variant="outline" size="sm">
                    {copied ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Add this URL as a Browser Source in OBS Studio
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>OBS Settings</Label>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>• Width: 1920px</p>
                  <p>• Height: 1080px</p>
                  <p>• Refresh browser when scene becomes active: ✅</p>
                  <p>• Shutdown source when not visible: ❌</p>
                </div>
              </div>

              <Button
                onClick={() => window.open(overlayUrl, "_blank")}
                className="w-full"
                variant="outline"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Preview Overlay
              </Button>
            </CardContent>
          </Card>

          {/* Live Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Live Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <Users className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <p className="text-2xl font-bold">{spectatorCount}</p>
                  <p className="text-sm text-muted-foreground">Spectators</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <Target className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p className="text-2xl font-bold">{matches.length}</p>
                  <p className="text-sm text-muted-foreground">Total Matches</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Current Match:</span>
                  <Badge variant={currentMatch ? "default" : "secondary"}>
                    {currentMatch ? "Active" : "None"}
                  </Badge>
                </div>
                {currentMatch && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium">
                      {currentMatch.player1?.display_name || "Player 1"} vs{" "}
                      {currentMatch.player2?.display_name || "Player 2"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Round {currentMatch.round} • Match{" "}
                      {currentMatch.match_number}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Current Match Control */}
        {currentMatch && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Live Match Control
                <Badge variant="destructive" className="animate-pulse">
                  LIVE
                </Badge>
                <div className="ml-auto flex gap-2">
                  <Button
                    onClick={() => resetMatchScores(currentMatch.id)}
                    variant="outline"
                    size="sm"
                  >
                    Reset Scores
                  </Button>
                  <Button
                    onClick={() => setShowStopConfirm(true)}
                    variant="destructive"
                    size="sm"
                  >
                    Stop Match
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Match Participants Info */}
              <div className="mb-6 p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-3">
                  Current Match Participants:
                </h4>
                <div className="flex items-center justify-center gap-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl mb-2">
                      {currentMatch.player1?.display_name?.charAt(0) || "P"}
                    </div>
                    <p className="font-medium">
                      {currentMatch.player1?.display_name || "Player 1"}
                    </p>
                    <p className="text-sm text-muted-foreground">Player 1</p>
                  </div>
                  <div className="text-2xl font-bold">VS</div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-xl mb-2">
                      {currentMatch.player2?.display_name?.charAt(0) || "P"}
                    </div>
                    <p className="font-medium">
                      {currentMatch.player2?.display_name || "Player 2"}
                    </p>
                    <p className="text-sm text-muted-foreground">Player 2</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Player 1 */}
                <div className="text-center p-6 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <h3 className="text-xl font-bold mb-4">
                    {currentMatch.player1?.display_name || "Player 1"}
                  </h3>
                  <motion.div
                    key={currentMatch.player1_score}
                    initial={{ scale: 1.2, color: "#fbbf24" }}
                    animate={{ scale: 1, color: "#1e40af" }}
                    className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-4"
                  >
                    {currentMatch.player1_score}
                  </motion.div>
                  <div className="flex gap-2 justify-center">
                    <Button
                      onClick={() =>
                        updateMatchScore(
                          currentMatch.id,
                          currentMatch.player1_score + 1,
                          currentMatch.player2_score
                        )
                      }
                      variant="outline"
                      size="sm"
                    >
                      +1
                    </Button>
                    <Button
                      onClick={() =>
                        updateMatchScore(
                          currentMatch.id,
                          currentMatch.player1_score - 1,
                          currentMatch.player2_score
                        )
                      }
                      variant="outline"
                      size="sm"
                    >
                      -1
                    </Button>
                  </div>
                </div>

                {/* Player 2 */}
                <div className="text-center p-6 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-800">
                  <h3 className="text-xl font-bold mb-4">
                    {currentMatch.player2?.display_name || "Player 2"}
                  </h3>
                  <motion.div
                    key={currentMatch.player2_score}
                    initial={{ scale: 1.2, color: "#fbbf24" }}
                    animate={{ scale: 1, color: "#dc2626" }}
                    className="text-4xl font-bold text-red-600 dark:text-red-400 mb-4"
                  >
                    {currentMatch.player2_score}
                  </motion.div>
                  <div className="flex gap-2 justify-center">
                    <Button
                      onClick={() =>
                        updateMatchScore(
                          currentMatch.id,
                          currentMatch.player1_score,
                          currentMatch.player2_score + 1
                        )
                      }
                      variant="outline"
                      size="sm"
                    >
                      +1
                    </Button>
                    <Button
                      onClick={() =>
                        updateMatchScore(
                          currentMatch.id,
                          currentMatch.player1_score,
                          currentMatch.player2_score - 1
                        )
                      }
                      variant="outline"
                      size="sm"
                    >
                      -1
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Participant Selector */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Quick Match Creator
              <Button
                onClick={() =>
                  setShowParticipantSelector(!showParticipantSelector)
                }
                variant="ghost"
                size="sm"
                className="ml-auto"
              >
                {showParticipantSelector ? "Hide" : "Show"} Selector
              </Button>
            </CardTitle>
          </CardHeader>
          {showParticipantSelector && (
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Player 1 Selection */}
                <div className="space-y-2">
                  <Label>Player 1</Label>
                  <Select
                    value={selectedPlayer1}
                    onValueChange={setSelectedPlayer1}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Player 1" />
                    </SelectTrigger>
                    <SelectContent>
                      {participants.map((participant) => (
                        <SelectItem
                          key={participant.user_id}
                          value={participant.user_id}
                        >
                          {participant.user.display_name} (Seed{" "}
                          {participant.seed})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Player 2 Selection */}
                <div className="space-y-2">
                  <Label>Player 2</Label>
                  <Select
                    value={selectedPlayer2}
                    onValueChange={setSelectedPlayer2}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Player 2" />
                    </SelectTrigger>
                    <SelectContent>
                      {participants.map((participant) => (
                        <SelectItem
                          key={participant.user_id}
                          value={participant.user_id}
                        >
                          {participant.user.display_name} (Seed{" "}
                          {participant.seed})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={createMatchWithParticipants}
                  disabled={!selectedPlayer1 || !selectedPlayer2}
                  className="flex-1"
                >
                  Create & Start Match
                </Button>
                <Button
                  onClick={() => {
                    setSelectedPlayer1("");
                    setSelectedPlayer2("");
                  }}
                  variant="outline"
                >
                  Clear Selection
                </Button>
              </div>

              {/* Selected Players Preview */}
              {selectedPlayer1 && selectedPlayer2 && (
                <div className="p-3 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Match Preview:</h4>
                  <div className="flex items-center justify-center gap-4">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                        {participants
                          .find((p) => p.user_id === selectedPlayer1)
                          ?.user.display_name?.charAt(0) || "P"}
                      </div>
                      <p className="text-sm font-medium mt-1">
                        {participants.find((p) => p.user_id === selectedPlayer1)
                          ?.user.display_name || "Player 1"}
                      </p>
                    </div>
                    <div className="text-2xl font-bold">VS</div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white font-bold">
                        {participants
                          .find((p) => p.user_id === selectedPlayer2)
                          ?.user.display_name?.charAt(0) || "P"}
                      </div>
                      <p className="text-sm font-medium mt-1">
                        {participants.find((p) => p.user_id === selectedPlayer2)
                          ?.user.display_name || "Player 2"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Match History */}
        {matchHistory.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Match History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {matchHistory.slice(0, 5).map((match) => (
                  <div
                    key={match.id}
                    className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">
                          {match.player1?.display_name || "Player 1"} vs{" "}
                          {match.player2?.display_name || "Player 2"}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Round {match.round} • Match {match.match_number}
                        </p>
                        <p className="text-sm font-medium">
                          Final Score: {match.player1_score} -{" "}
                          {match.player2_score}
                        </p>
                        <p className="text-sm text-green-600 dark:text-green-400">
                          Winner: {getMatchWinner(match)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="default">Completed</Badge>
                        <Button
                          onClick={() => resetMatchScores(match.id)}
                          variant="outline"
                          size="sm"
                        >
                          Reset & Restart
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Debug Section */}
        <MatchStatusDebug tournamentId={tournamentId} />

        {/* Match List */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Tournament Matches
              <Button
                onClick={fetchMatches}
                variant="ghost"
                size="sm"
                className="ml-auto"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {matches.map((match) => (
                <div
                  key={match.id}
                  className={`p-4 rounded-lg border ${
                    match.status === "in_progress"
                      ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                      : match.status === "completed"
                      ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                      : "bg-muted"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">
                        {match.player1?.display_name || "Player 1"} vs{" "}
                        {match.player2?.display_name || "Player 2"}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Round {match.round} • Match {match.match_number}
                      </p>
                      {match.status !== "pending" && (
                        <p className="text-sm font-medium">
                          Score: {match.player1_score} - {match.player2_score}
                        </p>
                      )}
                      {match.status === "completed" && (
                        <p className="text-sm text-green-600 dark:text-green-400">
                          Winner: {getMatchWinner(match)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          match.status === "in_progress"
                            ? "destructive"
                            : match.status === "completed"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {match.status}
                      </Badge>
                      {match.status === "pending" && (
                        <Button onClick={() => startMatch(match.id)} size="sm">
                          Start Match
                        </Button>
                      )}
                      {match.status === "completed" && (
                        <Button
                          onClick={() => resetMatchScores(match.id)}
                          variant="outline"
                          size="sm"
                        >
                          Reset
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Stop Match Confirmation Dialog */}
        <Dialog open={showStopConfirm} onOpenChange={setShowStopConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Stop Current Match?</DialogTitle>
              <DialogDescription>
                This will end the current match and mark it as completed. The
                overlay will no longer show this match.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowStopConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  stopMatch(currentMatch!.id);
                  setShowStopConfirm(false);
                }}
              >
                Stop Match
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
