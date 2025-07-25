"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Trophy,
  Users,
  Zap,
  Eye,
  Play,
  CheckCircle,
  TrendingUp,
  Target,
} from "lucide-react";
// Removed realtime service dependency - using local state instead

interface TournamentStats {
  totalMatches: number;
  completedMatches: number;
  activeMatches: number;
  totalParticipants: number;
  averageMatchDuration: number;
  tournamentProgress: number;
}

interface LiveMatch {
  id: string;
  player1: {
    id: string;
    name: string;
    score: number;
    avatar?: string;
  };
  player2: {
    id: string;
    name: string;
    score: number;
    avatar?: string;
  };
  status: "pending" | "in_progress" | "completed";
  startTime?: Date;
  endTime?: Date;
  round: number;
  matchNumber: number;
  winner?: {
    id: string;
    name: string;
  };
}

interface LiveTournamentDashboardProps {
  tournamentId: string;
  tournamentName: string;
  matches: LiveMatch[];
  onMatchClick?: (match: LiveMatch) => void;
}

export function LiveTournamentDashboard({
  tournamentId,
  tournamentName,
  matches,
  onMatchClick,
}: LiveTournamentDashboardProps) {
  const [stats, setStats] = useState<TournamentStats>({
    totalMatches: 0,
    completedMatches: 0,
    activeMatches: 0,
    totalParticipants: 0,
    averageMatchDuration: 0,
    tournamentProgress: 0,
  });
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([]);
  const [recentResults, setRecentResults] = useState<LiveMatch[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [spectators, setSpectators] = useState(0);

  useEffect(() => {
    // Initialize stats
    const totalMatches = matches.length;
    const completedMatches = matches.filter(
      (m) => m.status === "completed"
    ).length;
    const activeMatches = matches.filter(
      (m) => m.status === "in_progress"
    ).length;
    const totalParticipants = new Set([
      ...matches.flatMap((m) => [m.player1?.id, m.player2?.id].filter(Boolean)),
    ]).size;

    const tournamentProgress =
      totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0;

    setStats({
      totalMatches,
      completedMatches,
      activeMatches,
      totalParticipants,
      averageMatchDuration: 15, // Mock data
      tournamentProgress,
    });

    setLiveMatches(matches.filter((m) => m.status === "in_progress"));
    setRecentResults(matches.filter((m) => m.status === "completed").slice(-5));
  }, [matches]);

  useEffect(() => {
    // Simulate real-time updates with local state
    setIsConnected(true);

    // Simulate spectator count updates
    const spectatorInterval = setInterval(() => {
      setSpectators((prev) =>
        Math.max(0, prev + Math.floor(Math.random() * 3) - 1)
      );
    }, 5000);

    return () => {
      clearInterval(spectatorInterval);
    };
  }, [tournamentId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold">{tournamentName}</h1>
          <p className="text-muted-foreground">Live Tournament Dashboard</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge
            variant={isConnected ? "default" : "secondary"}
            className="flex items-center gap-2"
          >
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
            />
            {isConnected ? "Live" : "Offline"}
          </Badge>
          <Badge variant="outline" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            {Math.max(spectators, 0)} watching
          </Badge>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Matches
                </p>
                <p className="text-2xl font-bold">{stats.totalMatches}</p>
              </div>
              <Target className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Completed
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.completedMatches}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Live Matches
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.activeMatches}
                </p>
              </div>
              <Play className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Participants
                </p>
                <p className="text-2xl font-bold">{stats.totalParticipants}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tournament Progress */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Tournament Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm text-muted-foreground">
                  {stats.completedMatches} / {stats.totalMatches} matches
                </span>
              </div>
              <Progress value={stats.tournamentProgress} className="h-3" />
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Started</span>
                <span>{Math.round(stats.tournamentProgress)}% Complete</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Live Matches */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-600" />
              Live Matches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AnimatePresence>
              {liveMatches.length > 0 ? (
                <div className="space-y-4">
                  {liveMatches.map((match) => (
                    <motion.div
                      key={match.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                          <span className="text-sm font-medium">
                            Round {match.round}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <p className="font-semibold">
                              {match.player1.name}
                            </p>
                            <p className="text-2xl font-bold text-blue-600">
                              {match.player1.score}
                            </p>
                          </div>
                          <div className="text-center text-muted-foreground">
                            <p className="text-sm">vs</p>
                          </div>
                          <div className="text-center">
                            <p className="font-semibold">
                              {match.player2.name}
                            </p>
                            <p className="text-2xl font-bold text-purple-600">
                              {match.player2.score}
                            </p>
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => onMatchClick?.(match)}
                        className="flex items-center gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        Watch
                      </Button>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Play className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No live matches at the moment</p>
                  <p className="text-sm">
                    Matches will appear here when they start
                  </p>
                </div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Results */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-600" />
              Recent Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentResults.map((match) => (
                <motion.div
                  key={match.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">
                      Round {match.round}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{match.player1.name}</span>
                      <span className="text-muted-foreground">
                        {match.player1.score}
                      </span>
                      <span className="text-muted-foreground">-</span>
                      <span className="text-muted-foreground">
                        {match.player2.score}
                      </span>
                      <span className="font-medium">{match.player2.name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-600">
                      {match.winner?.name} won
                    </span>
                  </div>
                </motion.div>
              ))}
              {recentResults.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  <p>No completed matches yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
