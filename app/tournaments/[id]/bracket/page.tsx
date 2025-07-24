"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { TournamentWithDetails } from "@/lib/types";
import {
  generateSingleEliminationBracket,
  TournamentBracket,
  BracketParticipant,
  updateMatchResult,
  getTournamentStats,
} from "@/lib/bracket";
import { Navigation } from "@/components/navigation";
import { BracketVisualization } from "@/components/bracket-visualization";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Trophy,
  Users,
  Clock,
  Play,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";

export default function TournamentBracketPage() {
  const params = useParams();
  const { user, isAdmin } = useAuth();
  const [tournament, setTournament] = useState<TournamentWithDetails | null>(
    null
  );
  const [bracket, setBracket] = useState<TournamentBracket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchTournamentAndBracket();
    }
  }, [params.id]);

  const fetchTournamentAndBracket = async () => {
    try {
      // Fetch tournament details
      const { data: tournamentData, error: tournamentError } = await supabase
        .from("tournaments")
        .select(
          `
          *,
          created_by_user:users!created_by(id, display_name),
          winner:users!winner_id(id, display_name),
          tournament_participants(
            id,
            user_id,
            seed,
            joined_at,
            user:users(id, display_name)
          )
        `
        )
        .eq("id", params.id)
        .single();

      if (tournamentError) {
        setError("Tournament not found");
        return;
      }

      setTournament({
        ...tournamentData,
        participant_count: tournamentData.tournament_participants?.length || 0,
      });

      // Fetch matches if tournament has started
      if (tournamentData.status !== "open") {
        await fetchMatches(tournamentData);
      }
    } catch (error) {
      console.error("Error fetching tournament:", error);
      setError("Failed to load tournament");
    } finally {
      setLoading(false);
    }
  };

  const fetchMatches = async (tournamentData: any) => {
    try {
      const { data: matches, error: matchesError } = await supabase
        .from("matches")
        .select(
          `
          *,
          player1:users!player1_id(id, display_name),
          player2:users!player2_id(id, display_name),
          winner:users!winner_id(id, display_name)
        `
        )
        .eq("tournament_id", params.id)
        .order("round")
        .order("match_number");

      if (matchesError) {
        console.error("Error fetching matches:", matchesError);
        return;
      }

      // Convert matches to bracket format
      if (matches && matches.length > 0) {
        const reconstructedBracket = reconstructBracketFromMatches(
          matches,
          tournamentData.tournament_participants
        );
        setBracket(reconstructedBracket);
      }
    } catch (error) {
      console.error("Error fetching matches:", error);
    }
  };

  const reconstructBracketFromMatches = (
    matches: any[],
    participants: any[]
  ): TournamentBracket => {
    // Group matches by round
    const roundsMap = new Map();

    matches.forEach((match) => {
      if (!roundsMap.has(match.round)) {
        roundsMap.set(match.round, []);
      }
      roundsMap.get(match.round).push({
        id: match.id,
        round: match.round,
        match_number: match.match_number,
        player1: match.player1
          ? {
              user_id: match.player1.id,
              user: match.player1,
            }
          : undefined,
        player2: match.player2
          ? {
              user_id: match.player2.id,
              user: match.player2,
            }
          : undefined,
        winner: match.winner
          ? {
              user_id: match.winner.id,
              user: match.winner,
            }
          : undefined,
        player1_score: match.player1_score,
        player2_score: match.player2_score,
        status: match.status,
        is_bye: !match.player1 || !match.player2,
      });
    });

    // Convert to rounds array
    const rounds = Array.from(roundsMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([roundNumber, roundMatches]) => ({
        round: roundNumber,
        name: getRoundName(roundNumber, roundsMap.size),
        matches: roundMatches.sort(
          (a: any, b: any) => a.match_number - b.match_number
        ),
      }));

    // Find champion
    const finalRound = rounds[rounds.length - 1];
    const finalMatch = finalRound?.matches[0];
    const champion = finalMatch?.winner;

    return { rounds, champion };
  };

  const getRoundName = (round: number, totalRounds: number): string => {
    const roundsFromEnd = totalRounds - round + 1;

    switch (roundsFromEnd) {
      case 1:
        return "Final";
      case 2:
        return "Semifinal";
      case 3:
        return "Quarterfinal";
      case 4:
        return "Round of 16";
      case 5:
        return "Round of 32";
      default:
        return `Round ${round}`;
    }
  };

  const handleGenerateBracket = async () => {
    if (
      !tournament?.tournament_participants ||
      tournament.tournament_participants.length < 2
    ) {
      setError("Need at least 2 participants to generate bracket");
      return;
    }

    setGenerating(true);
    try {
      // Convert participants to bracket format
      const bracketParticipants: BracketParticipant[] =
        tournament.tournament_participants.map((p) => ({
          id: p.id,
          tournament_id: p.tournament_id,
          user_id: p.user_id,
          seed: p.seed,
          joined_at: p.joined_at,
          user: p.user,
        }));

      // Generate bracket
      const { bracket: newBracket, matches } = generateSingleEliminationBracket(
        bracketParticipants,
        tournament.id
      );

      // Save matches to database
      const { error: matchesError } = await supabase
        .from("matches")
        .insert(matches);

      if (matchesError) {
        throw matchesError;
      }

      // Update tournament status
      const { error: tournamentError } = await supabase
        .from("tournaments")
        .update({ status: "in_progress" })
        .eq("id", tournament.id);

      if (tournamentError) {
        throw tournamentError;
      }

      setBracket(newBracket);
      setTournament((prev) =>
        prev ? { ...prev, status: "in_progress" } : null
      );
    } catch (error) {
      console.error("Error generating bracket:", error);
      setError("Failed to generate bracket");
    } finally {
      setGenerating(false);
    }
  };

  const handleMatchUpdate = async (
    roundNumber: number,
    matchNumber: number,
    winnerId: string,
    player1Score: number,
    player2Score: number
  ) => {
    if (!bracket) return;

    try {
      // Update match in database
      const { error: updateError } = await supabase
        .from("matches")
        .update({
          winner_id: winnerId,
          player1_score: player1Score,
          player2_score: player2Score,
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("tournament_id", params.id)
        .eq("round", roundNumber)
        .eq("match_number", matchNumber);

      if (updateError) {
        throw updateError;
      }

      // Update local bracket state
      const updatedBracket = updateMatchResult(
        bracket,
        roundNumber,
        matchNumber,
        winnerId,
        player1Score,
        player2Score
      );

      setBracket(updatedBracket);

      // Check if tournament is complete
      if (updatedBracket.champion) {
        // Update tournament status and winner
        await supabase
          .from("tournaments")
          .update({
            status: "completed",
            winner_id: updatedBracket.champion.user_id,
          })
          .eq("id", params.id);

        setTournament((prev) =>
          prev
            ? {
                ...prev,
                status: "completed",
                winner_id: updatedBracket.champion?.user_id,
                winner: updatedBracket.champion?.user,
              }
            : null
        );
      }

      // Create next round matches if needed
      if (roundNumber < updatedBracket.rounds.length) {
        const nextRound = updatedBracket.rounds[roundNumber];
        const nextMatchNumber = Math.ceil(matchNumber / 2);
        const nextMatch = nextRound.matches.find(
          (m) => m.match_number === nextMatchNumber
        );

        if (nextMatch && nextMatch.player1 && nextMatch.player2) {
          // Update next match in database
          await supabase
            .from("matches")
            .update({
              player1_id: nextMatch.player1?.user_id,
              player2_id: nextMatch.player2?.user_id,
            })
            .eq("tournament_id", params.id)
            .eq("round", roundNumber + 1)
            .eq("match_number", nextMatchNumber);
        }
      }
    } catch (error) {
      console.error("Error updating match:", error);
      setError("Failed to update match result");
    }
  };

  const canGenerateBracket = () => {
    return (
      isAdmin &&
      tournament?.status === "open" &&
      (tournament?.participant_count || 0) >= 2
    );
  };

  const isCreator = () => {
    return user && tournament && tournament.created_by === user.id;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-24">
          <div className="text-center max-w-md mx-auto">
            <Trophy className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h1 className="text-2xl font-bold tracking-tight mb-2">
              Tournament Not Found
            </h1>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button asChild>
              <Link href="/tournaments">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Tournaments
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const stats = bracket ? getTournamentStats(bracket) : null;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/tournaments/${tournament.id}`}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Tournament
          </Link>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight mb-2">
                {tournament.name}
              </h1>
              <div className="flex items-center gap-4 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{tournament.participant_count} participants</span>
                </div>
                <Badge
                  variant={
                    tournament.status === "completed" ? "default" : "secondary"
                  }
                >
                  {tournament.status === "completed"
                    ? "Tournament Complete"
                    : tournament.status === "in_progress"
                    ? "In Progress"
                    : "Open"}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Tournament Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Progress</p>
                    <p className="text-2xl font-bold">
                      {Math.round(stats.progress)}%
                    </p>
                  </div>
                  <Trophy className="h-8 w-8 text-muted-foreground" />
                </div>
                <Progress value={stats.progress} className="mt-2" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold">
                      {stats.completedMatches}
                    </p>
                  </div>
                  <Trophy className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold">{stats.pendingMatches}</p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold">{stats.totalMatches}</p>
                  </div>
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Bracket Generation */}
        {!bracket && tournament.status === "open" && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Generate Tournament Bracket</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Trophy className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Ready to Start?</h3>
                <p className="text-muted-foreground mb-6">
                  Generate the tournament bracket to begin matches with{" "}
                  {tournament.participant_count} participants.
                </p>
                {canGenerateBracket() ? (
                  <Button
                    onClick={handleGenerateBracket}
                    disabled={generating}
                    size="lg"
                  >
                    {generating ? (
                      <>
                        <RotateCcw className="mr-2 h-5 w-5 animate-spin" />
                        Generating Bracket...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-5 w-5" />
                        Generate Bracket
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {!isAdmin
                        ? "Only tournament organizers can generate brackets."
                        : (tournament?.participant_count || 0) < 2
                        ? "Need at least 2 participants."
                        : "Tournament must be open to generate bracket."}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bracket Visualization */}
        {bracket && (
          <Card>
            <CardHeader>
              <CardTitle>Tournament Bracket</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <BracketVisualization
                bracket={bracket}
                isAdmin={isCreator() || isAdmin}
                onMatchUpdate={handleMatchUpdate}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
