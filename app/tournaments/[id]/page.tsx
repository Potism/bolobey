"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Navigation } from "@/components/navigation";
import { LiveTournamentDashboard } from "@/components/live-tournament-dashboard";
import { TournamentChat } from "@/components/tournament-chat";
import { EnhancedBracket } from "@/components/enhanced-bracket";
import { MatchScoring } from "@/components/match-scoring";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Trophy,
  Users,
  Calendar,
  Settings,
  Eye,
  MessageCircle,
  BarChart3,
  Zap,
  Lock,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

interface Tournament {
  id: string;
  name: string;
  description: string;
  start_date: string;
  registration_deadline: string;
  max_participants: number;
  status: string;
  format: string;
  current_phase: string;
  created_by: string;
  winner_id?: string;
  created_at: string;
  updated_at: string;
}

interface Match {
  id: string;
  tournament_id: string;
  player1_id: string;
  player2_id: string;
  player1_score: number;
  player2_score: number;
  status: string;
  round: number;
  match_number: number;
  winner_id?: string;
  start_time?: string;
  end_time?: string;
}

interface Participant {
  id: string;
  user_id: string;
  tournament_id: string;
  username: string;
  avatar_url?: string;
  created_at: string;
}

export default function TournamentPage() {
  const params = useParams();
  const tournamentId = params.id as string;
  const supabaseClient = supabase;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [currentUser, setCurrentUser] = useState<unknown>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    fetchTournamentData();
    fetchCurrentUser();
  }, [tournamentId]);

  const fetchCurrentUser = async () => {
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    setCurrentUser(user);
  };

  const fetchTournamentData = async () => {
    try {
      setLoading(true);

      // Fetch tournament details
      const { data: tournamentData, error: tournamentError } =
        await supabaseClient
          .from("tournaments")
          .select("*")
          .eq("id", tournamentId)
          .single();

      if (tournamentError) throw tournamentError;
      setTournament(tournamentData);

      // Fetch participants
      const { data: participantsData, error: participantsError } =
        await supabaseClient
          .from("tournament_participants")
          .select(
            `
          *,
          users:user_id(display_name, avatar_url)
        `
          )
          .eq("tournament_id", tournamentId);

      if (participantsError) {
        console.warn(
          "No participants found for tournament:",
          participantsError
        );
        setParticipants([]);
      } else {
        const formattedParticipants = (participantsData || []).map(
          (p: any) => ({
            id: p.id,
            user_id: p.user_id,
            tournament_id: p.tournament_id,
            username: p.users?.display_name || "Unknown Player",
            avatar_url: p.users?.avatar_url,
            created_at: p.created_at,
          })
        );

        console.log("Participants data:", {
          raw: participantsData,
          formatted: formattedParticipants,
          count: formattedParticipants.length,
        });
        setParticipants(formattedParticipants);
      }

      // Fetch matches
      const { data: matchesData, error: matchesError } = await supabaseClient
        .from("matches")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("round", { ascending: true })
        .order("match_number", { ascending: true });

      if (matchesError) {
        console.warn("No matches found for tournament:", matchesError);
        setMatches([]);
      } else {
        setMatches(matchesData || []);
      }
    } catch (err) {
      console.error("Error fetching tournament data:", err);
      setError("Failed to load tournament data");
    } finally {
      setLoading(false);
    }
  };

  const formatMatchesForComponents = (): any[] => {
    return matches.map((match) => {
      const player1 = participants.find((p) => p.user_id === match.player1_id);
      const player2 = participants.find((p) => p.user_id === match.player2_id);
      const winner = match.winner_id
        ? participants.find((p) => p.user_id === match.winner_id)
        : undefined;

      return {
        id: match.id,
        round: match.round,
        matchNumber: match.match_number,
        player1: player1
          ? {
              id: player1.user_id,
              name: player1.username,
              score: match.player1_score,
              avatar: player1.avatar_url,
            }
          : undefined,
        player2: player2
          ? {
              id: player2.user_id,
              name: player2.username,
              score: match.player2_score,
              avatar: player2.avatar_url,
            }
          : undefined,
        status: match.status as "pending" | "in_progress" | "completed",
        winner: winner
          ? {
              id: winner.user_id,
              name: winner.username,
            }
          : undefined,
        startTime: match.start_time ? new Date(match.start_time) : undefined,
        endTime: match.end_time ? new Date(match.end_time) : undefined,
      };
    });
  };

  const handleMatchClick = (match: any) => {
    const foundMatch = matches.find((m) => m.id === match.id);
    if (foundMatch) {
      setSelectedMatch(foundMatch);
      setActiveTab("scoring");
    }
  };

  const handleScoreUpdate = async (
    player1Score: number,
    player2Score: number,
    winnerId?: string
  ) => {
    if (!selectedMatch) return;

    try {
      const { error } = await supabaseClient
        .from("matches")
        .update({
          player1_score: player1Score,
          player2_score: player2Score,
          winner_id: winnerId,
          status: winnerId ? "completed" : "in_progress",
          end_time: winnerId ? new Date().toISOString() : null,
        })
        .eq("id", selectedMatch.id);

      if (error) throw error;

      // Refresh data
      await fetchTournamentData();
    } catch (err) {
      console.error("Error updating match score:", err);
    }
  };

  const handleJoinTournament = async () => {
    if (!currentUser || !tournament) {
      console.error("Missing currentUser or tournament:", {
        currentUser,
        tournament,
      });
      alert("Please log in to join tournaments");
      return;
    }

    setJoining(true);
    try {
      console.log("Attempting to join tournament:", {
        tournamentId,
        userId: currentUser.id,
        currentParticipants: participants.length,
        maxParticipants: tournament.max_participants,
        registrationDeadline: tournament.registration_deadline,
      });

      // Check if tournament is full
      if (participants.length >= tournament.max_participants) {
        throw new Error("Tournament is full");
      }

      // Check if registration deadline has passed
      const now = new Date();
      const deadline = new Date(tournament.registration_deadline);
      if (now > deadline) {
        throw new Error("Registration deadline has passed");
      }

      // Check if user is already a participant
      if (isParticipant) {
        throw new Error("You are already registered for this tournament");
      }

      // Verify user exists in users table
      const { data: userData, error: userError } = await supabaseClient
        .from("users")
        .select("id")
        .eq("id", currentUser.id)
        .single();

      if (userError || !userData) {
        console.error("User not found in users table:", userError);
        throw new Error(
          "User profile not found. Please complete your profile first."
        );
      }

      // Check authentication status
      const {
        data: { session },
        error: sessionError,
      } = await supabaseClient.auth.getSession();
      if (sessionError || !session) {
        console.error("No active session:", sessionError);
        throw new Error("Please log in to join tournaments");
      }

      console.log("User authenticated, attempting to join...");

      const { data, error } = await supabaseClient
        .from("tournament_participants")
        .insert({
          tournament_id: tournamentId,
          user_id: currentUser.id,
        })
        .select();

      if (error) {
        console.error("Supabase error:", error);
        if (error.code === "23505") {
          throw new Error("You are already registered for this tournament");
        } else if (error.code === "23503") {
          throw new Error("Invalid tournament or user");
        } else if (error.code === "42501") {
          throw new Error("Authentication error. Please log in again.");
        } else {
          throw new Error(`Failed to join tournament: ${error.message}`);
        }
      }

      console.log("Successfully joined tournament:", data);

      // Refresh data to show updated participant count
      await fetchTournamentData();
    } catch (err) {
      console.error("Error joining tournament:", err);
      // You could add a toast notification here
      alert(err instanceof Error ? err.message : "Failed to join tournament");
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading tournament...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Tournament Not Found</h1>
            <p className="text-muted-foreground mb-4">
              {error || "This tournament does not exist."}
            </p>
            <Button asChild>
              <Link href="/tournaments">Back to Tournaments</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const formattedMatches = formatMatchesForComponents();
  const isParticipant = participants.some((p) => p.user_id === currentUser?.id);
  const isCreator = tournament.created_by === currentUser?.id;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        {/* Tournament Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">{tournament.name}</h1>
              <p className="text-xl text-muted-foreground mb-4">
                {tournament.description}
              </p>

              <div className="flex flex-wrap gap-4 mb-6">
                <Badge variant="outline" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {new Date(tournament.start_date).toLocaleDateString()}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {participants.length}/{tournament.max_participants}{" "}
                  Participants
                </Badge>
                <Badge
                  variant={
                    tournament.status === "in_progress"
                      ? "default"
                      : "secondary"
                  }
                >
                  {tournament.status}
                </Badge>
                <Badge variant="outline">
                  {tournament.format.replace("_", " ")}
                </Badge>
              </div>
            </div>

            {/* Participant List */}
            {participants.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Participants ({participants.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {participants.map((participant) => (
                    <Badge
                      key={participant.id}
                      variant="outline"
                      className="text-xs"
                    >
                      {participant.username}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {isCreator && (
                <Button asChild variant="outline">
                  <Link href={`/tournaments/${tournamentId}/manage`}>
                    <Settings className="h-4 w-4 mr-2" />
                    Manage
                  </Link>
                </Button>
              )}

              {/* Join Button States */}
              {!isCreator && (
                <>
                  {isParticipant ? (
                    <Badge
                      variant="default"
                      className="px-3 py-2 bg-green-600 hover:bg-green-700"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Joined ✓
                    </Badge>
                  ) : tournament.status === "open" ? (
                    <Button
                      onClick={handleJoinTournament}
                      disabled={joining}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      {joining ? "Joining..." : "Join Tournament"}
                    </Button>
                  ) : (
                    <Badge variant="secondary" className="px-3 py-2">
                      <Lock className="h-4 w-4 mr-2" />
                      Registration Closed
                    </Badge>
                  )}
                </>
              )}

              <Button asChild variant="outline">
                <Link href={`/tournaments/${tournamentId}/bracket`}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Bracket
                </Link>
              </Button>
            </div>
          </div>
        </motion.div>

        {/* V2 Features Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Live Dashboard
            </TabsTrigger>
            <TabsTrigger value="bracket" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Bracket
            </TabsTrigger>
            <TabsTrigger value="scoring" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Live Scoring
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Chat
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">
                Live Tournament Dashboard
              </h2>
              <p className="text-muted-foreground">
                Real-time tournament progress with live statistics and match
                updates.
              </p>
            </div>

            <LiveTournamentDashboard
              tournamentId={tournamentId}
              tournamentName={tournament.name}
              matches={formattedMatches}
              onMatchClick={handleMatchClick}
            />
          </TabsContent>

          <TabsContent value="bracket" className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">Tournament Bracket</h2>
              <p className="text-muted-foreground">
                Interactive tournament bracket with live updates and match
                management.
              </p>
            </div>

            <EnhancedBracket
              tournamentId={tournamentId}
              matches={formattedMatches}
              onMatchClick={handleMatchClick}
            />
          </TabsContent>

          <TabsContent value="scoring" className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">Live Match Scoring</h2>
              <p className="text-muted-foreground">
                Real-time scoring with instant updates across all devices.
              </p>
            </div>

            {selectedMatch ? (
              <div className="max-w-4xl mx-auto">
                <MatchScoring
                  matchId={selectedMatch.id}
                  tournamentId={tournamentId}
                  player1={
                    formattedMatches.find((m) => m.id === selectedMatch.id)
                      ?.player1!
                  }
                  player2={
                    formattedMatches.find((m) => m.id === selectedMatch.id)
                      ?.player2!
                  }
                  status={
                    selectedMatch.status as
                      | "pending"
                      | "in_progress"
                      | "completed"
                  }
                  onScoreUpdate={handleScoreUpdate}
                />
              </div>
            ) : (
              <Card className="max-w-2xl mx-auto">
                <CardContent className="pt-6 text-center">
                  <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Select a Match</h3>
                  <p className="text-muted-foreground mb-4">
                    Choose a match from the bracket or dashboard to start
                    scoring.
                  </p>
                  <Button onClick={() => setActiveTab("bracket")}>
                    View Bracket
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="chat" className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">Tournament Chat</h2>
              <p className="text-muted-foreground">
                Real-time chat for tournament participants and spectators.
              </p>
            </div>

            <div className="w-full max-w-4xl mx-auto">
              <TournamentChat
                tournamentId={tournamentId}
                currentUserId={currentUser?.id || "anonymous"}
                currentUsername={
                  currentUser?.user_metadata?.full_name || "Anonymous User"
                }
                currentUserAvatar={currentUser?.user_metadata?.avatar_url}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
