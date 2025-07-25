"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  User,
  Trophy,
  Edit,
  Target,
  RotateCcw,
  Crown,
  Flame,
} from "lucide-react";
import { BracketMatch, BattleResult, TournamentBracket } from "@/lib/types";

interface BracketVisualizationProps {
  bracket: TournamentBracket;
  isAdmin?: boolean;
  onMatchUpdate?: (
    roundNumber: number,
    matchNumber: number,
    winnerId: string,
    player1Score: number,
    player2Score: number,
    battles?: BattleResult[]
  ) => Promise<void>;
}

export function BracketVisualization({
  bracket,
  isAdmin = false,
  onMatchUpdate,
}: BracketVisualizationProps) {
  const [selectedMatch, setSelectedMatch] = useState<BracketMatch | null>(null);
  const [player1Score, setPlayer1Score] = useState(0);
  const [player2Score, setPlayer2Score] = useState(0);
  const [winnerId, setWinnerId] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [battles, setBattles] = useState<BattleResult[]>([]);
  const [currentBattle, setCurrentBattle] = useState<BattleResult>({
    winner_id: "",
    finish_type: "burst",
    player1_points: 0,
    player2_points: 0,
  });

  const handleMatchClick = (match: BracketMatch) => {
    if (!isAdmin || match.status === "completed") return;
    setSelectedMatch(match);
    setPlayer1Score(match.player1_score || 0);
    setPlayer2Score(match.player2_score || 0);
    setWinnerId(match.winner?.id || "");
    setBattles([]);
    setCurrentBattle({
      winner_id: "",
      finish_type: "burst",
      player1_points: 0,
      player2_points: 0,
    });
  };

  const handleScoreUpdate = async () => {
    if (!selectedMatch || !onMatchUpdate) return;
    setIsUpdating(true);
    try {
      await onMatchUpdate(
        selectedMatch.round,
        selectedMatch.match_number,
        winnerId,
        player1Score,
        player2Score,
        battles
      );
      setSelectedMatch(null);
    } catch (error) {
      console.error("Error updating match:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const addBattle = () => {
    if (!currentBattle.winner_id || !currentBattle.finish_type) return;
    setBattles([...battles, currentBattle]);
    setCurrentBattle({
      winner_id: "",
      finish_type: "burst",
      player1_points: 0,
      player2_points: 0,
    });
  };

  const removeBattle = (index: number) => {
    setBattles(battles.filter((_, i) => i !== index));
  };

  const getMatchStatus = (match: BracketMatch) => {
    if (match.status === "completed") return "completed";
    if (match.player1 && match.player2) return "ready";
    return "pending";
  };

  const getMatchCard = (match: BracketMatch) => {
    const status = getMatchStatus(match);
    const isCompleted = status === "completed";
    const isReady = status === "ready";

    return (
      <div
        key={match.id}
        className={`
          relative w-80 h-40 rounded-lg border-2 transition-all duration-200 cursor-pointer
          ${
            isCompleted
              ? "bg-success/10 text-success-foreground border-success shadow-sm"
              : isReady
              ? "bg-background text-foreground border-border hover:border-primary hover:shadow-md"
              : "bg-muted text-muted-foreground border-border"
          }
        `}
        onClick={() => handleMatchClick(match)}
      >
        {/* Match Number Badge */}
        <div className="absolute -top-3 -left-3">
          <Badge
            variant="secondary"
            className={`
              text-xs font-bold px-2 py-1 rounded-full
              ${
                isCompleted
                  ? "bg-success/20 text-success-foreground"
                  : "bg-muted text-muted-foreground"
              }
            `}
          >
            {match.bracket_type === "upper"
              ? "U"
              : match.bracket_type === "lower"
              ? "L"
              : "F"}
            -{match.round}.{match.match_number}
          </Badge>
        </div>

        {/* Status Badge */}
        <div className="absolute -top-3 -right-3">
          <Badge
            className={`
              text-xs font-bold px-2 py-1 rounded-full
              ${
                isCompleted
                  ? "bg-success text-white"
                  : isReady
                  ? "bg-muted text-muted-foreground"
                  : "bg-muted text-muted-foreground"
              }
            `}
          >
            {isCompleted ? "Completed" : isReady ? "Ready" : "Pending"}
          </Badge>
        </div>

        {/* Edit Button for Ready Matches */}
        {isReady && isAdmin && (
          <div className="absolute top-2 right-2">
            <Button
              size="sm"
              variant="outline"
              className="w-8 h-8 p-0 rounded-full bg-background/80 border-2 hover:bg-background dark:hover:bg-slate-800"
            >
              <Edit className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Player Slots */}
        <div className="p-4 space-y-3">
          <PlayerSlot
            player={match.player1}
            score={match.player1_score}
            isWinner={match.winner?.id === match.player1?.id}
            isCompleted={isCompleted}
          />
          <PlayerSlot
            player={match.player2}
            score={match.player2_score}
            isWinner={match.winner?.id === match.player2?.id}
            isCompleted={isCompleted}
          />
        </div>

        {/* Winner Indicator */}
        {isCompleted && match.winner && (
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
            <div className="bg-success text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
              <Crown className="w-3 h-3" />
              {match.winner.display_name}
            </div>
          </div>
        )}
      </div>
    );
  };

  const getBracketSection = (
    matches: BracketMatch[],
    title: string,
    bracketType: "upper" | "lower" | "final"
  ) => {
    const rounds = new Map<number, BracketMatch[]>();

    matches.forEach((match) => {
      if (!rounds.has(match.round)) {
        rounds.set(match.round, []);
      }
      rounds.get(match.round)!.push(match);
    });

    const getBracketColor = (type: string) => {
      switch (type) {
        case "upper":
          return "border-border bg-muted";
        case "lower":
          return "border-border bg-muted";
        case "final":
          return "border-border bg-muted";
        default:
          return "border-border bg-muted";
      }
    };

    return (
      <div className="space-y-8">
        <div
          className={`text-center p-4 rounded-lg border-2 ${getBracketColor(
            bracketType
          )}`}
        >
          <h3 className="text-xl font-bold text-foreground">{title}</h3>
        </div>

        <div className="relative">
          {/* SVG for connecting lines */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: 1 }}
          >
            {Array.from(rounds.entries()).map(
              ([round, roundMatches], roundIndex) => {
                if (roundIndex === rounds.size - 1) return null; // No lines after last round

                const nextRound = Array.from(rounds.entries())[roundIndex + 1];
                if (!nextRound) return null;

                const nextRoundMatches = nextRound[1];

                return roundMatches.map((match, matchIndex) => {
                  const nextMatch =
                    nextRoundMatches[Math.floor(matchIndex / 2)];
                  if (!nextMatch) return null;

                  // Calculate positions (simplified - you might want to make this more precise)
                  const currentX = roundIndex * 320 + 160; // 320px per round, 160px center of match
                  const currentY = matchIndex * 200 + 100; // 200px per match, 100px center of match card
                  const nextX = (roundIndex + 1) * 320 + 160;
                  const nextY = Math.floor(matchIndex / 2) * 200 + 100;

                  return (
                    <line
                      key={`line-${round}-${matchIndex}`}
                      x1={currentX}
                      y1={currentY}
                      x2={nextX}
                      y2={nextY}
                      stroke="#94a3b8"
                      strokeWidth="2"
                      strokeDasharray="5,5"
                      opacity="0.6"
                    />
                  );
                });
              }
            )}
          </svg>

          <div className="flex gap-16 relative" style={{ zIndex: 2 }}>
            {Array.from(rounds.entries()).map(([round, roundMatches]) => (
              <div key={round} className="space-y-6">
                <div className="text-center p-2 bg-muted rounded-lg border border-border">
                  <h4 className="font-bold text-sm text-muted-foreground">
                    Round {round}
                  </h4>
                </div>
                <div className="space-y-6">
                  {roundMatches.map(getMatchCard)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-12">
      {/* Upper Bracket */}
      {bracket.upper_bracket.length > 0 &&
        getBracketSection(
          bracket.upper_bracket,
          "Upper Bracket (Winners)",
          "upper"
        )}

      {/* Lower Bracket */}
      {bracket.lower_bracket.length > 0 &&
        getBracketSection(
          bracket.lower_bracket,
          "Lower Bracket (Losers)",
          "lower"
        )}

      {/* Final Matches */}
      {bracket.final_matches.length > 0 &&
        getBracketSection(bracket.final_matches, "Grand Finals", "final")}

      {/* Bracket Structure Explanation */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-bold text-blue-800 dark:text-blue-200 mb-2">
          🏆 Tournament Bracket Structure
        </h3>
        <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <p>
            • <strong>Upper Bracket:</strong> Winners advance, losers drop to
            Lower Bracket
          </p>
          <p>
            • <strong>Lower Bracket:</strong> Losers from Upper + losers from
            Lower (double elimination)
          </p>
          <p>
            • <strong>Grand Finals:</strong> Upper Bracket winner vs Lower
            Bracket winner
          </p>
          <p>
            • <strong>Click on matches</strong> to record results and advance
            players
          </p>
        </div>
      </div>

      {/* Enhanced Match Update Dialog */}
      <Dialog
        open={!!selectedMatch}
        onOpenChange={() => setSelectedMatch(null)}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto bg-background border-2 border-border shadow-2xl mx-2 sm:mx-4 p-0">
          <DialogHeader className="pb-4 px-4 sm:px-6 pt-4 sm:pt-6">
            <DialogTitle className="text-xl sm:text-2xl font-bold text-center">
              Update Match Result - Beyblade X
            </DialogTitle>
          </DialogHeader>
          {selectedMatch && (
            <div className="space-y-6 sm:space-y-8 px-4 sm:px-6 pb-4 sm:pb-6">
              {/* Match Info */}
              <div className="text-center p-4 sm:p-6 bg-muted rounded-lg border border-border">
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                  {selectedMatch.bracket_type === "upper"
                    ? "Upper Bracket"
                    : selectedMatch.bracket_type === "lower"
                    ? "Lower Bracket"
                    : "Grand Final"}
                </p>
                <p className="text-base sm:text-lg font-bold text-foreground">
                  Round {selectedMatch.round} - Match{" "}
                  {selectedMatch.match_number}
                </p>
              </div>

              {/* Players and Basic Scores */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
                <div className="space-y-3 sm:space-y-4">
                  <div className="text-center">
                    <Label className="text-sm font-medium text-muted-foreground">
                      Player 1
                    </Label>
                    <p className="font-bold text-lg sm:text-xl mt-1 sm:mt-2 text-foreground break-words">
                      {selectedMatch.player1?.display_name}
                    </p>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    value={player1Score}
                    onChange={(e) =>
                      setPlayer1Score(parseInt(e.target.value) || 0)
                    }
                    className="text-center text-lg sm:text-xl font-mono font-bold h-10 sm:h-12"
                    placeholder="0"
                  />
                  <Button
                    variant={
                      winnerId === selectedMatch.player1?.id
                        ? "default"
                        : "outline"
                    }
                    size="lg"
                    onClick={() => setWinnerId(selectedMatch.player1?.id || "")}
                    className="w-full h-10 sm:h-12 text-sm sm:text-base"
                  >
                    {winnerId === selectedMatch.player1?.id ? (
                      <>
                        <Trophy className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                        Winner
                      </>
                    ) : (
                      "Select Winner"
                    )}
                  </Button>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  <div className="text-center">
                    <Label className="text-sm font-medium text-muted-foreground">
                      Player 2
                    </Label>
                    <p className="font-bold text-lg sm:text-xl mt-1 sm:mt-2 text-foreground break-words">
                      {selectedMatch.player2?.display_name}
                    </p>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    value={player2Score}
                    onChange={(e) =>
                      setPlayer2Score(parseInt(e.target.value) || 0)
                    }
                    className="text-center text-lg sm:text-xl font-mono font-bold h-10 sm:h-12"
                    placeholder="0"
                  />
                  <Button
                    variant={
                      winnerId === selectedMatch.player2?.id
                        ? "default"
                        : "outline"
                    }
                    size="lg"
                    onClick={() => setWinnerId(selectedMatch.player2?.id || "")}
                    className="w-full h-10 sm:h-12 text-sm sm:text-base"
                  >
                    {winnerId === selectedMatch.player2?.id ? (
                      <>
                        <Trophy className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                        Winner
                      </>
                    ) : (
                      "Select Winner"
                    )}
                  </Button>
                </div>
              </div>

              {/* Battle Details */}
              <div className="space-y-4">
                <h4 className="text-lg font-bold text-center">
                  Battle Details
                </h4>

                {/* Current Battle Input */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 sm:p-4 bg-muted rounded-lg">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">
                      Battle Winner
                    </Label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        size="sm"
                        variant={
                          currentBattle.winner_id === selectedMatch.player1?.id
                            ? "default"
                            : "outline"
                        }
                        onClick={() =>
                          setCurrentBattle({
                            ...currentBattle,
                            winner_id: selectedMatch.player1?.id || "",
                          })
                        }
                        className="flex-1 text-xs sm:text-sm"
                      >
                        <span className="truncate">
                          {selectedMatch.player1?.display_name}
                        </span>
                      </Button>
                      <Button
                        size="sm"
                        variant={
                          currentBattle.winner_id === selectedMatch.player2?.id
                            ? "default"
                            : "outline"
                        }
                        onClick={() =>
                          setCurrentBattle({
                            ...currentBattle,
                            winner_id: selectedMatch.player2?.id || "",
                          })
                        }
                        className="flex-1 text-xs sm:text-sm"
                      >
                        <span className="truncate">
                          {selectedMatch.player2?.display_name}
                        </span>
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">
                      Finish Type
                    </Label>
                    <div className="flex flex-col sm:flex-row gap-1">
                      <Button
                        size="sm"
                        variant={
                          currentBattle.finish_type === "burst"
                            ? "default"
                            : "outline"
                        }
                        onClick={() =>
                          setCurrentBattle({
                            ...currentBattle,
                            finish_type: "burst",
                          })
                        }
                        className="flex-1 text-xs sm:text-sm"
                      >
                        <Flame className="w-3 h-3 mr-1" />
                        Burst
                      </Button>
                      <Button
                        size="sm"
                        variant={
                          currentBattle.finish_type === "ringout"
                            ? "default"
                            : "outline"
                        }
                        onClick={() =>
                          setCurrentBattle({
                            ...currentBattle,
                            finish_type: "ringout",
                          })
                        }
                        className="flex-1 text-xs sm:text-sm"
                      >
                        <Target className="w-3 h-3 mr-1" />
                        Ring-Out
                      </Button>
                      <Button
                        size="sm"
                        variant={
                          currentBattle.finish_type === "spinout"
                            ? "default"
                            : "outline"
                        }
                        onClick={() =>
                          setCurrentBattle({
                            ...currentBattle,
                            finish_type: "spinout",
                          })
                        }
                        className="flex-1 text-xs sm:text-sm"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Spin-Out
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Battle Points */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">
                      <span className="truncate">
                        {selectedMatch.player1?.display_name}
                      </span>{" "}
                      Points
                    </Label>
                    <div className="grid grid-cols-3 gap-1 sm:gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Bursts (3pts)
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          value={currentBattle.player1_points}
                          onChange={(e) =>
                            setCurrentBattle({
                              ...currentBattle,
                              player1_points: parseInt(e.target.value) || 0,
                            })
                          }
                          className="text-center h-8 sm:h-10 text-xs sm:text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Ring-Outs (2pts)
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          value={currentBattle.player1_points}
                          onChange={(e) =>
                            setCurrentBattle({
                              ...currentBattle,
                              player1_points: parseInt(e.target.value) || 0,
                            })
                          }
                          className="text-center h-8 sm:h-10 text-xs sm:text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Spin-Outs (1pt)
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          value={currentBattle.player1_points}
                          onChange={(e) =>
                            setCurrentBattle({
                              ...currentBattle,
                              player1_points: parseInt(e.target.value) || 0,
                            })
                          }
                          className="text-center h-8 sm:h-10 text-xs sm:text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">
                      <span className="truncate">
                        {selectedMatch.player2?.display_name}
                      </span>{" "}
                      Points
                    </Label>
                    <div className="grid grid-cols-3 gap-1 sm:gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Bursts (3pts)
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          value={currentBattle.player2_points}
                          onChange={(e) =>
                            setCurrentBattle({
                              ...currentBattle,
                              player2_points: parseInt(e.target.value) || 0,
                            })
                          }
                          className="text-center h-8 sm:h-10 text-xs sm:text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Ring-Outs (2pts)
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          value={currentBattle.player2_points}
                          onChange={(e) =>
                            setCurrentBattle({
                              ...currentBattle,
                              player2_points: parseInt(e.target.value) || 0,
                            })
                          }
                          className="text-center h-8 sm:h-10 text-xs sm:text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Spin-Outs (1pt)
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          value={currentBattle.player2_points}
                          onChange={(e) =>
                            setCurrentBattle({
                              ...currentBattle,
                              player2_points: parseInt(e.target.value) || 0,
                            })
                          }
                          className="text-center h-8 sm:h-10 text-xs sm:text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={addBattle}
                  disabled={
                    !currentBattle.winner_id || !currentBattle.finish_type
                  }
                  className="w-full h-10 sm:h-12 text-sm sm:text-base"
                >
                  Add Battle
                </Button>

                {/* Battle List */}
                {battles.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">
                      Battles Added
                    </Label>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {battles.map((battle, index) => (
                        <div
                          key={index}
                          className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 bg-muted rounded gap-2"
                        >
                          <span className="text-xs sm:text-sm flex-1">
                            Battle {index + 1}:{" "}
                            <span className="font-medium">
                              {battle.winner_id === selectedMatch.player1?.id
                                ? selectedMatch.player1?.display_name
                                : selectedMatch.player2?.display_name}
                            </span>{" "}
                            wins by{" "}
                            <span className="font-medium">
                              {battle.finish_type}
                            </span>
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeBattle(index)}
                            className="text-xs h-8 px-2"
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Instructions */}
              {!winnerId && (
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300 font-medium">
                    💡 Select a winner by clicking the &quot;Select Winner&quot;
                    button above
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 sm:pt-6">
                <Button
                  variant="outline"
                  onClick={() => setSelectedMatch(null)}
                  className="flex-1 h-10 sm:h-12 text-sm sm:text-base font-medium"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleScoreUpdate}
                  disabled={isUpdating || !winnerId}
                  className={`flex-1 h-10 sm:h-12 text-sm sm:text-base font-medium ${
                    !winnerId ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {isUpdating ? (
                    <>
                      <div className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
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
  player?: { id: string; display_name: string };
  score: number;
  isWinner: boolean;
  isCompleted: boolean;
}) {
  if (!player) {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
          <span className="text-sm text-muted-foreground font-medium">TBD</span>
        </div>
        <span className="text-sm text-muted-foreground font-mono">-</span>
      </div>
    );
  }

  return (
    <div
      className={`
      flex items-center justify-between p-3 rounded-lg transition-all duration-200 border
      ${
        isWinner && isCompleted
          ? "bg-accent/10 border-accent font-semibold shadow-sm text-accent-foreground"
          : "bg-background border-border hover:bg-muted text-foreground"
      }
    `}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div
          className={`
          w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0
          ${
            isWinner && isCompleted
              ? "bg-accent/20 border-accent"
              : "bg-blue-100 dark:bg-blue-800/40 border-blue-100 dark:border-blue-800"
          }
        `}
        >
          <User
            className={`h-4 w-4 transition-colors duration-200 ${
              isWinner && isCompleted
                ? "text-accent-foreground"
                : "text-blue-600 dark:text-blue-300"
            }`}
          />
        </div>
        <span
          className={`text-sm truncate font-medium transition-colors duration-200 ${
            isWinner && isCompleted
              ? "text-foreground"
              : "text-muted-foreground"
          }`}
        >
          {player.display_name}
        </span>
      </div>
      <span
        className={`text-sm font-mono font-bold transition-colors duration-200 flex-shrink-0 ${
          isWinner && isCompleted ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        {score}
      </span>
    </div>
  );
}
