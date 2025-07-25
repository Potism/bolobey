"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trophy, Zap, Target, TrendingUp, X, Calculator } from "lucide-react";
import { TournamentBracket, BracketMatch, BattleResult } from "@/lib/types";

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
  const [winnerId, setWinnerId] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [battles, setBattles] = useState<BattleResult[]>([]);

  // Quick score entry state
  const [player1QuickScore, setPlayer1QuickScore] = useState(0);
  const [player2QuickScore, setPlayer2QuickScore] = useState(0);
  const [useQuickScore, setUseQuickScore] = useState(false);

  // Separate state for each point type to avoid the sharing issue
  const [player1Burst, setPlayer1Burst] = useState(0);
  const [player1Ringout, setPlayer1Ringout] = useState(0);
  const [player1Spinout, setPlayer1Spinout] = useState(0);
  const [player2Burst, setPlayer2Burst] = useState(0);
  const [player2Ringout, setPlayer2Ringout] = useState(0);
  const [player2Spinout, setPlayer2Spinout] = useState(0);
  const [currentFinishType, setCurrentFinishType] = useState<
    "burst" | "ringout" | "spinout"
  >("burst");

  const handleMatchClick = (match: BracketMatch) => {
    if (isAdmin && match.status !== "completed") {
      setSelectedMatch(match);
      setWinnerId("");
      setBattles([]);
      setUseQuickScore(false);
      // Reset all point inputs
      setPlayer1QuickScore(0);
      setPlayer2QuickScore(0);
      setPlayer1Burst(0);
      setPlayer1Ringout(0);
      setPlayer1Spinout(0);
      setPlayer2Burst(0);
      setPlayer2Ringout(0);
      setPlayer2Spinout(0);
      setCurrentFinishType("burst");
    }
  };

  const handleScoreUpdate = async () => {
    if (!selectedMatch || !winnerId || !onMatchUpdate) return;

    setIsUpdating(true);
    try {
      let player1Total, player2Total;

      if (useQuickScore) {
        // Use quick score entry
        player1Total = player1QuickScore;
        player2Total = player2QuickScore;
      } else {
        // Calculate total points from battle breakdown
        player1Total =
          player1Burst * 3 + player1Ringout * 2 + player1Spinout * 1;
        player2Total =
          player2Burst * 3 + player2Ringout * 2 + player2Spinout * 1;
      }

      await onMatchUpdate(
        selectedMatch.round,
        selectedMatch.match_number,
        winnerId,
        player1Total,
        player2Total,
        useQuickScore ? undefined : battles
      );

      setSelectedMatch(null);
      setWinnerId("");
      setBattles([]);
      setUseQuickScore(false);
    } catch (error) {
      console.error("Error updating match:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const addBattle = () => {
    if (!winnerId) return;

    // Create a battle result based on the current finish type and points
    const newBattle: BattleResult = {
      winner_id: winnerId,
      finish_type: currentFinishType,
      player1_points:
        player1Burst * 3 + player1Ringout * 2 + player1Spinout * 1,
      player2_points:
        player2Burst * 3 + player2Ringout * 2 + player2Spinout * 1,
    };

    setBattles([...battles, newBattle]);

    // Reset inputs after adding battle
    setPlayer1Burst(0);
    setPlayer1Ringout(0);
    setPlayer1Spinout(0);
    setPlayer2Burst(0);
    setPlayer2Ringout(0);
    setPlayer2Spinout(0);
    setCurrentFinishType("burst");
  };

  const removeBattle = (index: number) => {
    setBattles(battles.filter((_, i) => i !== index));
  };

  const getMatchStatus = (match: BracketMatch) => {
    if (match.status === "completed") return "completed";
    if (match.status === "in_progress") return "in_progress";
    return "pending";
  };

  const getMatchCard = (match: BracketMatch) => {
    const status = getMatchStatus(match);
    const isClickable = isAdmin && status !== "completed";

    return (
      <motion.div
        key={
          match.id ||
          `${match.round}-${match.match_number}-${match.bracket_type}`
        }
        className={`relative p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
          isClickable
            ? "hover:shadow-lg hover:scale-105 bg-white dark:bg-slate-800"
            : "bg-gray-50 dark:bg-slate-700"
        } ${
          status === "completed"
            ? "border-green-500"
            : "border-gray-300 dark:border-slate-600"
        }`}
        onClick={() => handleMatchClick(match)}
        whileHover={isClickable ? { scale: 1.02 } : {}}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-center justify-between mb-2">
          <Badge
            variant={status === "completed" ? "default" : "secondary"}
            className={`text-xs ${
              status === "completed"
                ? "bg-green-500 text-white"
                : status === "in_progress"
                ? "bg-blue-500 text-white"
                : "bg-gray-500 text-white"
            }`}
          >
            {status === "completed"
              ? "Completed"
              : status === "in_progress"
              ? "In Progress"
              : "Pending"}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Round {match.round}, Match {match.match_number}
          </span>
        </div>

        <div className="space-y-2">
          <PlayerSlot
            player={match.player1}
            score={match.player1_score}
            isWinner={match.winner?.id === match.player1?.id}
            isCompleted={status === "completed"}
          />
          <div className="text-center text-xs text-muted-foreground">vs</div>
          <PlayerSlot
            player={match.player2}
            score={match.player2_score}
            isWinner={match.winner?.id === match.player2?.id}
            isCompleted={status === "completed"}
          />
        </div>

        {match.winner && (
          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-slate-600">
            <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <Trophy className="h-3 w-3" />
              Winner: {match.winner.display_name}
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  const getBracketSection = (
    matches: BracketMatch[],
    title: string,
    bracketType: "upper" | "lower" | "final"
  ) => {
    if (matches.length === 0) return null;

    const getBracketColor = (type: string) => {
      switch (type) {
        case "upper":
          return "border-blue-500 bg-blue-50 dark:bg-blue-900/20";
        case "lower":
          return "border-purple-500 bg-purple-50 dark:bg-purple-900/20";
        case "final":
          return "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20";
        default:
          return "border-gray-300 dark:border-gray-600";
      }
    };

    return (
      <div key={title} className="space-y-4">
        <h3 className="text-lg font-semibold text-center">{title}</h3>
        <div
          className={`p-4 border-2 rounded-lg ${getBracketColor(bracketType)}`}
        >
          <div className="grid gap-4">
            {matches.map((match) => getMatchCard(match))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Bracket Sections */}
      <div className="grid gap-8">
        {bracket.upper_bracket.length > 0 &&
          getBracketSection(bracket.upper_bracket, "Upper Bracket", "upper")}
        {bracket.lower_bracket.length > 0 &&
          getBracketSection(bracket.lower_bracket, "Lower Bracket", "lower")}
        {bracket.final_matches.length > 0 &&
          getBracketSection(bracket.final_matches, "Finals", "final")}
      </div>

      {/* Match Update Modal */}
      <AnimatePresence>
        {selectedMatch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedMatch(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Update Match Score</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedMatch(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Match Info */}
              <div className="mb-6 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
                <div className="text-center">
                  <div className="text-lg font-semibold">
                    {selectedMatch.player1?.display_name} vs{" "}
                    {selectedMatch.player2?.display_name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Round {selectedMatch.round}, Match{" "}
                    {selectedMatch.match_number}
                  </div>
                </div>
              </div>

              {/* Winner Selection */}
              <div className="mb-6">
                <Label className="text-sm font-medium">Select Winner</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    variant={
                      winnerId === selectedMatch.player1?.id
                        ? "default"
                        : "outline"
                    }
                    onClick={() => setWinnerId(selectedMatch.player1?.id || "")}
                    className="flex-1"
                  >
                    {selectedMatch.player1?.display_name}
                  </Button>
                  <Button
                    variant={
                      winnerId === selectedMatch.player2?.id
                        ? "default"
                        : "outline"
                    }
                    onClick={() => setWinnerId(selectedMatch.player2?.id || "")}
                    className="flex-1"
                  >
                    {selectedMatch.player2?.display_name}
                  </Button>
                </div>
              </div>

              {/* Quick Score Entry Section */}
              <div className="mb-6 p-4 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <div className="flex items-center gap-2 mb-3">
                  <Calculator className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <Label className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Quick Score Entry
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setUseQuickScore(!useQuickScore)}
                    className={`ml-auto text-xs ${
                      useQuickScore
                        ? "bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200"
                        : "text-blue-600 dark:text-blue-400"
                    }`}
                  >
                    {useQuickScore ? "Using Quick Score" : "Enable Quick Score"}
                  </Button>
                </div>

                {useQuickScore && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        {selectedMatch.player1?.display_name} Total Score
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        value={player1QuickScore}
                        onChange={(e) =>
                          setPlayer1QuickScore(parseInt(e.target.value) || 0)
                        }
                        className="text-center h-10"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        {selectedMatch.player2?.display_name} Total Score
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        value={player2QuickScore}
                        onChange={(e) =>
                          setPlayer2QuickScore(parseInt(e.target.value) || 0)
                        }
                        className="text-center h-10"
                        placeholder="0"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Battle Details Section */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <Label className="text-sm font-medium text-purple-800 dark:text-purple-200">
                    Battle Details (Optional)
                  </Label>
                  {!useQuickScore && (
                    <Badge variant="secondary" className="text-xs">
                      Active
                    </Badge>
                  )}
                </div>

                {!useQuickScore && (
                  <div className="space-y-4">
                    {/* Points Input */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Player 1 Points */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">
                          {selectedMatch.player1?.display_name} Points
                        </Label>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Label className="text-xs text-muted-foreground">
                              Bursts (3pts)
                            </Label>
                            <Input
                              type="number"
                              min="0"
                              value={player1Burst}
                              onChange={(e) =>
                                setPlayer1Burst(parseInt(e.target.value) || 0)
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
                              value={player1Ringout}
                              onChange={(e) =>
                                setPlayer1Ringout(parseInt(e.target.value) || 0)
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
                              value={player1Spinout}
                              onChange={(e) =>
                                setPlayer1Spinout(parseInt(e.target.value) || 0)
                              }
                              className="text-center h-8 sm:h-10 text-xs sm:text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Player 2 Points */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">
                          {selectedMatch.player2?.display_name} Points
                        </Label>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Label className="text-xs text-muted-foreground">
                              Bursts (3pts)
                            </Label>
                            <Input
                              type="number"
                              min="0"
                              value={player2Burst}
                              onChange={(e) =>
                                setPlayer2Burst(parseInt(e.target.value) || 0)
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
                              value={player2Ringout}
                              onChange={(e) =>
                                setPlayer2Ringout(parseInt(e.target.value) || 0)
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
                              value={player2Spinout}
                              onChange={(e) =>
                                setPlayer2Spinout(parseInt(e.target.value) || 0)
                              }
                              className="text-center h-8 sm:h-10 text-xs sm:text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Finish Type Selection */}
                    <div className="mb-4">
                      <Label className="text-sm font-medium">Finish Type</Label>
                      <Select
                        value={currentFinishType}
                        onValueChange={(
                          value: "burst" | "ringout" | "spinout"
                        ) => setCurrentFinishType(value)}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="burst">
                            <div className="flex items-center gap-2">
                              <Zap className="h-4 w-4" />
                              Burst (3 pts)
                            </div>
                          </SelectItem>
                          <SelectItem value="ringout">
                            <div className="flex items-center gap-2">
                              <Target className="h-4 w-4" />
                              Ring-Out (2 pts)
                            </div>
                          </SelectItem>
                          <SelectItem value="spinout">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="h-4 w-4" />
                              Spin-Out (1 pt)
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      onClick={addBattle}
                      disabled={!winnerId}
                      className="w-full h-10 sm:h-12 text-sm sm:text-base"
                    >
                      Add Battle
                    </Button>

                    {/* Battle List */}
                    {battles.length > 0 && (
                      <div className="space-y-2 mt-4">
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
                                  {battle.winner_id ===
                                  selectedMatch.player1?.id
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
                )}
              </div>

              {/* Instructions */}
              {!winnerId && (
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg mt-4">
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
  return (
    <div
      className={`flex items-center justify-between p-2 rounded ${
        isWinner && isCompleted
          ? "bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
          : "bg-gray-50 dark:bg-slate-800"
      }`}
    >
      <span className="font-medium text-sm">
        {player?.display_name || "TBD"}
      </span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold">{score}</span>
        {isWinner && isCompleted && (
          <Trophy className="h-4 w-4 text-green-600 dark:text-green-400" />
        )}
      </div>
    </div>
  );
}
