"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { realtimeService } from "@/lib/realtime";
import { Zap, Trophy } from "lucide-react";

interface Player {
  id: string;
  name: string;
  score: number;
  avatar?: string;
}

interface LiveScoringWidgetProps {
  matchId: string;
  tournamentId: string;
  player1: Player;
  player2: Player;
  status: "pending" | "in_progress" | "completed";
  onScoreUpdate?: (
    player1Score: number,
    player2Score: number,
    winnerId?: string
  ) => void;
  compact?: boolean;
}

export function LiveScoringWidget({
  matchId,
  tournamentId,
  player1,
  player2,
  status,
  onScoreUpdate,
  compact = false,
}: LiveScoringWidgetProps) {
  const [localPlayer1Score, setLocalPlayer1Score] = useState(player1.score);
  const [localPlayer2Score, setLocalPlayer2Score] = useState(player2.score);
  const [isUpdating, setIsUpdating] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);

  useEffect(() => {
    // Connect to real-time service
    realtimeService.connect();
    realtimeService.joinTournament(tournamentId);

    // Subscribe to match updates
    const unsubscribe = realtimeService.subscribe("match_update", (data) => {
      if ("matchId" in data && data.matchId === matchId) {
        setLocalPlayer1Score(data.player1Score);
        setLocalPlayer2Score(data.player2Score);
        if (data.winnerId) {
          setWinner(data.winnerId);
        }
      }
    });

    return () => {
      unsubscribe();
      realtimeService.leaveTournament(tournamentId);
    };
  }, [matchId, tournamentId]);

  const handleScoreUpdate = async (playerId: string, increment: number) => {
    if (status === "completed" || isUpdating) return;

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
      setWinner(player1.id);
    } else if (newPlayer2Score >= 3) {
      winnerId = player2.id;
      setWinner(player2.id);
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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusText = () => {
    switch (status) {
      case "completed":
        return "Completed";
      case "in_progress":
        return "Live";
      case "pending":
        return "Pending";
      default:
        return "Unknown";
    }
  };

  if (compact) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              Live Scoring
            </span>
            <Badge
              variant={status === "in_progress" ? "destructive" : "secondary"}
              className="text-xs"
            >
              {getStatusText()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Player Scores */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={player1.avatar} />
                <AvatarFallback className="text-xs">
                  {getInitials(player1.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{player1.name}</p>
                <motion.p
                  key={localPlayer1Score}
                  initial={{ scale: 1.2, color: "#fbbf24" }}
                  animate={{
                    scale: 1,
                    color: winner === player1.id ? "#10b981" : "#374151",
                  }}
                  className="text-2xl font-bold"
                >
                  {localPlayer1Score}
                </motion.p>
              </div>
            </div>

            <div className="text-muted-foreground font-bold">VS</div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium">{player2.name}</p>
                <motion.p
                  key={localPlayer2Score}
                  initial={{ scale: 1.2, color: "#fbbf24" }}
                  animate={{
                    scale: 1,
                    color: winner === player2.id ? "#10b981" : "#374151",
                  }}
                  className="text-2xl font-bold"
                >
                  {localPlayer2Score}
                </motion.p>
              </div>
              <Avatar className="h-8 w-8">
                <AvatarImage src={player2.avatar} />
                <AvatarFallback className="text-xs">
                  {getInitials(player2.name)}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>

          {/* Score Controls */}
          {status === "in_progress" && !winner && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleScoreUpdate(player1.id, 1)}
                  disabled={isUpdating}
                  className="w-full"
                >
                  +1 {player1.name}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleScoreUpdate(player1.id, -1)}
                  disabled={isUpdating}
                  className="w-full"
                >
                  -1 {player1.name}
                </Button>
              </div>
              <div className="space-y-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleScoreUpdate(player2.id, 1)}
                  disabled={isUpdating}
                  className="w-full"
                >
                  +1 {player2.name}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleScoreUpdate(player2.id, -1)}
                  disabled={isUpdating}
                  className="w-full"
                >
                  -1 {player2.name}
                </Button>
              </div>
            </div>
          )}

          {/* Winner Display */}
          {winner && (
            <div className="text-center p-3 bg-green-500/10 rounded-lg border border-green-500/20">
              <Trophy className="h-5 w-5 mx-auto mb-2 text-green-500" />
              <p className="text-sm font-medium text-green-600">
                {winner === player1.id ? player1.name : player2.name} Wins!
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Full version for larger displays
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Live Match Scoring
          </span>
          <Badge
            variant={status === "in_progress" ? "destructive" : "secondary"}
          >
            {getStatusText()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Player Scores */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Player 1 */}
          <div className="text-center p-4 bg-muted rounded-lg">
            <Avatar className="h-16 w-16 mx-auto mb-3">
              <AvatarImage src={player1.avatar} />
              <AvatarFallback className="text-lg">
                {getInitials(player1.name)}
              </AvatarFallback>
            </Avatar>
            <h3 className="text-lg font-semibold mb-2">{player1.name}</h3>
            <motion.p
              key={localPlayer1Score}
              initial={{ scale: 1.3, color: "#fbbf24" }}
              animate={{
                scale: 1,
                color: winner === player1.id ? "#10b981" : "#374151",
              }}
              className="text-4xl font-bold mb-4"
            >
              {localPlayer1Score}
            </motion.p>
            {status === "in_progress" && !winner && (
              <div className="flex gap-2 justify-center">
                <Button
                  size="sm"
                  onClick={() => handleScoreUpdate(player1.id, 1)}
                  disabled={isUpdating}
                >
                  +1
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleScoreUpdate(player1.id, -1)}
                  disabled={isUpdating}
                >
                  -1
                </Button>
              </div>
            )}
          </div>

          {/* Player 2 */}
          <div className="text-center p-4 bg-muted rounded-lg">
            <Avatar className="h-16 w-16 mx-auto mb-3">
              <AvatarImage src={player2.avatar} />
              <AvatarFallback className="text-lg">
                {getInitials(player2.name)}
              </AvatarFallback>
            </Avatar>
            <h3 className="text-lg font-semibold mb-2">{player2.name}</h3>
            <motion.p
              key={localPlayer2Score}
              initial={{ scale: 1.3, color: "#fbbf24" }}
              animate={{
                scale: 1,
                color: winner === player2.id ? "#10b981" : "#374151",
              }}
              className="text-4xl font-bold mb-4"
            >
              {localPlayer2Score}
            </motion.p>
            {status === "in_progress" && !winner && (
              <div className="flex gap-2 justify-center">
                <Button
                  size="sm"
                  onClick={() => handleScoreUpdate(player2.id, 1)}
                  disabled={isUpdating}
                >
                  +1
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleScoreUpdate(player2.id, -1)}
                  disabled={isUpdating}
                >
                  -1
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Winner Display */}
        {winner && (
          <div className="text-center p-6 bg-green-500/10 rounded-lg border border-green-500/20">
            <Trophy className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h3 className="text-xl font-bold text-green-600 mb-2">
              {winner === player1.id ? player1.name : player2.name} Wins!
            </h3>
            <p className="text-muted-foreground">
              Final Score: {localPlayer1Score} - {localPlayer2Score}
            </p>
          </div>
        )}

        {/* Match Info */}
        <div className="text-center text-sm text-muted-foreground">
          <p>First to 3 points wins • Real-time updates</p>
        </div>
      </CardContent>
    </Card>
  );
}
