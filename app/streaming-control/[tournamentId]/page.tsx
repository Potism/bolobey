"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
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
  Trophy,
  Target,
  Users,
  Play,
  Settings,
  ExternalLink,
  Copy,
  RefreshCw,
  Eye,
  EyeOff,
  Monitor,
  Zap,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface Tournament {
  id: string;
  name: string;
  status: string;
  youtube_video_id?: string;
  stream_url?: string;
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
  player1_name: string;
  player2_name: string;
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
  user:
    | {
        id: string;
        display_name: string;
        avatar_url?: string;
      }
    | {
        id: string;
        display_name: string;
        avatar_url?: string;
      }[];
  seed: number;
  joined_at: string;
}

export default function StreamingControlPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const tournamentId = params.tournamentId as string;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [spectatorCount, setSpectatorCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [overlayUrl, setOverlayUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedPlayer1, setSelectedPlayer1] = useState<string>("");
  const [selectedPlayer2, setSelectedPlayer2] = useState<string>("");
  const [showParticipantSelector, setShowParticipantSelector] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);

  // Helper function to safely get display name from participant
  const getParticipantDisplayName = (participant: Participant): string => {
    if (Array.isArray(participant.user)) {
      return participant.user[0]?.display_name || "Unknown Player";
    }
    return participant.user?.display_name || "Unknown Player";
  };

  // Check if user is admin
  useEffect(() => {
    if (user && tournament) {
      // You can add admin check logic here
      // For now, we'll assume any authenticated user can access
    }
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

  // Fetch matches
  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const { data, error } = await supabase
          .from("matches")
          .select("*")
          .eq("tournament_id", tournamentId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setMatches(data || []);

        // Find current match
        const activeMatch = data?.find(
          (match) => match.status === "in_progress"
        );
        setCurrentMatch(activeMatch || null);
      } catch (error) {
        console.error("Error fetching matches:", error);
      }
    };

    if (tournamentId) {
      fetchMatches();
      setIsLoading(false);
    }
  }, [tournamentId]);

  // Fetch participants
  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        const { data, error } = await supabase
          .from("tournament_participants")
          .select(
            `
            id,
            user_id,
            seed,
            joined_at,
            user:users(id, display_name, avatar_url)
          `
          )
          .eq("tournament_id", tournamentId)
          .order("seed", { ascending: true });

        if (error) throw error;
        setParticipants(data || []);
      } catch (error) {
        console.error("Error fetching participants:", error);
      }
    };

    if (tournamentId) {
      fetchParticipants();
    }
  }, [tournamentId]);

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel(`tournament-${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => {
          // Refresh matches
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
  }, [tournamentId]);

  const fetchMatches = async () => {
    try {
      const { data, error } = await supabase
        .from("matches")
        .select(
          `
          *,
          player1:users!matches_player1_id_fkey(id, display_name, avatar_url),
          player2:users!matches_player2_id_fkey(id, display_name, avatar_url)
        `
        )
        .eq("tournament_id", tournamentId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Transform the data to include player names
      const transformedData =
        data?.map((match) => ({
          ...match,
          player1_name: match.player1?.display_name || "Unknown Player",
          player2_name: match.player2?.display_name || "Unknown Player",
        })) || [];

      setMatches(transformedData);

      const activeMatch = transformedData.find(
        (match) => match.status === "in_progress"
      );
      setCurrentMatch(activeMatch || null);
    } catch (error) {
      console.error("Error fetching matches:", error);
    }
  };

  const fetchSpectatorCount = async () => {
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
  };

  // Update match score
  const updateMatchScore = async (
    matchId: string,
    player1Score: number,
    player2Score: number
  ) => {
    if (isUpdating) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("matches")
        .update({
          player1_score: player1Score,
          player2_score: player2Score,
          status:
            player1Score >= 3 || player2Score >= 3
              ? "completed"
              : "in_progress",
        })
        .eq("id", matchId);

      if (error) throw error;

      // Refresh matches
      await fetchMatches();
    } catch (error) {
      console.error("Error updating match score:", error);
    } finally {
      setIsUpdating(false);
    }
  };

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
  const startMatch = async (matchId: string) => {
    try {
      console.log("Starting match:", matchId);

      const { error } = await supabase
        .from("matches")
        .update({ status: "in_progress" })
        .eq("id", matchId);

      if (error) {
        console.error("Error starting match:", error);
        throw error;
      }

      console.log("Match started successfully");
      await fetchMatches();

      // Force refresh the current match detection
      setTimeout(() => {
        fetchMatches();
      }, 1000);
    } catch (error) {
      console.error("Error starting match:", error);
    }
  };

  // Stop the current match
  const stopMatch = async (matchId: string) => {
    try {
      console.log("Stopping match:", matchId);

      const { error } = await supabase
        .from("matches")
        .update({ status: "completed" })
        .eq("id", matchId);

      if (error) {
        console.error("Error stopping match:", error);
        throw error;
      }

      console.log("Match stopped successfully");
      await fetchMatches();

      // Force refresh the current match detection
      setTimeout(() => {
        fetchMatches();
      }, 1000);
    } catch (error) {
      console.error("Error stopping match:", error);
    }
  };

  // Create a new match with selected participants
  const createMatchWithParticipants = async () => {
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

      // Get player names using helper function
      const player1Name = getParticipantDisplayName(player1);
      const player2Name = getParticipantDisplayName(player2);

      // First, let's get or create a phase for this tournament
      let phaseId = null;

      // Try to get an existing phase
      const { data: existingPhase } = await supabase
        .from("tournament_phases")
        .select("id")
        .eq("tournament_id", tournamentId)
        .eq("phase_type", "elimination")
        .single();

      if (existingPhase) {
        phaseId = existingPhase.id;
      } else {
        // Create a new phase if none exists
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

        if (phaseError) {
          console.error("Error creating phase:", phaseError);
          throw new Error("Failed to create tournament phase");
        }

        phaseId = newPhase.id;
      }

      const { data, error } = await supabase
        .from("matches")
        .insert({
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
        })
        .select()
        .single();

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      console.log("Match created successfully:", data);
      await fetchMatches();

      // Reset selections
      setSelectedPlayer1("");
      setSelectedPlayer2("");
      setShowParticipantSelector(false);
    } catch (error) {
      console.error("Error creating match:", error);
      alert("Error creating match: " + (error as Error).message);
    }
  };

  // Update match participants
  const updateMatchParticipants = async (
    matchId: string,
    player1Id: string,
    player2Id: string
  ) => {
    try {
      const player1 = participants.find((p) => p.user_id === player1Id);
      const player2 = participants.find((p) => p.user_id === player2Id);

      if (!player1 || !player2) {
        alert("Selected players not found");
        return;
      }

      // Get player names using helper function
      const player1Name = getParticipantDisplayName(player1);
      const player2Name = getParticipantDisplayName(player2);

      const { error } = await supabase
        .from("matches")
        .update({
          player1_id: player1Id,
          player2_id: player2Id,
          player1_name: player1Name,
          player2_name: player2Name,
          player1_score: 0,
          player2_score: 0,
        })
        .eq("id", matchId);

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      console.log("Match participants updated successfully");
      await fetchMatches();
    } catch (error) {
      console.error("Error updating match participants:", error);
      alert("Error updating match participants: " + (error as Error).message);
    }
  };

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
                      {currentMatch.player1_name} vs {currentMatch.player2_name}
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
                <Button
                  onClick={() => setShowStopConfirm(true)}
                  variant="destructive"
                  size="sm"
                  className="ml-auto"
                >
                  Stop Match
                </Button>
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
                      {currentMatch.player1_name
                        ? currentMatch.player1_name.charAt(0)
                        : "P"}
                    </div>
                    <p className="font-medium">
                      {currentMatch.player1_name || "Player 1"}
                    </p>
                    <p className="text-sm text-muted-foreground">Player 1</p>
                  </div>
                  <div className="text-2xl font-bold">VS</div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-xl mb-2">
                      {currentMatch.player2_name
                        ? currentMatch.player2_name.charAt(0)
                        : "P"}
                    </div>
                    <p className="font-medium">
                      {currentMatch.player2_name || "Player 2"}
                    </p>
                    <p className="text-sm text-muted-foreground">Player 2</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Player 1 */}
                <div className="text-center p-6 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <h3 className="text-xl font-bold mb-4">
                    {currentMatch.player1_name}
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
                          Math.max(0, currentMatch.player1_score - 1),
                          currentMatch.player2_score
                        )
                      }
                      disabled={isUpdating}
                      variant="outline"
                      size="sm"
                    >
                      -1
                    </Button>
                    <Button
                      onClick={() =>
                        updateMatchScore(
                          currentMatch.id,
                          currentMatch.player1_score + 1,
                          currentMatch.player2_score
                        )
                      }
                      disabled={isUpdating}
                      size="sm"
                    >
                      +1
                    </Button>
                  </div>
                </div>

                {/* Player 2 */}
                <div className="text-center p-6 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-800">
                  <h3 className="text-xl font-bold mb-4">
                    {currentMatch.player2_name}
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
                          Math.max(0, currentMatch.player2_score - 1)
                        )
                      }
                      disabled={isUpdating}
                      variant="outline"
                      size="sm"
                    >
                      -1
                    </Button>
                    <Button
                      onClick={() =>
                        updateMatchScore(
                          currentMatch.id,
                          currentMatch.player1_score,
                          currentMatch.player2_score + 1
                        )
                      }
                      disabled={isUpdating}
                      size="sm"
                    >
                      +1
                    </Button>
                  </div>
                </div>
              </div>

              {/* Winner Announcement */}
              {(currentMatch.player1_score >= 3 ||
                currentMatch.player2_score >= 3) && (
                <div className="text-center mt-6 p-4 bg-green-50 dark:bg-green-950/20 rounded-xl border border-green-200 dark:border-green-800">
                  <Trophy className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                  <h3 className="text-xl font-bold text-green-600 dark:text-green-400">
                    {currentMatch.player1_score >= 3
                      ? currentMatch.player1_name
                      : currentMatch.player2_name}{" "}
                    WINS!
                  </h3>
                </div>
              )}
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
                  <select
                    value={selectedPlayer1}
                    onChange={(e) => setSelectedPlayer1(e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">Select Player 1</option>
                    {participants.map((participant) => (
                      <option
                        key={participant.user_id}
                        value={participant.user_id}
                      >
                        {participant.user.display_name} (Seed {participant.seed}
                        )
                      </option>
                    ))}
                  </select>
                </div>

                {/* Player 2 Selection */}
                <div className="space-y-2">
                  <Label>Player 2</Label>
                  <select
                    value={selectedPlayer2}
                    onChange={(e) => setSelectedPlayer2(e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">Select Player 2</option>
                    {participants.map((participant) => (
                      <option
                        key={participant.user_id}
                        value={participant.user_id}
                      >
                        {participant.user.display_name} (Seed {participant.seed}
                        )
                      </option>
                    ))}
                  </select>
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
                        {match.player1_name} vs {match.player2_name}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Round {match.round} • Match {match.match_number}
                      </p>
                      {match.status !== "pending" && (
                        <p className="text-sm font-medium">
                          Score: {match.player1_score} - {match.player2_score}
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
