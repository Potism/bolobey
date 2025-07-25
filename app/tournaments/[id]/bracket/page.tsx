"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import {
  TournamentWithDetails,
  BracketMatch,
  TournamentBracket,
  BattleResult,
  User,
} from "@/lib/types";
import {
  generateSingleEliminationBracket,
  generateRoundRobinMatches,
  calculateRoundRobinStandings,
} from "@/lib/bracket";
import { Navigation } from "@/components/navigation";
import { BracketVisualization } from "@/components/bracket-visualization";
import { BattleScoringModal } from "@/components/battle-scoring-modal";
import { TournamentChat } from "@/components/tournament-chat";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Trophy,
  Users,
  Play,
  Share2,
  Copy,
  Check,
  Calendar,
  Crown,
  AlertCircle,
  Target,
  TrendingUp,
  RotateCcw,
  Settings,
} from "lucide-react";

interface MatchWithPlayers {
  id: string;
  tournament_id: string;
  phase_id: string;
  round: number;
  match_number: number;
  bracket_type: "upper" | "lower" | "final";
  player1_id: string | null;
  player2_id: string | null;
  winner_id: string | null;
  player1_score: number;
  player2_score: number;
  status: string;
  completed_at: string | null;
  player1?: { id: string; display_name: string };
  player2?: { id: string; display_name: string };
  winner?: { id: string; display_name: string };
}

interface RoundRobinMatchWithPlayers {
  id: string;
  tournament_id: string;
  player1_id: string | null;
  player2_id: string | null;
  winner_id: string | null;
  status: string;
  completed_at: string | null;
  player1?: { id: string; display_name: string };
  player2?: { id: string; display_name: string };
  winner?: { id: string; display_name: string };
  created_at: string;
}

interface RoundRobinStandings {
  user_id: string;
  display_name: string;
  total_points: number;
  matches_played: number;
  matches_won: number;
  win_percentage: number;
  rank: number;
}

interface TournamentPhase {
  id: string;
  tournament_id: string;
  phase_type: "round_robin" | "elimination";
  phase_order: number;
  status: "pending" | "in_progress" | "completed";
  started_at: string | null;
  completed_at: string | null;
}

