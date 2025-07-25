"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Zap, Target, TrendingUp, X, Plus, Trash2, Trophy } from "lucide-react";
import { BattleResult, User } from "@/lib/types";

interface BattleScoringModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (winnerId: string, battles: BattleResult[]) => void;
  player1?: User;
  player2?: User;
  matchId: string;
  isAdmin: boolean;
  completed?: boolean;
}

export function BattleScoringModal({
  isOpen,
  onClose,
  onSave,
  player1,
  player2,
  matchId,
  isAdmin,
  completed = false,
}: BattleScoringModalProps) {
  const [battles, setBattles] = useState<BattleResult[]>([]);
  const [currentBattle, setCurrentBattle] = useState<{
    winner_id: string;
    finish_type: "burst" | "ringout" | "spinout";
    player1_points: number;
    player2_points: number;
  }>({
    winner_id: "",
    finish_type: "burst",
    player1_points: 0,
    player2_points: 0,
  });

  const finishTypeOptions = [
    { value: "burst", label: "Burst", points: 3, icon: Zap },
    { value: "ringout", label: "Ring-Out", points: 2, icon: Target },
    { value: "spinout", label: "Spin-Out", points: 1, icon: TrendingUp },
  ];

  const addBattle = () => {
    if (!currentBattle.winner_id) return;

    const newBattle: BattleResult = {
      winner_id: currentBattle.winner_id,
      finish_type: currentBattle.finish_type,
      player1_points: currentBattle.player1_points,
      player2_points: currentBattle.player2_points,
    };

    setBattles([...battles, newBattle]);
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

  const handleSave = () => {
    if (battles.length === 0) return;

    // Determine overall winner based on total points
    const player1Total = battles.reduce(
      (sum, battle) => sum + battle.player1_points,
      0
    );
    const player2Total = battles.reduce(
      (sum, battle) => sum + battle.player2_points,
      0
    );

    const overallWinner =
      player1Total > player2Total ? player1?.id : player2?.id;

    if (overallWinner) {
      onSave(overallWinner, battles);
      onClose();
    }
  };

  const getTotalPoints = (playerId: string) => {
    return battles.reduce((sum, battle) => {
      if (battle.winner_id === playerId) {
        return (
          sum +
          (battle.finish_type === "burst"
            ? 3
            : battle.finish_type === "ringout"
            ? 2
            : 1)
        );
      }
      return sum;
    }, 0);
  };

  const player1Total = getTotalPoints(player1?.id || "");
  const player2Total = getTotalPoints(player2?.id || "");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto mx-2 sm:mx-4">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
          <DialogTitle className="text-xl sm:text-2xl flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Beyblade X Battle Scoring
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 sm:space-y-8 px-4 sm:px-6 pb-4 sm:pb-6">
          {/* Match Info */}
          <Card className="bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-muted-foreground">Match ID:</span>
                <span className="font-mono">{matchId}</span>
              </div>
              <div className="flex items-center justify-between text-base sm:text-lg mt-2">
                <span className="font-medium">
                  {player1?.display_name || "TBD"}
                </span>
                <span className="text-muted-foreground">vs</span>
                <span className="font-medium">
                  {player2?.display_name || "TBD"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Current Score */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <Card className="border-2 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4 text-center">
                <div className="text-lg sm:text-xl font-bold">
                  {player1?.display_name}
                </div>
                <div className="text-3xl sm:text-4xl font-bold text-blue-600 mt-2">
                  {player1Total}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Total Points
                </div>
              </CardContent>
            </Card>
            <Card className="border-2 border-red-200 dark:border-red-800">
              <CardContent className="p-4 text-center">
                <div className="text-lg sm:text-xl font-bold">
                  {player2?.display_name}
                </div>
                <div className="text-3xl sm:text-4xl font-bold text-red-600 mt-2">
                  {player2Total}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Total Points
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Add New Battle */}
          {isAdmin && !completed && (
            <Card>
              <CardContent className="p-4 sm:p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Add Battle Result
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  {/* Battle Winner */}
                  <div className="space-y-2">
                    <Label>Battle Winner</Label>
                    <Select
                      value={currentBattle.winner_id}
                      onValueChange={(value) =>
                        setCurrentBattle({ ...currentBattle, winner_id: value })
                      }
                    >
                      <SelectTrigger className="h-10 sm:h-12">
                        <SelectValue placeholder="Select winner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={player1?.id || ""}>
                          {player1?.display_name}
                        </SelectItem>
                        <SelectItem value={player2?.id || ""}>
                          {player2?.display_name}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Finish Type */}
                  <div className="space-y-2">
                    <Label>Finish Type</Label>
                    <Select
                      value={currentBattle.finish_type}
                      onValueChange={(value: "burst" | "ringout" | "spinout") =>
                        setCurrentBattle({
                          ...currentBattle,
                          finish_type: value,
                        })
                      }
                    >
                      <SelectTrigger className="h-10 sm:h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {finishTypeOptions.map((option) => {
                          const Icon = option.icon;
                          return (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4" />
                                {option.label} ({option.points} pts)
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Points Distribution */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mt-4">
                  <div className="space-y-2">
                    <Label>{player1?.display_name} Points</Label>
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
                      className="h-8 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{player2?.display_name} Points</Label>
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
                      className="h-8 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>
                </div>

                <Button
                  onClick={addBattle}
                  disabled={!currentBattle.winner_id}
                  className="w-full mt-4 h-10 sm:h-12 text-sm sm:text-base"
                >
                  <Plus className="h-4 w-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                  Add Battle
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Battle List */}
          {battles.length > 0 && (
            <Card>
              <CardContent className="p-4 sm:p-6">
                <h3 className="text-lg font-semibold mb-4">Battle Results</h3>
                <div className="space-y-3">
                  {battles.map((battle, index) => {
                    const winner =
                      battle.winner_id === player1?.id ? player1 : player2;
                    const finishType = finishTypeOptions.find(
                      (opt) => opt.value === battle.finish_type
                    );
                    const Icon = finishType?.icon || Zap;

                    return (
                      <div
                        key={index}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border rounded-lg gap-2"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <Badge
                            variant="outline"
                            className="text-xs sm:text-sm"
                          >
                            Battle {index + 1}
                          </Badge>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 sm:w-5 sm:h-5" />
                            <span className="text-xs sm:text-sm flex-1">
                              {winner?.display_name} wins by {finishType?.label}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="text-xs sm:text-sm font-medium"
                          >
                            {battle.player1_points}-{battle.player2_points}
                          </Badge>
                          {isAdmin && !completed && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeBattle(index)}
                              className="h-8 px-2"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          <Card className="bg-accent/10 border-accent">
            <CardContent className="p-4 sm:p-6">
              <h4 className="font-semibold mb-2 text-accent-foreground">
                Beyblade X Scoring System
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-accent-foreground" />
                  <span>Burst: 3 points</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-accent-foreground" />
                  <span>Ring-Out: 2 points</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-accent-foreground" />
                  <span>Spin-Out: 1 point</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          {isAdmin && !completed && (
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 sm:pt-6">
              <Button
                onClick={handleSave}
                disabled={battles.length === 0}
                className="flex-1 h-10 sm:h-12 text-sm sm:text-base"
              >
                <Trophy className="h-4 w-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                Save Match Result
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1 h-10 sm:h-12 text-sm sm:text-base"
              >
                <X className="h-4 w-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                Cancel
              </Button>
            </div>
          )}

          {completed && (
            <div className="text-center">
              <Badge variant="default" className="text-sm">
                Match Completed
              </Badge>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
