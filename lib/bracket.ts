import { TournamentParticipant, User, CreateMatch } from "./types";

export interface BracketParticipant extends TournamentParticipant {
  user?: User;
}

export interface BracketMatch {
  id?: string;
  round: number;
  match_number: number;
  player1?: BracketParticipant;
  player2?: BracketParticipant;
  winner?: BracketParticipant;
  player1_score: number;
  player2_score: number;
  status: "pending" | "in_progress" | "completed";
  is_bye: boolean;
}

export interface BracketRound {
  round: number;
  name: string;
  matches: BracketMatch[];
}

export interface TournamentBracket {
  rounds: BracketRound[];
  champion?: BracketParticipant;
}

/**
 * Generate a single elimination bracket
 */
export function generateSingleEliminationBracket(
  participants: BracketParticipant[],
  tournamentId: string
): { bracket: TournamentBracket; matches: CreateMatch[] } {
  if (participants.length < 2) {
    throw new Error("Need at least 2 participants to create a bracket");
  }

  // Sort participants by seed (if available) or random order
  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.seed && b.seed) return a.seed - b.seed;
    return Math.random() - 0.5; // Random if no seeds
  });

  // Calculate number of rounds needed
  const numRounds = Math.ceil(Math.log2(participants.length));
  const totalSlots = Math.pow(2, numRounds);

  // Add byes if needed
  const paddedParticipants: (BracketParticipant | null)[] = [
    ...sortedParticipants,
  ];
  while (paddedParticipants.length < totalSlots) {
    paddedParticipants.push(null); // null represents a bye
  }

  const rounds: BracketRound[] = [];
  const matches: CreateMatch[] = [];
  let currentParticipants: (BracketParticipant | null)[] = paddedParticipants;

  // Generate rounds from first to final
  for (let roundIndex = 0; roundIndex < numRounds; roundIndex++) {
    const round: BracketRound = {
      round: roundIndex + 1,
      name: getRoundName(roundIndex + 1, numRounds),
      matches: [],
    };

    const roundMatches: BracketMatch[] = [];
    const nextRoundParticipants: (BracketParticipant | null)[] = [];

    // Create matches for this round
    for (let i = 0; i < currentParticipants.length; i += 2) {
      const player1 = currentParticipants[i];
      const player2 = currentParticipants[i + 1];
      const matchNumber = Math.floor(i / 2) + 1;

      // Check if this is a bye match
      const isBye = !player1 || !player2;

      let winner: BracketParticipant | undefined;
      let status: "pending" | "completed" = "pending";

      // Auto-advance if it's a bye
      if (isBye) {
        winner = player1 || player2 || undefined;
        status = "completed";
      }

      const bracketMatch: BracketMatch = {
        round: roundIndex + 1,
        match_number: matchNumber,
        player1: player1 || undefined,
        player2: player2 || undefined,
        winner,
        player1_score: 0,
        player2_score: 0,
        status,
        is_bye: isBye,
      };

      roundMatches.push(bracketMatch);

      // Create database match record
      if (player1 || player2) {
        const dbMatch: CreateMatch = {
          tournament_id: tournamentId,
          round: roundIndex + 1,
          match_number: matchNumber,
          player1_id: player1?.user_id || null,
          player2_id: player2?.user_id || null,
          winner_id: winner?.user_id || null,
          status: status,
        };
        matches.push(dbMatch);
      }

      // Determine who advances to next round
      if (roundIndex < numRounds - 1) {
        nextRoundParticipants.push(winner || null);
      }
    }

    round.matches = roundMatches;
    rounds.push(round);
    currentParticipants = nextRoundParticipants;
  }

  // Determine champion
  const finalMatch = rounds[rounds.length - 1]?.matches[0];
  const champion = finalMatch?.winner;

  return {
    bracket: { rounds, champion },
    matches,
  };
}

/**
 * Get human-readable round name
 */
function getRoundName(round: number, totalRounds: number): string {
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
}

/**
 * Update match result and progress bracket
 */
export function updateMatchResult(
  bracket: TournamentBracket,
  roundNumber: number,
  matchNumber: number,
  winnerId: string,
  player1Score: number,
  player2Score: number
): TournamentBracket {
  const updatedBracket = JSON.parse(
    JSON.stringify(bracket)
  ) as TournamentBracket;

  // Find and update the match
  const round = updatedBracket.rounds.find((r) => r.round === roundNumber);
  if (!round) throw new Error("Round not found");

  const match = round.matches.find((m) => m.match_number === matchNumber);
  if (!match) throw new Error("Match not found");

  // Update match result
  match.player1_score = player1Score;
  match.player2_score = player2Score;
  match.status = "completed";

  // Determine winner
  if (match.player1?.user_id === winnerId) {
    match.winner = match.player1;
  } else if (match.player2?.user_id === winnerId) {
    match.winner = match.player2;
  } else {
    throw new Error("Invalid winner ID");
  }

  // Progress winner to next round if not final
  if (roundNumber < updatedBracket.rounds.length) {
    const nextRound = updatedBracket.rounds[roundNumber]; // 0-indexed
    const nextMatchNumber = Math.ceil(matchNumber / 2);
    const nextMatch = nextRound.matches.find(
      (m) => m.match_number === nextMatchNumber
    );

    if (nextMatch) {
      // Determine if winner goes to player1 or player2 slot
      const isFirstSlot = (matchNumber - 1) % 2 === 0;
      if (isFirstSlot) {
        nextMatch.player1 = match.winner;
      } else {
        nextMatch.player2 = match.winner;
      }

      // If both players are now set, match can begin
      if (nextMatch.player1 && nextMatch.player2) {
        nextMatch.status = "pending";
      }
    }
  }

  // Update champion if this was the final
  if (roundNumber === updatedBracket.rounds.length) {
    updatedBracket.champion = match.winner;
  }

  return updatedBracket;
}

/**
 * Get next available matches that can be played
 */
export function getAvailableMatches(
  bracket: TournamentBracket
): BracketMatch[] {
  const availableMatches: BracketMatch[] = [];

  for (const round of bracket.rounds) {
    for (const match of round.matches) {
      if (
        match.status === "pending" &&
        match.player1 &&
        match.player2 &&
        !match.is_bye
      ) {
        availableMatches.push(match);
      }
    }
  }

  return availableMatches;
}

/**
 * Check if tournament is complete
 */
export function isTournamentComplete(bracket: TournamentBracket): boolean {
  const finalRound = bracket.rounds[bracket.rounds.length - 1];
  const finalMatch = finalRound?.matches[0];
  return finalMatch?.status === "completed" && !!finalMatch.winner;
}

/**
 * Get tournament statistics
 */
export function getTournamentStats(bracket: TournamentBracket) {
  let totalMatches = 0;
  let completedMatches = 0;
  let pendingMatches = 0;

  for (const round of bracket.rounds) {
    for (const match of round.matches) {
      if (!match.is_bye) {
        totalMatches++;
        if (match.status === "completed") {
          completedMatches++;
        } else if (
          match.status === "pending" &&
          match.player1 &&
          match.player2
        ) {
          pendingMatches++;
        }
      }
    }
  }

  return {
    totalMatches,
    completedMatches,
    pendingMatches,
    progress: totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0,
  };
}