export default function TournamentBracketPage() {
  const params = useParams();
  const { user } = useAuth();
  const [tournament, setTournament] = useState<TournamentWithDetails | null>(
    null
  );
  const [matches, setMatches] = useState<MatchWithPlayers[]>([]);
  const [roundRobinMatches, setRoundRobinMatches] = useState<
    RoundRobinMatchWithPlayers[]
  >([]);
  const [roundRobinStandings, setRoundRobinStandings] = useState<
    RoundRobinStandings[]
  >([]);
  const [phases, setPhases] = useState<TournamentPhase[]>([]);
  const [bracket, setBracket] = useState<TournamentBracket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tournamentCompleted, setTournamentCompleted] = useState(false);
  const [champion, setChampion] = useState<{ name: string; id: string } | null>(
    null
  );
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);
  const [selectedMatch, setSelectedMatch] =
    useState<RoundRobinMatchWithPlayers | null>(null);
  const [battleModalOpen, setBattleModalOpen] = useState(false);

  // Debug user data
  console.log("TournamentBracketPage - User data:", {
    user: user,
    userId: user?.id,
    displayName: user?.display_name,
    email: user?.email,
    role: user?.role,
    avatarUrl: user?.avatar_url,
  });

  // Better username fallback logic
  const getUsername = () => {
    if (user?.display_name && user.display_name.trim()) {
      return user.display_name;
    }
    if (user?.email) {
      return user.email.split("@")[0];
    }
    return "User";
  };

  const fetchMatches = useCallback(async () => {
    if (!params.id) return;

    try {
      console.log("Fetching matches for tournament:", params.id);

      const { data, error } = await supabase
        .from("matches")
        .select(
          `
          *,
          player1:users!matches_player1_id_fkey(id, display_name),
          player2:users!matches_player2_id_fkey(id, display_name),
          winner:users!matches_winner_id_fkey(id, display_name)
        `
        )
        .eq("tournament_id", params.id)
        .order("round", { ascending: true })
        .order("match_number", { ascending: true });

      if (error) {
        console.error("Error fetching matches:", error);
        throw error;
      }

      console.log("Fetched matches:", data);
      setMatches(data || []);

      if (!data || data.length === 0) {
        console.log("No matches found for tournament");
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error fetching matches:", error);
        setError("Failed to load matches");
      }
    }
  }, [params.id]);

  const fetchRoundRobinMatches = useCallback(async () => {
    if (!params.id) return;

    try {
      const { data, error } = await supabase
        .from("round_robin_matches")
        .select(
          `
          *,
          player1:users!round_robin_matches_player1_id_fkey(id, display_name),
          player2:users!round_robin_matches_player2_id_fkey(id, display_name),
          winner:users!round_robin_matches_winner_id_fkey(id, display_name)
        `
        )
        .eq("tournament_id", params.id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching round robin matches:", error);
        throw error;
      }

      setRoundRobinMatches(data || []);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error fetching round robin matches:", error);
      }
    }
  }, [params.id]);

  const fetchPhases = useCallback(async () => {
    if (!params.id) return;

    try {
      const { data, error } = await supabase
        .from("tournament_phases")
        .select("*")
        .eq("tournament_id", params.id)
        .order("phase_order", { ascending: true });

      if (error) {
        console.error("Error fetching phases:", error);
        throw error;
      }

      setPhases(data || []);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error fetching phases:", error);
      }
    }
  }, [params.id]);

  const fetchTournamentAndBracket = useCallback(async () => {
    if (!params.id) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch tournament details
      const { data: tournamentData, error: tournamentError } = await supabase
        .from("tournaments")
        .select(
          `
          *,
          created_by_user:users!tournaments_created_by_fkey(*),
          winner:users!tournaments_winner_id_fkey(*),
          tournament_participants(
            *,
            user:users(*)
          )
        `
        )
        .eq("id", params.id)
        .single();

      if (tournamentError) {
        console.error("Error fetching tournament:", tournamentError);
        throw tournamentError;
      }

      console.log("Tournament data:", tournamentData);
      setTournament(tournamentData);

      // Fetch phases, matches, and round robin matches
      await Promise.all([
        fetchPhases(),
        fetchMatches(),
        fetchRoundRobinMatches(),
      ]);

      // Check if tournament is in progress but has no matches
      if (
        tournamentData.status === "in_progress" &&
        matches.length === 0 &&
        roundRobinMatches.length === 0
      ) {
        console.log(
          "Tournament is in progress but has no matches, auto-generating..."
        );

        // Auto-generate matches based on tournament format
        if (tournamentData.format === "beyblade_x") {
          await handleGenerateBeybladeXTournament();
        } else {
          await handleGenerateBracket();
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error fetching tournament:", error);
        setError("Failed to load tournament");
      }
    } finally {
      setLoading(false);
    }
  }, [params.id, fetchPhases, fetchMatches, fetchRoundRobinMatches]);

  const handleGenerateBeybladeXTournament = async () => {
    if (!tournament?.tournament_participants) return;

    try {
      const participantIds = tournament.tournament_participants.map(
        (p) => p.user_id
      );

      console.log(
        "Generating Beyblade X tournament with",
        participantIds.length,
        "participants"
      );

      // For 2 players, skip Round Robin and go directly to elimination
      if (participantIds.length === 2) {
        console.log(
          "2 players detected - skipping Round Robin, going directly to elimination"
        );

        // Create elimination phase directly
        const { data: eliminationPhase, error: phaseError } = await supabase
          .from("tournament_phases")
          .insert({
            tournament_id: params.id as string,
            phase_type: "elimination",
            phase_order: 1,
            status: "in_progress",
            started_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (phaseError) throw phaseError;

        // Generate single elimination final match
        const { createMatches } =
          generateSingleEliminationBracket(participantIds);

        const matchesWithIds = createMatches.map((match) => ({
          ...match,
          tournament_id: params.id as string,
          phase_id: eliminationPhase.id,
        }));

        const { error: matchesError } = await supabase
          .from("matches")
          .insert(matchesWithIds);

        if (matchesError) throw matchesError;

        // Update tournament phase
        await supabase
          .from("tournaments")
          .update({ current_phase: "elimination" })
          .eq("id", params.id);

        console.log("2-player Beyblade X tournament generated successfully");
        await fetchMatches();
        await fetchPhases();
        return;
      }

      // For 3+ players, use Round Robin + Elimination
      console.log(
        "3+ players detected - using Round Robin + Elimination format"
      );

      // Create Round Robin phase
      const { error: phaseError } = await supabase
        .from("tournament_phases")
        .insert({
          tournament_id: params.id as string,
          phase_type: "round_robin",
          phase_order: 1,
          status: "in_progress",
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (phaseError) throw phaseError;

      // Generate Round Robin matches
      const roundRobinMatches = generateRoundRobinMatches(participantIds);
      const matchesWithTournamentId = roundRobinMatches.map((match) => ({
        ...match,
        tournament_id: params.id as string,
      }));

      const { error: matchesError } = await supabase
        .from("round_robin_matches")
        .insert(matchesWithTournamentId);

      if (matchesError) throw matchesError;

      // Update tournament phase
      await supabase
        .from("tournaments")
        .update({ current_phase: "round_robin" })
        .eq("id", params.id);

      console.log("Beyblade X tournament generated successfully");
      await fetchRoundRobinMatches();
      await fetchPhases();
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error generating Beyblade X tournament:", error);
        setError("Failed to generate tournament");
      }
    }
  };

  const handleGenerateBracket = async () => {
    if (!tournament?.tournament_participants) return;

    try {
      const participantIds = tournament.tournament_participants.map(
        (p) => p.user_id
      );
      const { matches: bracketMatches, createMatches } =
        generateSingleEliminationBracket(participantIds);

      const matchesWithIds = createMatches.map((match) => ({
        ...match,
        tournament_id: params.id as string,
        phase_id: phases.find((p) => p.phase_type === "elimination")?.id || "",
      }));

      const { error } = await supabase.from("matches").insert(matchesWithIds);

      if (error) throw error;

      console.log("Generated matches:", matches);
      setBracket({
        upper_bracket: bracketMatches,
        lower_bracket: [],
        final_matches: [],
        total_rounds: Math.max(...bracketMatches.map((m) => m.round)),
      });

      await fetchMatches();
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error generating bracket:", error);
        setError("Failed to generate tournament bracket");
      }
    }
  };

  const reconstructBracketFromMatches = (
    matches: MatchWithPlayers[]
  ): TournamentBracket => {
    // Convert matches to BracketMatch format
    const bracketMatches: BracketMatch[] = matches.map((match) => ({
      id: match.id,
      round: match.round,
      match_number: match.match_number,
      bracket_type: match.bracket_type,
      player1: match.player1 as User | undefined,
      player2: match.player2 as User | undefined,
      winner: match.winner as User | undefined,
      player1_score: match.player1_score,
      player2_score: match.player2_score,
      status: match.status as "pending" | "in_progress" | "completed",
    }));

    // Advance winners to next round matches
    const updatedBracketMatches = bracketMatches.map((match) => {
      // If this match is completed and has a winner, advance the winner to the next round
      if (match.status === "completed" && match.winner) {
        const nextRound = match.round + 1;
        const nextMatchNumber = Math.ceil(match.match_number / 2);

        // Find the next round match
        // For the final round, bracket_type changes from "upper" to "final"
        const nextBracketType =
          nextRound === Math.max(...matches.map((m) => m.round))
            ? "final"
            : match.bracket_type;

        const nextMatch = bracketMatches.find(
          (m) =>
            m.round === nextRound &&
            m.match_number === nextMatchNumber &&
            m.bracket_type === nextBracketType
        );

        if (nextMatch) {
          // Determine if this winner should be player1 or player2 in the next match
          const isFirstMatch = match.match_number % 2 === 1;

          if (isFirstMatch) {
            // This winner goes to player1 slot in next match
            nextMatch.player1 = match.winner;
          } else {
            // This winner goes to player2 slot in next match
            nextMatch.player2 = match.winner;
          }
        }
      }

      // Also handle bye players (matches with only one player)
      if (match.player1 && !match.player2 && match.status === "pending") {
        // This player gets a bye, advance them to the next round
        const nextRound = match.round + 1;
        const nextMatchNumber = Math.ceil(match.match_number / 2);

        // For the final round, bracket_type changes from "upper" to "final"
        const nextBracketType =
          nextRound === Math.max(...matches.map((m) => m.round))
            ? "final"
            : match.bracket_type;

        const nextMatch = bracketMatches.find(
          (m) =>
            m.round === nextRound &&
            m.match_number === nextMatchNumber &&
            m.bracket_type === nextBracketType
        );

        if (nextMatch) {
          const isFirstMatch = match.match_number % 2 === 1;

          if (isFirstMatch) {
            nextMatch.player1 = match.player1;
          } else {
            nextMatch.player2 = match.player1;
          }
        }
      }

      return match;
    });

    // Group by bracket type
    const upperBracket = updatedBracketMatches.filter(
      (m) => m.bracket_type === "upper"
    );
    const lowerBracket = updatedBracketMatches.filter(
      (m) => m.bracket_type === "lower"
    );
    const finalMatches = updatedBracketMatches.filter(
      (m) => m.bracket_type === "final"
    );

    return {
      upper_bracket: upperBracket,
      lower_bracket: lowerBracket,
      final_matches: finalMatches,
      total_rounds: Math.max(...matches.map((m) => m.round)),
    };
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

      // Advance winner to next round match
      const nextRound = roundNumber + 1;
      const nextMatchNumber = Math.ceil(matchNumber / 2);

      // Find the next round match and update it with the winner
      // For the final round, bracket_type changes from "upper" to "final"
      const maxRound = Math.max(
        ...(bracket?.upper_bracket?.map((m) => m.round) || [])
      );
      const nextBracketType = nextRound === maxRound ? "final" : "upper";

      const { data: nextMatch, error: nextMatchError } = await supabase
        .from("matches")
        .select("*")
        .eq("tournament_id", params.id)
        .eq("round", nextRound)
        .eq("match_number", nextMatchNumber)
        .eq("bracket_type", nextBracketType)
        .single();

      if (nextMatch && !nextMatchError) {
        // Determine if this winner should be player1 or player2 in the next match
        const isFirstMatch = matchNumber % 2 === 1;

        const updateData: { player1_id?: string; player2_id?: string } = {};
        if (isFirstMatch) {
          // This winner goes to player1 slot in next match
          updateData.player1_id = winnerId;
        } else {
          // This winner goes to player2 slot in next match
          updateData.player2_id = winnerId;
        }

        const { error: advanceError } = await supabase
          .from("matches")
          .update(updateData)
          .eq("id", nextMatch.id);

        if (advanceError) {
          console.error("Error advancing winner to next round:", advanceError);
        }
      }

      // Also check if there's a match in the same round that has a "BYE" player
      // and automatically advance the non-BYE player
      const { data: sameRoundMatches, error: sameRoundError } = await supabase
        .from("matches")
        .select("*")
        .eq("tournament_id", params.id)
        .eq("round", roundNumber)
        .neq("id", nextMatch?.id || "");

      if (sameRoundMatches && !sameRoundError) {
        for (const match of sameRoundMatches) {
          // Check if this match has a BYE player (player2_id is null or undefined)
          if (match.player1_id && !match.player2_id) {
            // This player gets a bye, advance them to the next round
            const byeNextMatchNumber = Math.ceil(match.match_number / 2);

            const byeNextBracketType =
              nextRound === maxRound ? "final" : "upper";

            const { data: byeNextMatch, error: byeNextMatchError } =
              await supabase
                .from("matches")
                .select("*")
                .eq("tournament_id", params.id)
                .eq("round", nextRound)
                .eq("match_number", byeNextMatchNumber)
                .eq("bracket_type", byeNextBracketType)
                .single();

            if (byeNextMatch && !byeNextMatchError) {
              const isByeFirstMatch = match.match_number % 2 === 1;

              const byeUpdateData: {
                player1_id?: string;
                player2_id?: string;
              } = {};
              if (isByeFirstMatch) {
                byeUpdateData.player1_id = match.player1_id;
              } else {
                byeUpdateData.player2_id = match.player1_id;
              }

              const { error: byeAdvanceError } = await supabase
                .from("matches")
                .update(byeUpdateData)
                .eq("id", byeNextMatch.id);

              if (byeAdvanceError) {
                console.error(
                  "Error advancing bye player to next round:",
                  byeAdvanceError
                );
              }
            }
          }
        }
      }

      // Refresh bracket data
      await fetchMatches();

      // Check if tournament is complete by counting remaining matches
      const { data: remainingMatches } = await supabase
        .from("matches")
        .select("id")
        .eq("tournament_id", params.id)
        .eq("status", "pending");

      console.log("Remaining matches:", remainingMatches?.length || 0);

      if (!remainingMatches || remainingMatches.length === 0) {
        console.log("No remaining matches - tournament should be complete");

        // Find the tournament winner by getting the final match winner
        const { data: finalMatches, error: finalMatchesError } = await supabase
          .from("matches")
          .select("winner_id, winner:users(id, display_name)")
          .eq("tournament_id", params.id)
          .eq("bracket_type", "final")
          .eq("status", "completed")
          .order("round", { ascending: false })
          .order("match_number", { ascending: false })
          .limit(1);

        if (finalMatchesError) {
          console.error("Error fetching final matches:", finalMatchesError);
          // Don't throw the error, just log it and continue
          console.log("Continuing without updating tournament status");
        } else {
          console.log("Final matches found:", finalMatches);

          const tournamentWinner = Array.isArray(finalMatches?.[0]?.winner)
            ? (finalMatches?.[0]?.winner?.[0] as
                | { id: string; display_name: string }
                | undefined)
            : (finalMatches?.[0]?.winner as
                | { id: string; display_name: string }
                | undefined);
          const winnerId = finalMatches?.[0]?.winner_id;

          console.log("Tournament winner data:", {
            winnerId,
            tournamentWinner,
          });

          if (winnerId && tournamentWinner) {
            console.log("Updating tournament status to completed");

            // Update tournament status and winner
            const { error: tournamentError } = await supabase
              .from("tournaments")
              .update({
                status: "completed",
                winner_id: winnerId,
              })
              .eq("id", params.id);

            if (tournamentError) {
              console.error("Error updating tournament:", tournamentError);
              throw tournamentError;
            }

            console.log("Tournament status updated successfully");

            // Update tournament state
            setTournament((prev) =>
              prev
                ? {
                    ...prev,
                    status: "completed",
                    winner_id: winnerId,
                    winner: {
                      id: tournamentWinner.id,
                      display_name: tournamentWinner.display_name,
                      email: "",
                      role: "player" as const,
                      avatar_url: null,
                      created_at: "",
                      updated_at: "",
                    } as User,
                  }
                : null
            );

            // Set tournament completion state
            setTournamentCompleted(true);
            setChampion({
              name: tournamentWinner.display_name,
              id: winnerId,
            });

            // Show success message for tournament completion
            console.log(
              `Tournament completed! Champion: ${tournamentWinner.display_name}`
            );

            // Debug: Check if tournament was properly updated
            const { data: updatedTournament, error: checkError } =
              await supabase
                .from("tournaments")
                .select("id, name, status, winner_id")
                .eq("id", params.id)
                .single();

            if (checkError) {
              console.error("Error checking tournament update:", checkError);
            } else {
              console.log("Tournament update check:", updatedTournament);
            }

            // Auto-hide the completion message after 5 seconds
            setTimeout(() => {
              setTournamentCompleted(false);
              setChampion(null);
            }, 5000);

            // Refresh tournament data to update the status
            await fetchTournamentAndBracket();
          } else {
            console.error(
              "Could not determine tournament winner from final matches"
            );

            // Fallback: Try to get winner from the last completed match
            const { data: lastCompletedMatch, error: lastMatchError } =
              await supabase
                .from("matches")
                .select("winner_id, winner:users(id, display_name)")
                .eq("tournament_id", params.id)
                .eq("status", "completed")
                .not("winner_id", "is", null)
                .order("completed_at", { ascending: false })
                .limit(1)
                .single();

            if (lastMatchError) {
              console.error(
                "Error fetching last completed match:",
                lastMatchError
              );
              throw new Error("Could not determine tournament winner");
            }

            if (lastCompletedMatch?.winner_id && lastCompletedMatch?.winner) {
              console.log("Using fallback winner:", lastCompletedMatch);

              // Handle the winner data structure from Supabase
              const winnerData = Array.isArray(lastCompletedMatch.winner)
                ? lastCompletedMatch.winner[0]
                : lastCompletedMatch.winner;

              console.log("Updating tournament status to completed (fallback)");

              // Update tournament status and winner
              const { error: tournamentError } = await supabase
                .from("tournaments")
                .update({
                  status: "completed",
                  winner_id: lastCompletedMatch.winner_id,
                })
                .eq("id", params.id);

              if (tournamentError) {
                console.error("Error updating tournament:", tournamentError);
                throw tournamentError;
              }

              console.log("Tournament status updated successfully (fallback)");

              // Update tournament state
              setTournament((prev) =>
                prev
                  ? {
                      ...prev,
                      status: "completed",
                      winner_id: lastCompletedMatch.winner_id,
                      winner: {
                        id: winnerData.id,
                        display_name: winnerData.display_name,
                        email: "",
                        role: "player" as const,
                        avatar_url: null,
                        created_at: "",
                        updated_at: "",
                      } as User,
                    }
                  : null
              );

              // Set tournament completion state
              setTournamentCompleted(true);
              setChampion({
                name: winnerData.display_name,
                id: lastCompletedMatch.winner_id,
              });

              console.log(
                `Tournament completed! Champion: ${winnerData.display_name}`
              );

              // Refresh tournament data to update the status
              await fetchTournamentAndBracket();
            }
          }
        }
      } else {
        console.log(
          "Tournament not complete yet -",
          remainingMatches.length,
          "matches remaining"
        );
      }

      // Note: Next round match creation logic removed as it's not needed for single elimination
      console.log("Match updated successfully");
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error updating match:", error);
        setError("Failed to update match result");
      }
    }
  };

  const handleRoundRobinMatchUpdate = async (
    matchId: string,
    winnerId: string,
    battles: BattleResult[]
  ) => {
    try {
      console.log("Updating round robin match:", {
        matchId,
        winnerId,
        battles,
      });

      // Update round robin match
      const { data: matchData, error: matchError } = await supabase
        .from("round_robin_matches")
        .update({
          winner_id: winnerId,
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", matchId)
        .select();

      console.log("Match update result:", { matchData, matchError });

      if (matchError) {
        console.error("Match update error details:", matchError);
        throw matchError;
      }

      // Insert battles if they exist
      if (battles && battles.length > 0) {
        console.log("Inserting battles:", battles);

        const battlesWithMatchId = battles.map((battle, index) => ({
          round_robin_match_id: matchId,
          battle_number: index + 1,
          winner_id: battle.winner_id,
          finish_type: battle.finish_type,
          player1_points: battle.player1_points,
          player2_points: battle.player2_points,
        }));

        console.log("Battles with match ID:", battlesWithMatchId);

        const { data: battlesData, error: battlesError } = await supabase
          .from("battles")
          .insert(battlesWithMatchId)
          .select();

        console.log("Battles insert result:", { battlesData, battlesError });

        if (battlesError) {
          console.error("Battles insert error details:", battlesError);
          throw battlesError;
        }
      }

      // Refresh data
      await fetchRoundRobinMatches();
      await updateRoundRobinStandings();

      // Force refresh the page data to show updated standings
      await fetchTournamentAndBracket();

      console.log("Round robin match update completed successfully");
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error updating round robin match:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        setError("Failed to update match");
      }
    }
  };

  const updateRoundRobinStandings = async () => {
    if (!tournament?.tournament_participants) return;

    try {
      console.log("Updating round robin standings...");

      // Get all completed round robin matches with battles
      const { data: matches, error: matchesError } = await supabase
        .from("round_robin_matches")
        .select(
          `
          id,
          player1_id,
          player2_id,
          winner_id,
          status,
          battles (
            id,
            winner_id,
            finish_type,
            player1_points,
            player2_points
          )
        `
        )
        .eq("tournament_id", params.id)
        .eq("status", "completed");

      if (matchesError) throw matchesError;

      console.log("Completed matches with battles:", matches);

      // Calculate points for each participant
      const participantStats = new Map<
        string,
        {
          user_id: string;
          total_points: number;
          matches_played: number;
          matches_won: number;
          burst_points: number;
          ringout_points: number;
          spinout_points: number;
        }
      >();

      // Initialize all participants with 0 stats
      tournament.tournament_participants.forEach((participant) => {
        participantStats.set(participant.user_id, {
          user_id: participant.user_id,
          total_points: 0,
          matches_played: 0,
          matches_won: 0,
          burst_points: 0,
          ringout_points: 0,
          spinout_points: 0,
        });
      });

      // Calculate stats from matches and battles
      matches?.forEach((match) => {
        if (!match.player1_id || !match.player2_id) return;

        const player1Stats = participantStats.get(match.player1_id);
        const player2Stats = participantStats.get(match.player2_id);

        if (player1Stats && player2Stats) {
          // Count matches played
          player1Stats.matches_played++;
          player2Stats.matches_played++;

          // Count matches won
          if (match.winner_id === match.player1_id) {
            player1Stats.matches_won++;
          } else if (match.winner_id === match.player2_id) {
            player2Stats.matches_won++;
          }

          // Calculate points from battles - both players earn points from their battles
          match.battles?.forEach((battle) => {
            // Player 1 always gets their points from the battle
            player1Stats.total_points += battle.player1_points;

            // Player 2 always gets their points from the battle
            player2Stats.total_points += battle.player2_points;

            // Count finish type points for the battle winner
            if (battle.winner_id === match.player1_id) {
              if (battle.finish_type === "burst")
                player1Stats.burst_points += 3;
              else if (battle.finish_type === "ringout")
                player1Stats.ringout_points += 2;
              else if (battle.finish_type === "spinout")
                player1Stats.spinout_points += 1;
            } else if (battle.winner_id === match.player2_id) {
              if (battle.finish_type === "burst")
                player2Stats.burst_points += 3;
              else if (battle.finish_type === "ringout")
                player2Stats.ringout_points += 2;
              else if (battle.finish_type === "spinout")
                player2Stats.spinout_points += 1;
            }
          });
        }
      });

      console.log("Calculated participant stats:", participantStats);

      // Update tournament_participants table with calculated stats
      for (const [userId, stats] of participantStats) {
        const { error: updateError } = await supabase
          .from("tournament_participants")
          .update({
            total_points: stats.total_points,
            matches_played: stats.matches_played,
            matches_won: stats.matches_won,
            burst_points: stats.burst_points,
            ringout_points: stats.ringout_points,
            spinout_points: stats.spinout_points,
          })
          .eq("tournament_id", params.id)
          .eq("user_id", userId);

        if (updateError) {
          console.error("Error updating participant stats:", updateError);
        }
      }

      // Get updated participants for standings
      const { data: updatedParticipants, error: participantsError } =
        await supabase
          .from("tournament_participants")
          .select(
            `
          user_id,
          total_points,
          matches_played,
          matches_won,
          user:users(display_name)
        `
          )
          .eq("tournament_id", params.id);

      if (participantsError) throw participantsError;

      const standings = calculateRoundRobinStandings(
        updatedParticipants.map((p) => ({
          user_id: p.user_id,
          display_name: Array.isArray(p.user)
            ? (p.user[0] as User)?.display_name || "Unknown"
            : (p.user as User | undefined)?.display_name || "Unknown",
          total_points: p.total_points,
          matches_played: p.matches_played,
          matches_won: p.matches_won,
        }))
      );

      setRoundRobinStandings(standings);
      console.log("Updated standings:", standings);

      // Check if round robin phase is complete and transition to elimination
      const totalMatches = matches?.length || 0;
      const expectedMatches =
        (tournament.tournament_participants.length *
          (tournament.tournament_participants.length - 1)) /
        2;

      if (totalMatches === expectedMatches && totalMatches > 0) {
        console.log(
          "Round robin phase complete, transitioning to elimination phase"
        );
        await transitionToEliminationPhase();
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error updating standings:", error);
      }
    }
  };

  const transitionToEliminationPhase = async () => {
    try {
      // Complete the round robin phase
      const { error: phaseError } = await supabase
        .from("tournament_phases")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("tournament_id", params.id)
        .eq("phase_type", "round_robin");

      if (phaseError) throw phaseError;

      // Create elimination phase
      const { data: eliminationPhase, error: eliminationPhaseError } =
        await supabase
          .from("tournament_phases")
          .insert({
            tournament_id: params.id as string,
            phase_type: "elimination",
            phase_order: 2,
            status: "in_progress",
            started_at: new Date().toISOString(),
          })
          .select()
          .single();

      if (eliminationPhaseError) throw eliminationPhaseError;

      // Get top 4 players from round robin standings for elimination bracket
      const topPlayers = roundRobinStandings.slice(0, 4).map((s) => s.user_id);

      // If less than 4 players, use all available players
      const playersForElimination =
        topPlayers.length >= 2
          ? topPlayers
          : tournament?.tournament_participants?.map((p) => p.user_id) || [];

      // Generate elimination bracket
      const { createMatches } = generateSingleEliminationBracket(
        playersForElimination
      );

      const matchesWithIds = createMatches.map((match) => ({
        ...match,
        tournament_id: params.id as string,
        phase_id: eliminationPhase.id,
      }));

      const { error: matchesError } = await supabase
        .from("matches")
        .insert(matchesWithIds);

      if (matchesError) throw matchesError;

      // Update tournament phase
      await supabase
        .from("tournaments")
        .update({ current_phase: "elimination" })
        .eq("id", params.id);

      console.log("Transitioned to elimination phase successfully");

      // Refresh data
      await fetchMatches();
      await fetchPhases();
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error transitioning to elimination phase:", error);
      }
    }
  };

  const canGenerateBracket = () => {
    return (
      isAdmin() &&
      tournament?.status === "open" &&
      (tournament?.tournament_participants?.length || 0) >= 2
    );
  };

  const isAdmin = () => {
    return user && tournament && tournament.created_by === user.id;
  };

  const getShareUrl = () => {
    if (typeof window !== "undefined") {
      return window.location.href;
    }
    return "";
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error copying to clipboard:", error);
      }
    }
  };

  // Manual function to force update tournament status (for debugging)
  const forceUpdateTournamentStatus = async () => {
    try {
      console.log("Force updating tournament status...");

      // First, let's check what matches exist for this tournament
      const { data: allMatches, error: allMatchesError } = await supabase
        .from("matches")
        .select("id, status, winner_id, completed_at")
        .eq("tournament_id", params.id);

      if (allMatchesError) {
        console.error("Error fetching all matches:", allMatchesError);
        alert("Error fetching matches: " + allMatchesError.message);
        return;
      }

      console.log("All matches:", allMatches);

      // Find completed matches with winners
      const completedMatchesWithWinners = allMatches?.filter(
        (match) => match.status === "completed" && match.winner_id
      );

      console.log(
        "Completed matches with winners:",
        completedMatchesWithWinners
      );

      if (
        !completedMatchesWithWinners ||
        completedMatchesWithWinners.length === 0
      ) {
        console.log("No completed matches with winners found");
        alert("No completed matches with winners found");
        return;
      }

      // Get the most recently completed match
      const lastCompletedMatch = completedMatchesWithWinners.sort(
        (a, b) =>
          new Date(b.completed_at || 0).getTime() -
          new Date(a.completed_at || 0).getTime()
      )[0];

      console.log("Last completed match:", lastCompletedMatch);

      if (lastCompletedMatch?.winner_id) {
        // Get the winner details
        const { data: winnerData, error: winnerError } = await supabase
          .from("users")
          .select("id, display_name")
          .eq("id", lastCompletedMatch.winner_id)
          .single();

        if (winnerError) {
          console.error("Error fetching winner details:", winnerError);
          alert("Error fetching winner details: " + winnerError.message);
          return;
        }

        console.log("Winner data:", winnerData);

        // Update tournament status and winner
        const { error: tournamentError } = await supabase
          .from("tournaments")
          .update({
            status: "completed",
            winner_id: lastCompletedMatch.winner_id,
          })
          .eq("id", params.id);

        if (tournamentError) {
          console.error("Error updating tournament:", tournamentError);
          alert("Error updating tournament: " + tournamentError.message);
          return;
        }

        console.log("Tournament status force updated successfully");

        // Update tournament state
        setTournament((prev) =>
          prev
            ? {
                ...prev,
                status: "completed",
                winner_id: lastCompletedMatch.winner_id,
                winner: {
                  id: winnerData.id,
                  display_name: winnerData.display_name,
                  email: "",
                  role: "player" as const,
                  avatar_url: null,
                  created_at: "",
                  updated_at: "",
                } as User,
              }
            : null
        );

        // Refresh tournament data
        await fetchTournamentAndBracket();

        alert(
          `Tournament status updated to completed! Winner: ${winnerData.display_name}`
        );
      } else {
        console.log("No winner found in last completed match");
        alert("No winner found in last completed match");
      }
    } catch (error) {
      console.error("Error in force update:", error);
      alert(
        "Error updating tournament status: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    }
  };

  // Click outside handler for share menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        shareMenuRef.current &&
        !shareMenuRef.current.contains(event.target as Node)
      ) {
        setShowShareMenu(false);
      }
    };

    if (showShareMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showShareMenu]);

  useEffect(() => {
    if (params.id) {
      fetchTournamentAndBracket();
    }
  }, [fetchTournamentAndBracket]);

  useEffect(() => {
    if (roundRobinMatches.length > 0) {
      updateRoundRobinStandings();
    }
  }, [roundRobinMatches]);

  useEffect(() => {
    if (matches.length > 0) {
      const newBracket = reconstructBracketFromMatches(matches);
      setBracket(newBracket);
    }
  }, [matches]);

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
            <p className="text-muted-foreground mb-6">
              {error || "The tournament you're looking for doesn't exist."}
            </p>
            <Button asChild>
              <Link href="/tournaments">Back to Tournaments</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentPhase =
    phases.find((p) => p.status === "in_progress") || phases[0];
  const isRoundRobinPhase = currentPhase?.phase_type === "round_robin";
  const isEliminationPhase = currentPhase?.phase_type === "elimination";

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              {tournament.name}
            </h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {tournament.tournament_participants?.length || 0} participants
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(tournament.start_date).toLocaleDateString()}
              </div>
              <Badge
                variant={
                  tournament.status === "completed" ? "default" : "secondary"
                }
              >
                {tournament.status.replace("_", " ")}
              </Badge>
              {tournament.format === "beyblade_x" && (
                <Badge
                  variant="outline"
                  className="bg-blue-50 text-blue-700 border-blue-200"
                >
                  Beyblade X
                </Badge>
              )}
            </div>
          </div>

          {/* Share Button */}
          <div className="relative" ref={shareMenuRef}>
            <Button
              variant="outline"
              onClick={() => setShowShareMenu(!showShareMenu)}
              className="flex items-center gap-2"
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>

            {showShareMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50">
                <button
                  onClick={copyToClipboard}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-green-500" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy Link
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tournament Completion Alert */}
        {tournamentCompleted && champion && (
          <Alert className="mb-6 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
            <Crown className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              <strong>Tournament Complete!</strong> {champion.name} is the
              champion! 🏆
            </AlertDescription>
          </Alert>
        )}

        {/* Phase Indicator */}
        {tournament.format === "beyblade_x" && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Tournament Phase
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                {tournament.tournament_participants?.length === 2 ? (
                  <Badge variant={isEliminationPhase ? "default" : "secondary"}>
                    Final Match
                  </Badge>
                ) : (
                  <>
                    <Badge
                      variant={isRoundRobinPhase ? "default" : "secondary"}
                    >
                      Round Robin Phase
                    </Badge>
                    <Badge
                      variant={isEliminationPhase ? "default" : "secondary"}
                    >
                      Elimination Phase
                    </Badge>
                  </>
                )}
                <Badge
                  variant={
                    tournament.status === "completed" ? "default" : "secondary"
                  }
                >
                  Completed
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Round Robin Phase */}
        {isRoundRobinPhase && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Round Robin Standings
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={updateRoundRobinStandings}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {roundRobinStandings.map((standing) => (
                  <div
                    key={standing.user_id}
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className="w-8 h-8 flex items-center justify-center p-0"
                      >
                        {standing.rank}
                      </Badge>
                      <span className="font-medium">
                        {standing.display_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{standing.total_points} pts</span>
                      <span>
                        {standing.matches_won}W -{" "}
                        {standing.matches_played - standing.matches_won}L
                      </span>
                      <span>{standing.win_percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Round Robin Matches */}
        {isRoundRobinPhase && roundRobinMatches.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Round Robin Matches
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {roundRobinMatches.map((match) => (
                  <div
                    key={match.id}
                    className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                      match.status === "pending"
                        ? "hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600"
                        : ""
                    }`}
                    onClick={() => {
                      if (match.status === "pending" && isAdmin()) {
                        setSelectedMatch(match);
                        setBattleModalOpen(true);
                      }
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-medium">
                        {match.player1?.display_name || "TBD"}
                      </span>
                      <span className="text-muted-foreground">vs</span>
                      <span className="font-medium">
                        {match.player2?.display_name || "TBD"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          match.status === "completed" ? "default" : "secondary"
                        }
                      >
                        {match.status}
                      </Badge>
                      {match.status === "pending" && isAdmin() && (
                        <span className="text-xs text-muted-foreground">
                          Click to record result
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Elimination Bracket */}
        {isEliminationPhase && bracket && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Tournament Bracket</h2>
              {canGenerateBracket() && (
                <Button onClick={handleGenerateBracket}>
                  Generate Bracket
                </Button>
              )}
            </div>
            <BracketVisualization
              bracket={bracket}
              isAdmin={!!isAdmin()}
              onMatchUpdate={handleMatchUpdate}
            />
          </div>
        )}

        {/* Generate Tournament Button */}
        {canGenerateBracket() && tournament.format === "beyblade_x" && (
          <Card className="mt-6">
            <CardContent className="pt-6">
              <Button
                onClick={handleGenerateBeybladeXTournament}
                className="w-full"
              >
                Start Beyblade X Tournament
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Admin Tools */}
        {isAdmin() && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Admin Tools
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={forceUpdateTournamentStatus}
                variant="outline"
                className="w-full"
              >
                Force Update Tournament Status
              </Button>
              <p className="text-sm text-muted-foreground">
                Use this button if the tournament status is not updating
                correctly.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Tournament Chat */}
        {user && (
          <div className="mt-6">
            <TournamentChat
              tournamentId={params.id as string}
              currentUserId={user.id}
              currentUsername={getUsername()}
              currentUserAvatar={user.avatar_url || undefined}
            />
          </div>
        )}

        {/* Show message if user is not loaded */}
        {!user && (
          <Card className="mt-6">
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Please log in to participate in the tournament chat.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {error && (
          <Alert className="mt-6" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Battle Scoring Modal */}
        {selectedMatch && (
          <BattleScoringModal
            isOpen={battleModalOpen}
            onClose={() => {
              setBattleModalOpen(false);
              setSelectedMatch(null);
            }}
            onSave={(winnerId, battles) => {
              handleRoundRobinMatchUpdate(selectedMatch.id, winnerId, battles);
            }}
            player1={selectedMatch.player1 as User | undefined}
            player2={selectedMatch.player2 as User | undefined}
            matchId={selectedMatch.id}
            isAdmin={!!isAdmin()}
            completed={!!(selectedMatch.status === "completed")}
          />
        )}
      </div>
    </div>
  );
}
