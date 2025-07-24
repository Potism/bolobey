"use client";

import { useState } from "react";
import {
  TournamentBracket,
  BracketMatch,
  BracketParticipant,
} from "@/lib/bracket";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trophy, Crown, Zap, User, Clock, Edit } from "lucide-react";

interface BracketVisualizationProps {
  bracket: TournamentBracket;
  isAdmin?: boolean;
  onMatchUpdate?: (
    roundNumber: number,
    matchNumber: number,
    winnerId: string,
    player1Score: number,
    player2Score: number
  ) => Promise<void>;
}

export function BracketVisualization({
  bracket,
  isAdmin = false,
  onMatchUpdate,
}: BracketVisualizationProps) {
  const [selectedMatch, setSelectedMatch] = useState<BracketMatch | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [player1Score, setPlayer1Score] = useState(0);
  const [player2Score, setPlayer2Score] = useState(0);
  const [winnerId, setWinnerId] = useState("");

  const handleMatchClick = (match: BracketMatch) => {
    if (isAdmin && match.player1 && match.player2 && !match.is_bye) {
      setSelectedMatch(match);
      setPlayer1Score(match.player1_score);
      setPlayer2Score(match.player2_score);
      setWinnerId(match.winner?.user_id || "");
    }
  };

  const handleScoreUpdate = async () => {
    if (!selectedMatch || !onMatchUpdate) return;

    // Determine winner based on scores
    let winner = winnerId;
    if (!winner) {
      if (player1Score > player2Score) {
        winner = selectedMatch.player1?.user_id || "";
      } else if (player2Score > player1Score) {
        winner = selectedMatch.player2?.user_id || "";
      } else {
        // Tie - require manual selection
        return;
      }
    }

    setIsUpdating(true);
    try {
      await onMatchUpdate(
        selectedMatch.round,
        selectedMatch.match_number,
        winner,
        player1Score,
        player2Score
      );
      setSelectedMatch(null);
    } catch (error) {
      console.error("Failed to update match:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getMatchStatus = (match: BracketMatch) => {
    if (match.is_bye) return "bye";
    if (match.status === "completed") return "completed";
    if (match.player1 && match.player2) return "ready";
    return "waiting";
  };

  const getMatchCard = (match: BracketMatch) => {
    const status = getMatchStatus(match);
    const isClickable = isAdmin && status === "ready";

    return (
      <Card
        key={`${match.round}-${match.match_number}`}
        className={`
          relative overflow-hidden transition-all duration-300 w-64 h-32 cursor-pointer
          ${
            status === "completed"
              ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800"
              : ""
          }
          ${
            status === "ready"
              ? "bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800 hover:shadow-lg"
              : ""
          }
          ${status === "waiting" ? "bg-muted/50" : ""}
          ${
            status === "bye"
              ? "bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800"
              : ""
          }
          ${isClickable ? "hover:scale-105" : ""}
        `}
        onClick={() => handleMatchClick(match)}
      >
        <CardContent className="p-4 h-full flex flex-col justify-between">
          {match.is_bye ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Zap className="h-6 w-6 mx-auto mb-2 text-yellow-600 dark:text-yellow-400" />
                <p className="text-sm font-medium">Bye</p>
                {match.winner && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {match.winner.user?.display_name}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Match Number */}
              <div className="absolute top-2 right-2">
                <Badge variant="outline" className="text-xs">
                  M{match.match_number}
                </Badge>
              </div>

              {/* Players */}
              <div className="space-y-2 flex-1">
                <PlayerSlot
                  player={match.player1}
                  score={match.player1_score}
                  isWinner={match.winner?.user_id === match.player1?.user_id}
                  isCompleted={match.status === "completed"}
                />
                <div className="h-px bg-border" />
                <PlayerSlot
                  player={match.player2}
                  score={match.player2_score}
                  isWinner={match.winner?.user_id === match.player2?.user_id}
                  isCompleted={match.status === "completed"}
                />
              </div>

              {/* Status indicator */}
              <div className="flex items-center justify-center mt-2">
                {status === "completed" && (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                    <Trophy className="w-3 h-3 mr-1" />
                    Completed
                  </Badge>
                )}
                {status === "ready" && (
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                    <Clock className="w-3 h-3 mr-1" />
                    Ready
                  </Badge>
                )}
                {status === "waiting" && (
                  <Badge variant="secondary">
                    <Clock className="w-3 h-3 mr-1" />
                    Waiting
                  </Badge>
                )}
                {isAdmin && status === "ready" && (
                  <Edit className="w-3 h-3 ml-2 opacity-50" />
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="w-full">
      {/* Champion */}
      {bracket.champion && (
        <div className="text-center mb-8">
          <Card className="max-w-sm mx-auto bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Crown className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                <h2 className="text-2xl font-bold">Champion</h2>
                <Crown className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="flex items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                  <User className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <span className="text-lg font-semibold">
                  {bracket.champion.user?.display_name}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bracket */}
      <div className="relative">
        <div className="flex gap-8 overflow-x-auto pb-4">
          {bracket.rounds.map((round, roundIndex) => (
            <div
              key={round.round}
              className="flex flex-col items-center gap-4 min-w-max"
            >
              {/* Round Header */}
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold">{round.name}</h3>
                <Badge variant="outline" className="text-xs">
                  Round {round.round}
                </Badge>
              </div>

              {/* Matches */}
              <div className="flex flex-col gap-6">
                {round.matches.map((match) => getMatchCard(match))}
              </div>

              {/* Connecting lines for next rounds */}
              {roundIndex < bracket.rounds.length - 1 && (
                <div className="absolute left-0 top-0 w-full h-full pointer-events-none">
                  <svg className="w-full h-full">
                    {round.matches.map((match, matchIndex) => {
                      const nextRoundMatchIndex = Math.floor(matchIndex / 2);
                      const x1 = (roundIndex + 1) * 288 - 24; // End of current match card
                      const x2 = (roundIndex + 1) * 288 + 32; // Start of next match card
                      const y1 = 80 + matchIndex * 152 + 64; // Center of current match
                      const y2 = 80 + nextRoundMatchIndex * 152 + 64; // Center of next match

                      return (
                        <g
                          key={`connector-${round.round}-${match.match_number}`}
                        >
                          <path
                            d={`M ${x1} ${y1} L ${x1 + 16} ${y1} L ${
                              x1 + 16
                            } ${y2} L ${x2} ${y2}`}
                            stroke="currentColor"
                            strokeWidth="2"
                            fill="none"
                            className="text-border opacity-30"
                          />
                        </g>
                      );
                    })}
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Match Update Dialog */}
      <Dialog
        open={!!selectedMatch}
        onOpenChange={() => setSelectedMatch(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Match Result</DialogTitle>
          </DialogHeader>
          {selectedMatch && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{selectedMatch.player1?.user?.display_name}</Label>
                  <Input
                    type="number"
                    min="0"
                    value={player1Score}
                    onChange={(e) =>
                      setPlayer1Score(parseInt(e.target.value) || 0)
                    }
                  />
                  <Button
                    variant={
                      winnerId === selectedMatch.player1?.user_id
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      setWinnerId(selectedMatch.player1?.user_id || "")
                    }
                    className="w-full"
                  >
                    Winner
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>{selectedMatch.player2?.user?.display_name}</Label>
                  <Input
                    type="number"
                    min="0"
                    value={player2Score}
                    onChange={(e) =>
                      setPlayer2Score(parseInt(e.target.value) || 0)
                    }
                  />
                  <Button
                    variant={
                      winnerId === selectedMatch.player2?.user_id
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      setWinnerId(selectedMatch.player2?.user_id || "")
                    }
                    className="w-full"
                  >
                    Winner
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedMatch(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleScoreUpdate}
                  disabled={isUpdating || !winnerId}
                  className="flex-1"
                >
                  {isUpdating ? "Updating..." : "Update Match"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlayerSlot({
  player,
  score,
  isWinner,
  isCompleted,
}: {
  player?: BracketParticipant;
  score: number;
  isWinner: boolean;
  isCompleted: boolean;
}) {
  if (!player) {
    return (
      <div className="flex items-center justify-between p-2 rounded bg-muted/50">
        <span className="text-sm text-muted-foreground">TBD</span>
        <span className="text-sm text-muted-foreground">-</span>
      </div>
    );
  }

  return (
    <div
      className={`
      flex items-center justify-between p-2 rounded transition-colors
      ${
        isWinner && isCompleted
          ? "bg-yellow-100 dark:bg-yellow-900/20 font-semibold"
          : "bg-muted/50"
      }
    `}
    >
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="h-3 w-3" />
        </div>
        <span className="text-sm truncate max-w-32">
          {player.user?.display_name || "Unknown"}
        </span>
        {isWinner && isCompleted && (
          <Trophy className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
        )}
      </div>
      <span className="text-sm font-mono">{isCompleted ? score : "-"}</span>
    </div>
  );
}
