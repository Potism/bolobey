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
      <div
        key={`${match.round}-${match.match_number}`}
        className={`
          relative transition-all duration-300 cursor-pointer group
          ${isClickable ? "hover:scale-105" : ""}
        `}
        onClick={() => handleMatchClick(match)}
      >
        {/* Match Container */}
        <div
          className={`
            relative overflow-hidden rounded-lg border-2 shadow-lg
            ${
              status === "completed"
                ? "bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border-emerald-300 dark:border-emerald-600 shadow-emerald-500/20"
                : ""
            }
            ${
              status === "ready"
                ? "bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-300 dark:border-blue-600 shadow-blue-500/20 hover:shadow-xl hover:border-blue-400 dark:hover:border-blue-500"
                : ""
            }
            ${
              status === "waiting"
                ? "bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-900/20 dark:to-gray-900/20 border-slate-300 dark:border-slate-600"
                : ""
            }
            ${
              status === "bye"
                ? "bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-amber-300 dark:border-amber-600 shadow-amber-500/20"
                : ""
            }
          `}
        >
          {match.is_bye ? (
            <div className="p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-amber-200 to-yellow-200 dark:from-amber-800/50 dark:to-yellow-800/50 rounded-full flex items-center justify-center shadow-sm">
                <Zap className="h-6 w-6 text-amber-700 dark:text-amber-300" />
              </div>
              <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
                Bye
              </p>
              {match.winner && (
                <p className="text-xs text-muted-foreground mt-1 font-medium">
                  {match.winner.user?.display_name}
                </p>
              )}
            </div>
          ) : (
            <div className="p-4">
              {/* Match Number */}
              <div className="absolute top-2 right-2">
                <Badge
                  variant="outline"
                  className="text-xs font-bold bg-background/90 backdrop-blur-sm border"
                >
                  M{match.match_number}
                </Badge>
              </div>

              {/* Players */}
              <div className="space-y-2">
                <PlayerSlot
                  player={match.player1}
                  score={match.player1_score}
                  isWinner={match.winner?.user_id === match.player1?.user_id}
                  isCompleted={match.status === "completed"}
                />
                <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                <PlayerSlot
                  player={match.player2}
                  score={match.player2_score}
                  isWinner={match.winner?.user_id === match.player2?.user_id}
                  isCompleted={match.status === "completed"}
                />
              </div>

              {/* Status indicator */}
              <div className="flex items-center justify-center mt-3">
                {status === "completed" && (
                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200 border-emerald-200 dark:border-emerald-700 text-xs">
                    <Trophy className="w-3 h-3 mr-1" />
                    Completed
                  </Badge>
                )}
                {status === "ready" && (
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 border-blue-200 dark:border-blue-700 text-xs group-hover:bg-blue-200 dark:group-hover:bg-blue-800/40 transition-colors">
                    <Clock className="w-3 h-3 mr-1" />
                    Ready
                  </Badge>
                )}
                {status === "waiting" && (
                  <Badge variant="secondary" className="text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    Waiting
                  </Badge>
                )}
                {isAdmin && status === "ready" && (
                  <Edit className="w-3 h-3 ml-2 opacity-60 group-hover:opacity-100 transition-opacity" />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* Champion */}
      {bracket.champion && (
        <div className="text-center mb-12">
          <Card className="max-w-md mx-auto bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 dark:from-yellow-900/20 dark:via-amber-900/20 dark:to-orange-900/20 border-2 border-yellow-300 dark:border-yellow-600 shadow-2xl">
            <CardContent className="p-8">
              <div className="flex items-center justify-center gap-4 mb-6">
                <Crown className="h-10 w-10 text-yellow-600 dark:text-yellow-400" />
                <h2 className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 dark:from-yellow-400 dark:to-orange-400 bg-clip-text text-transparent">
                  Champion
                </h2>
                <Crown className="h-10 w-10 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="flex items-center justify-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-200 to-amber-200 dark:from-yellow-800/50 dark:to-amber-800/50 flex items-center justify-center shadow-lg">
                  <User className="h-8 w-8 text-yellow-700 dark:text-yellow-300" />
                </div>
                <div className="text-left">
                  <span className="text-xl font-bold text-yellow-800 dark:text-yellow-200">
                    {bracket.champion.user?.display_name}
                  </span>
                  <p className="text-sm text-muted-foreground">
                    Tournament Winner
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-yellow-200 dark:border-yellow-700">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Trophy className="h-4 w-4" />
                  <span>🏆 Tournament Complete</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bracket */}
      <div className="relative">
        <div className="flex gap-16 overflow-x-auto pb-8">
          {bracket.rounds.map((round, roundIndex) => (
            <div
              key={round.round}
              className="flex flex-col items-center gap-8 min-w-max relative"
            >
              {/* Round Header */}
              <div className="text-center mb-8">
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 rounded-lg p-4 border border-primary/20">
                  <h3 className="text-xl font-bold text-primary mb-2">
                    {round.name}
                  </h3>
                  <Badge
                    variant="outline"
                    className="text-xs font-mono bg-background/80 backdrop-blur-sm"
                  >
                    Round {round.round}
                  </Badge>
                </div>
              </div>

              {/* Matches */}
              <div className="flex flex-col gap-12">
                {round.matches.map((match) => (
                  <div key={match.id} className="relative">
                    {getMatchCard(match)}

                    {/* Vertical lines extending from matches */}
                    {roundIndex < bracket.rounds.length - 1 && (
                      <div className="absolute top-1/2 -right-8 w-16 h-px bg-gradient-to-r from-primary/40 to-transparent" />
                    )}

                    {/* Horizontal lines connecting to next round */}
                    {roundIndex < bracket.rounds.length - 1 && (
                      <div className="absolute top-1/2 -right-8 w-8 h-px bg-primary/40" />
                    )}
                  </div>
                ))}
              </div>

              {/* Connecting lines for next rounds */}
              {roundIndex < bracket.rounds.length - 1 && (
                <div className="absolute left-0 top-0 w-full h-full pointer-events-none">
                  <svg className="w-full h-full">
                    {round.matches.map((match, matchIndex) => {
                      const nextRoundMatchIndex = Math.floor(matchIndex / 2);
                      const currentMatchY = 140 + matchIndex * 144; // Center of current match
                      const nextMatchY = 140 + nextRoundMatchIndex * 144; // Center of next match

                      // Calculate positions based on card width and spacing
                      const cardWidth = 320; // Approximate card width
                      const gap = 64; // Gap between rounds
                      const x1 = cardWidth + gap / 2; // End of current round
                      const x2 = cardWidth + gap; // Start of next round
                      const x3 = cardWidth + gap + gap / 2; // Middle of next round

                      return (
                        <g
                          key={`connector-${round.round}-${match.match_number}`}
                        >
                          {/* Main connecting line */}
                          <path
                            d={`M ${x1} ${currentMatchY} L ${x2} ${currentMatchY} L ${x2} ${nextMatchY} L ${x3} ${nextMatchY}`}
                            stroke="currentColor"
                            strokeWidth="2"
                            fill="none"
                            className="text-primary/40"
                            strokeLinecap="round"
                          />

                          {/* Connection dots */}
                          <circle
                            cx={x2}
                            cy={currentMatchY}
                            r="2"
                            fill="currentColor"
                            className="text-primary/60"
                          />
                          <circle
                            cx={x2}
                            cy={nextMatchY}
                            r="2"
                            fill="currentColor"
                            className="text-primary/60"
                          />

                          {/* Vertical line from current match */}
                          <line
                            x1={x1}
                            y1={currentMatchY}
                            x2={x1}
                            y2={currentMatchY}
                            stroke="currentColor"
                            strokeWidth="2"
                            className="text-primary/40"
                          />

                          {/* Vertical line to next match */}
                          <line
                            x1={x3}
                            y1={nextMatchY}
                            x2={x3}
                            y2={nextMatchY}
                            stroke="currentColor"
                            strokeWidth="2"
                            className="text-primary/40"
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
        <DialogContent className="sm:max-w-lg bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-2xl mx-4 p-0">
          <DialogHeader className="pb-4 px-6 pt-6">
            <DialogTitle className="text-2xl font-bold text-center">
              Update Match Result
            </DialogTitle>
          </DialogHeader>
          {selectedMatch && (
            <div className="space-y-8 px-6 pb-6">
              {/* Match Info */}
              <div className="text-center p-6 bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 rounded-xl border border-primary/20">
                <p className="text-sm text-muted-foreground font-medium">
                  Match #{selectedMatch.match_number}
                </p>
                <p className="text-lg font-bold text-primary">
                  Round {selectedMatch.round}
                </p>
              </div>

              {/* Players and Scores */}
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="text-center">
                    <Label className="text-sm font-medium text-muted-foreground">
                      Player 1
                    </Label>
                    <p className="font-bold text-xl mt-2 text-foreground">
                      {selectedMatch.player1?.user?.display_name}
                    </p>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    value={player1Score}
                    onChange={(e) =>
                      setPlayer1Score(parseInt(e.target.value) || 0)
                    }
                    className="text-center text-xl font-mono font-bold h-12 text-lg"
                    placeholder="0"
                  />
                  <Button
                    variant={
                      winnerId === selectedMatch.player1?.user_id
                        ? "default"
                        : "outline"
                    }
                    size="lg"
                    onClick={() =>
                      setWinnerId(selectedMatch.player1?.user_id || "")
                    }
                    className="w-full h-12"
                  >
                    {winnerId === selectedMatch.player1?.user_id ? (
                      <>
                        <Trophy className="w-5 h-5 mr-2" />
                        Winner
                      </>
                    ) : (
                      "Select Winner"
                    )}
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="text-center">
                    <Label className="text-sm font-medium text-muted-foreground">
                      Player 2
                    </Label>
                    <p className="font-bold text-xl mt-2 text-foreground">
                      {selectedMatch.player2?.user?.display_name}
                    </p>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    value={player2Score}
                    onChange={(e) =>
                      setPlayer2Score(parseInt(e.target.value) || 0)
                    }
                    className="text-center text-xl font-mono font-bold h-12 text-lg"
                    placeholder="0"
                  />
                  <Button
                    variant={
                      winnerId === selectedMatch.player2?.user_id
                        ? "default"
                        : "outline"
                    }
                    size="lg"
                    onClick={() =>
                      setWinnerId(selectedMatch.player2?.user_id || "")
                    }
                    className="w-full h-12"
                  >
                    {winnerId === selectedMatch.player2?.user_id ? (
                      <>
                        <Trophy className="w-5 h-5 mr-2" />
                        Winner
                      </>
                    ) : (
                      "Select Winner"
                    )}
                  </Button>
                </div>
              </div>

              {/* Score Display */}
              <div className="text-center p-6 bg-gradient-to-r from-muted/30 to-muted/50 dark:from-muted/20 dark:to-muted/40 rounded-xl border">
                <p className="text-sm text-muted-foreground mb-2 font-medium">
                  Current Score
                </p>
                <p className="text-3xl font-bold font-mono text-foreground">
                  {player1Score} - {player2Score}
                </p>
              </div>

              {/* Instructions */}
              {!winnerId && (
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                    💡 Select a winner by clicking the &quot;Select Winner&quot;
                    button above
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4 pt-6">
                <Button
                  variant="outline"
                  onClick={() => setSelectedMatch(null)}
                  className="flex-1 h-12 text-base font-medium"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleScoreUpdate}
                  disabled={isUpdating || !winnerId}
                  className={`flex-1 h-12 text-base font-medium ${
                    !winnerId ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {isUpdating ? (
                    <>
                      <div className="w-5 h-5 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Updating...
                    </>
                  ) : !winnerId ? (
                    "Select Winner First"
                  ) : (
                    "Update Match"
                  )}
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
      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-100/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
            <User className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          </div>
          <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">
            TBD
          </span>
        </div>
        <span className="text-sm text-slate-500 dark:text-slate-400 font-mono">
          -
        </span>
      </div>
    );
  }

  return (
    <div
      className={`
      flex items-center justify-between p-3 rounded-lg transition-all duration-200 border
      ${
        isWinner && isCompleted
          ? "bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 border-amber-300 dark:border-amber-600 font-semibold shadow-sm"
          : "bg-white/80 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-600/60 hover:bg-white dark:hover:bg-slate-800/60"
      }
    `}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div
          className={`
          w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0
          ${
            isWinner && isCompleted
              ? "bg-gradient-to-br from-amber-200 to-yellow-200 dark:from-amber-800/50 dark:to-yellow-800/50"
              : "bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-800/40 dark:to-indigo-800/40"
          }
        `}
        >
          <User
            className={`h-4 w-4 transition-colors duration-200 ${
              isWinner && isCompleted
                ? "text-amber-700 dark:text-amber-300"
                : "text-blue-600 dark:text-blue-300"
            }`}
          />
        </div>
        <span
          className={`text-sm truncate font-medium transition-colors duration-200 ${
            isWinner && isCompleted
              ? "text-amber-800 dark:text-amber-200"
              : "text-slate-700 dark:text-slate-300"
          }`}
        >
          {player.user?.display_name || "Unknown"}
        </span>
        {isWinner && isCompleted && (
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-200 to-yellow-200 dark:from-amber-800/50 dark:to-yellow-800/50 flex items-center justify-center flex-shrink-0">
            <Trophy className="h-3 w-3 text-amber-700 dark:text-amber-300" />
          </div>
        )}
      </div>
      <div
        className={`
        text-base font-mono font-bold transition-all duration-200 flex-shrink-0 ml-2
        ${
          isCompleted
            ? isWinner
              ? "text-amber-700 dark:text-amber-300"
              : "text-slate-700 dark:text-slate-300"
            : "text-slate-400 dark:text-slate-500"
        }
      `}
      >
        {isCompleted ? score : "-"}
      </div>
    </div>
  );
}
