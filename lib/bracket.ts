import {
  BracketMatch,
  CreateMatch,
  CreateRoundRobinMatch,
  RoundRobinStandings,
  TournamentBracket,
  BattleResult,
  User,
} from "./types";

export interface BracketParticipant {
  id: string;
  tournament_id: string;
  user_id: string;
  seed: number | null;
  joined_at: string;
  user?: User;
}

export interface TournamentStats {
  total_matches: number;
  completed_matches: number;
  total_participants: number;
  current_round: number;
  total_rounds: number;
  progress: number;
}

// Generate all possible pairings for round robin phase
export function generateRoundRobinMatches(
  participants: string[]
): CreateRoundRobinMatch[] {
  const matches: CreateRoundRobinMatch[] = [];
  const n = participants.length;

  // If odd number of participants, add a "bye" player
  const players = n % 2 === 0 ? [...participants] : [...participants, "BYE"];

  // Generate round robin schedule using circle method
  for (let round = 0; round < players.length - 1; round++) {
    for (let i = 0; i < players.length / 2; i++) {
      const player1 = players[i];
      const player2 = players[players.length - 1 - i];

      // Skip matches with "BYE" player
      if (player1 !== "BYE" && player2 !== "BYE") {
        matches.push({
          tournament_id: "", // Will be set when creating
          player1_id: player1,
          player2_id: player2,
        });
      }
    }

    // Rotate players (keep first player fixed, rotate the rest)
    const lastPlayer = players[players.length - 1];
    for (let i = players.length - 1; i > 1; i--) {
      players[i] = players[i - 1];
    }
    players[1] = lastPlayer;
  }

  return matches;
}

// Calculate standings for round robin phase
export function calculateRoundRobinStandings(
  participants: Array<{ user_id: string; display_name: string; total_points: number; matches_played: number; matches_won: number }>
): RoundRobinStandings[] {
  return participants
    .map((participant) => ({
      user_id: participant.user_id,
      display_name: participant.display_name,
      total_points: participant.total_points,
      burst_points: 0, // Will be calculated from battles
      ringout_points: 0, // Will be calculated from battles
      spinout_points: 0, // Will be calculated from battles
      matches_played: participant.matches_played,
      matches_won: participant.matches_won,
      win_percentage: participant.matches_played > 0 
        ? Math.round((participant.matches_won / participant.matches_played) * 100 * 100) / 100
        : 0,
      rank: 0,
    }))
    .sort((a, b) => {
      // Sort by total points (descending)
      if (b.total_points !== a.total_points) {
        return b.total_points - a.total_points;
      }
      // Then by win percentage (descending)
      if (b.win_percentage !== a.win_percentage) {
        return b.win_percentage - a.win_percentage;
      }
      // Then by matches won (descending)
      return b.matches_won - a.matches_won;
    })
    .map((standing, index) => ({
      ...standing,
      rank: index + 1,
    }));
}

// Generate single elimination bracket matches
export function generateSingleEliminationBracket(
  participants: string[]
): { matches: BracketMatch[]; createMatches: CreateMatch[] } {
  const matches: BracketMatch[] = [];
  const createMatches: CreateMatch[] = [];
  const n = participants.length;

  // Calculate number of rounds needed
  const rounds = Math.ceil(Math.log2(n));
  const totalSlots = Math.pow(2, rounds);

  // Create first round matches
  for (let i = 0; i < totalSlots / 2; i++) {
    const player1Index = i * 2;
    const player2Index = i * 2 + 1;

    const match: BracketMatch = {
      id: `match-${i}`,
      round: 1,
      match_number: i + 1,
      bracket_type: "upper",
             player1: player1Index < participants.length ? { id: participants[player1Index], display_name: participants[player1Index] } as User : undefined,
       player2: player2Index < participants.length ? { id: participants[player2Index], display_name: participants[player2Index] } as User : undefined,
      winner: undefined,
      player1_score: 0,
      player2_score: 0,
      status: "pending",
    };

    matches.push(match);

    createMatches.push({
      tournament_id: "",
      phase_id: "",
      round: 1,
      match_number: i + 1,
      bracket_type: "upper",
      player1_id: player1Index < participants.length ? participants[player1Index] : undefined,
      player2_id: player2Index < participants.length ? participants[player2Index] : undefined,
    });
  }

  // Create subsequent rounds (empty matches that will be populated as winners advance)
  for (let round = 2; round <= rounds; round++) {
    const matchesInRound = Math.pow(2, rounds - round);
    for (let i = 0; i < matchesInRound; i++) {
      const match: BracketMatch = {
        id: `match-${round}-${i}`,
        round,
        match_number: i + 1,
        bracket_type: round === rounds ? "final" : "upper",
        player1: undefined,
        player2: undefined,
        winner: undefined,
        player1_score: 0,
        player2_score: 0,
        status: "pending",
      };

      matches.push(match);

      createMatches.push({
        tournament_id: "",
        phase_id: "",
        round,
        match_number: i + 1,
        bracket_type: round === rounds ? "final" : "upper",
      });
    }
  }

  return { matches, createMatches };
}

