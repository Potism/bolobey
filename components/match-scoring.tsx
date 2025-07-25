"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { realtimeService } from "@/lib/realtime";
import { Trophy, Users, Clock, Zap } from "lucide-react";

interface MatchScoringProps {
  matchId: string;
  tournamentId: string;
  player1: {
    id: string;
    name: string;
    score: number;
  };
  player2: {
    id: string;
    name: string;
    score: number;
  };
  status: "pending" | "in_progress" | "completed";
  onScoreUpdate?: (
    player1Score: number,
    player2Score: number,
    winnerId?: string
  ) => void;
}

export function MatchScoring({
  matchId,
  tournamentId,
  player1,
  player2,
  status,
  onScoreUpdate,
}: MatchScoringProps) {
  const [localPlayer1Score, setLocalPlayer1Score] = useState(player1.score);
  const [localPlayer2Score, setLocalPlayer2Score] = useState(player2.score);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    // Connect to real-time service
    realtimeService.connect();
    realtimeService.joinTournament(tournamentId);

    // Subscribe to match updates
    const unsubscribe = realtimeService.subscribe("match_update", (data) => {
      if ("matchId" in data && data.matchId === matchId) {
        setLocalPlayer1Score(data.player1Score);
        setLocalPlayer2Score(data.player2Score);
        setLastUpdate(data.lastUpdated);
      }
    });

    return () => {
      unsubscribe();
      realtimeService.leaveTournament(tournamentId);
    };
  }, [matchId, tournamentId]);

  const handleScoreUpdate = async (playerId: string, increment: number) => {
    if (status === "completed") return;

    setIsUpdating(true);

    let newPlayer1Score = localPlayer1Score;
    let newPlayer2Score = localPlayer2Score;
    let winnerId: string | undefined;

    if (playerId === player1.id) {
      newPlayer1Score = Math.max(0, localPlayer1Score + increment);
    } else {
      newPlayer2Score = Math.max(0, localPlayer2Score + increment);
    }

    // Determine winner (first to 3 points wins)
    if (newPlayer1Score >= 3) {
      winnerId = player1.id;
    } else if (newPlayer2Score >= 3) {
      winnerId = player2.id;
    }

    // Update local state
    setLocalPlayer1Score(newPlayer1Score);
    setLocalPlayer2Score(newPlayer2Score);

    // Send update to real-time service
    realtimeService.updateMatchScore(
      matchId,
      newPlayer1Score,
      newPlayer2Score,
      winnerId
    );

    // Call parent callback
    if (onScoreUpdate) {
      onScoreUpdate(newPlayer1Score, newPlayer2Score, winnerId);
    }

    setIsUpdating(false);
  };

  const getStatusColor = () => {
    switch (status) {
      case "pending":
        return "bg-yellow-500";
      case "in_progress":
        return "bg-blue-500";
      case "completed":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "pending":
        return "Pending";
      case "in_progress":
        return "In Progress";
      case "completed":
        return "Completed";
      default:
        return "Unknown";
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold">
            Live Match Scoring
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className={`${getStatusColor()} text-white`}
            >
              {getStatusText()}
            </Badge>
            {realtimeService.isConnected() && (
              <div className="flex items-center gap-1 text-green-500">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs">Live</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Player 1 */}
        <motion.div
          className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
              {player1.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-semibold text-lg">{player1.name}</h3>
              <p className="text-sm text-muted-foreground">Player 1</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {localPlayer1Score}
              </div>
              <div className="text-xs text-muted-foreground">Score</div>
            </div>
            {status === "in_progress" && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleScoreUpdate(player1.id, -1)}
                  disabled={isUpdating || localPlayer1Score <= 0}
                >
                  -
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleScoreUpdate(player1.id, 1)}
                  disabled={isUpdating}
                >
                  +
                </Button>
              </div>
            )}
          </div>
        </motion.div>

        {/* VS Divider */}
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-4">
            <div className="h-px w-16 bg-border"></div>
            <div className="px-4 py-2 bg-muted rounded-full">
              <span className="font-bold text-lg">VS</span>
            </div>
            <div className="h-px w-16 bg-border"></div>
          </div>
        </div>

        {/* Player 2 */}
        <motion.div
          className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
              {player2.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-semibold text-lg">{player2.name}</h3>
              <p className="text-sm text-muted-foreground">Player 2</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                {localPlayer2Score}
              </div>
              <div className="text-xs text-muted-foreground">Score</div>
            </div>
            {status === "in_progress" && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleScoreUpdate(player2.id, -1)}
                  disabled={isUpdating || localPlayer2Score <= 0}
                >
                  -
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleScoreUpdate(player2.id, 1)}
                  disabled={isUpdating}
                >
                  +
                </Button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Match Info */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-sm font-medium">Best of 5</div>
            <div className="text-xs text-muted-foreground">First to 3 wins</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-sm font-medium">Live Updates</div>
            <div className="text-xs text-muted-foreground">
              {lastUpdate
                ? `Updated ${lastUpdate.toLocaleTimeString()}`
                : "No updates yet"}
            </div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-sm font-medium">Real-time</div>
            <div className="text-xs text-muted-foreground">
              {realtimeService.isConnected() ? "Connected" : "Disconnected"}
            </div>
          </div>
        </div>

        {/* Winner Announcement */}
        <AnimatePresence>
          {(localPlayer1Score >= 3 || localPlayer2Score >= 3) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800"
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <Trophy className="h-5 w-5 text-yellow-600" />
                <span className="font-bold text-lg text-yellow-800 dark:text-yellow-200">
                  Winner!
                </span>
              </div>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                {localPlayer1Score >= 3 ? player1.name : player2.name} wins the
                match!
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
