"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Play, Eye } from "lucide-react";
import { realtimeService } from "@/lib/realtime";

interface BracketMatch {
  id: string;
  round: number;
  matchNumber: number;
  player1?: {
    id: string;
    name: string;
    score: number;
  };
  player2?: {
    id: string;
    name: string;
    score: number;
  };
  winner?: {
    id: string;
    name: string;
  };
  status: "pending" | "in_progress" | "completed";
  scheduledAt?: string;
}

interface EnhancedBracketProps {
  tournamentId: string;
  matches: BracketMatch[];
  onMatchClick?: (match: BracketMatch) => void;
}

export function EnhancedBracket({
  tournamentId,
  matches,
  onMatchClick,
}: EnhancedBracketProps) {
  const [selectedMatch, setSelectedMatch] = useState<BracketMatch | null>(null);
  const [liveMatches, setLiveMatches] = useState<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Connect to real-time service
    realtimeService.connect();
    realtimeService.joinTournament(tournamentId);

    // Subscribe to tournament updates
    const unsubscribe = realtimeService.subscribe(
      "tournament_update",
      (data) => {
        if (
          "tournamentId" in data &&
          "type" in data &&
          data.tournamentId === tournamentId
        ) {
          if (data.type === "match_started") {
            const matchId = data.data?.matchId;
            if (typeof matchId === "string") {
              setLiveMatches((prev) => new Set(prev).add(matchId));
            }
          } else if (data.type === "match_completed") {
            const matchId = data.data?.matchId;
            if (typeof matchId === "string") {
              setLiveMatches((prev) => {
                const newSet = new Set(prev);
                newSet.delete(matchId);
                return newSet;
              });
            }
          }
        }
      }
    );

    // Check connection status
    const checkConnection = () => {
      setIsConnected(realtimeService.isConnected());
    };

    checkConnection();
    const interval = setInterval(checkConnection, 5000);

    return () => {
      unsubscribe();
      realtimeService.leaveTournament(tournamentId);
      clearInterval(interval);
    };
  }, [tournamentId]);

  const getRounds = () => {
    const maxRound = Math.max(...matches.map((m) => m.round));
    return Array.from({ length: maxRound }, (_, i) => i + 1);
  };

  const getMatchesByRound = (round: number) => {
    return matches.filter((match) => match.round === round);
  };

  const getMatchStatusColor = (status: string) => {
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

  const getMatchStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Pending";
      case "in_progress":
        return "Live";
      case "completed":
        return "Completed";
      default:
        return "Unknown";
    }
  };

  const handleMatchClick = (match: BracketMatch) => {
    setSelectedMatch(match);
    if (onMatchClick) {
      onMatchClick(match);
    }
  };

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Tournament Bracket</h2>
        <div className="flex items-center gap-4">
          {isConnected && (
            <div className="flex items-center gap-2 text-green-500">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm">Live Updates</span>
            </div>
          )}
          <Badge variant="outline">
            {matches.filter((m) => m.status === "completed").length} /{" "}
            {matches.length} Matches
          </Badge>
        </div>
      </div>

      <div className="flex gap-8 min-w-max">
        {getRounds().map((round) => (
          <div key={round} className="flex flex-col gap-4">
            <div className="text-center mb-2">
              <h3 className="font-semibold text-lg">
                {round === getRounds().length
                  ? "Final"
                  : round === getRounds().length - 1
                  ? "Semi-Finals"
                  : round === getRounds().length - 2
                  ? "Quarter-Finals"
                  : `Round ${round}`}
              </h3>
              <p className="text-sm text-muted-foreground">
                {getMatchesByRound(round).length} matches
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {getMatchesByRound(round).map((match) => (
                <motion.div
                  key={match.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  whileHover={{ scale: 1.02 }}
                  className="relative"
                >
                  <Card
                    className={`cursor-pointer transition-all duration-200 ${
                      selectedMatch?.id === match.id
                        ? "ring-2 ring-primary shadow-lg"
                        : "hover:shadow-md"
                    } ${
                      liveMatches.has(match.id)
                        ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20"
                        : ""
                    }`}
                    onClick={() => handleMatchClick(match)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge
                          variant="secondary"
                          className={`${getMatchStatusColor(
                            match.status
                          )} text-white`}
                        >
                          {getMatchStatusText(match.status)}
                        </Badge>
                        {liveMatches.has(match.id) && (
                          <div className="flex items-center gap-1 text-blue-500">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            <span className="text-xs">LIVE</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        {/* Player 1 */}
                        <div
                          className={`flex items-center justify-between p-2 rounded ${
                            match.winner?.id === match.player1?.id
                              ? "bg-green-100 dark:bg-green-900/30"
                              : "bg-muted/50"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                              {match.player1?.name.charAt(0).toUpperCase() ||
                                "?"}
                            </div>
                            <span className="font-medium">
                              {match.player1?.name || "TBD"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold">
                              {match.player1?.score || 0}
                            </span>
                            {match.winner?.id === match.player1?.id && (
                              <Trophy className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                        </div>

                        {/* Player 2 */}
                        <div
                          className={`flex items-center justify-between p-2 rounded ${
                            match.winner?.id === match.player2?.id
                              ? "bg-green-100 dark:bg-green-900/30"
                              : "bg-muted/50"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                              {match.player2?.name.charAt(0).toUpperCase() ||
                                "?"}
                            </div>
                            <span className="font-medium">
                              {match.player2?.name || "TBD"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold">
                              {match.player2?.score || 0}
                            </span>
                            {match.winner?.id === match.player2?.id && (
                              <Trophy className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                        </div>
                      </div>

                      {match.status === "in_progress" && (
                        <div className="mt-3 pt-2 border-t border-border">
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMatchClick(match);
                            }}
                          >
                            <Play className="mr-2 h-3 w-3" />
                            Score Match
                          </Button>
                        </div>
                      )}

                      {match.status === "completed" && (
                        <div className="mt-3 pt-2 border-t border-border">
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMatchClick(match);
                            }}
                          >
                            <Eye className="mr-2 h-3 w-3" />
                            View Details
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Match Details Modal */}
      <AnimatePresence>
        {selectedMatch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedMatch(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background rounded-lg p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold mb-4">Match Details</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Match #{selectedMatch.matchNumber}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Round {selectedMatch.round}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {selectedMatch.player1?.name || "TBD"}
                    </span>
                    <span className="text-lg font-bold">
                      {selectedMatch.player1?.score || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {selectedMatch.player2?.name || "TBD"}
                    </span>
                    <span className="text-lg font-bold">
                      {selectedMatch.player2?.score || 0}
                    </span>
                  </div>
                </div>

                {selectedMatch.winner && (
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-yellow-500" />
                      <span className="font-semibold">
                        {selectedMatch.winner.name} wins!
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedMatch(null)}
                    className="flex-1"
                  >
                    Close
                  </Button>
                  {selectedMatch.status === "in_progress" && (
                    <Button
                      onClick={() => {
                        handleMatchClick(selectedMatch);
                        setSelectedMatch(null);
                      }}
                      className="flex-1"
                    >
                      <Play className="mr-2 h-3 w-3" />
                      Score Match
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