// Generate double elimination bracket
export function generateDoubleEliminationBracket(
  participants: string[]
): { bracket: TournamentBracket; createMatches: CreateMatch[] } {
  const { matches: upperBracketMatches, createMatches: upperCreateMatches } = generateSingleEliminationBracket(participants);
  
  // For now, we'll use single elimination structure
  // Double elimination can be implemented later with more complex logic
  const bracket: TournamentBracket = {
    upper_bracket: upperBracketMatches,
    lower_bracket: [],
    final_matches: [],
    total_rounds: Math.max(...upperBracketMatches.map(m => m.round)),
  };

  return { bracket, createMatches: upperCreateMatches };
}

// Update match result with Beyblade X battle system
export async function updateMatchResult(
  matchId: string,
  battles: BattleResult[]
): Promise<void> {
  // This function will be implemented to update the database
  // with battle results and calculate match winner
  console.log(`Updating match ${matchId} with ${battles.length} battles`);
}

// Calculate points for a single battle
export function calculateBattlePoints(finishType: "burst" | "ringout" | "spinout"): number {
  switch (finishType) {
    case "burst":
      return 3;
    case "ringout":
      return 2;
    case "spinout":
      return 1;
    default:
      return 0;
  }
}

// Get tournament statistics
export function getTournamentStats(
  bracket: TournamentBracket | BracketMatch[] | unknown
): TournamentStats {
  let totalMatches = 0;
  let completedMatches = 0;

  // Type guard for rounds
  function hasRounds(obj: unknown): obj is { rounds: { matches: BracketMatch[] }[] } {
    return typeof obj === 'object' && obj !== null && Array.isArray((obj as Record<string, unknown>).rounds);
  }

  if (Array.isArray(bracket)) {
    // Handle old array format
    totalMatches = bracket.length;
    completedMatches = bracket.filter((match: BracketMatch) => match.status === "completed").length;
  } else if (hasRounds(bracket)) {
    // Handle old single elimination format
    const allMatches = bracket.rounds.flatMap((round: { matches: BracketMatch[] }) => round.matches);
    totalMatches = allMatches.length;
    completedMatches = allMatches.filter((match: BracketMatch) => match.status === "completed").length;
  } else if (bracket && typeof bracket === 'object' && 'upper_bracket' in bracket && 'lower_bracket' in bracket && 'final_matches' in bracket) {
    // Handle new TournamentBracket format
    const allMatches = [
      ...(bracket as TournamentBracket).upper_bracket,
      ...(bracket as TournamentBracket).lower_bracket,
      ...(bracket as TournamentBracket).final_matches,
    ];
    totalMatches = allMatches.length;
    completedMatches = allMatches.filter((match: BracketMatch) => match.status === "completed").length;
  }

  const progress = totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0;

  return {
    total_matches: totalMatches,
    completed_matches: completedMatches,
    total_participants: 0, // Will be calculated from participants
    current_round: 0, // Not calculated here
    total_rounds: 0, // Not calculated here
    progress,
  };
}
