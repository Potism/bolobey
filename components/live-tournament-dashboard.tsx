"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { EnhancedLiveBetting } from "@/components/enhanced-live-betting";
import { OBSStreamPlayer } from "@/components/obs-stream-player";
import { YouTubeStreamPlayer } from "@/components/youtube-stream-player";
import { SpectatorCounter } from "@/components/spectator-counter";
import { useOptimizedPoints } from "@/lib/hooks/useOptimizedPoints";
import ErrorBoundary from "@/lib/utils/error-boundary";
import {
  Trophy,
  Users,
  Play,
  Clock,
  TrendingUp,
  Activity,
  Coins,
  Eye,
  Zap,
  Target,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Match {
  id: string;
  player1: { id: string; name: string; score: number; avatar?: string };
  player2: { id: string; name: string; score: number; avatar?: string };
  status: string;
  round: number;
  matchNumber: number;
}

interface TournamentStats {
  totalParticipants: number;
  completedMatches: number;
  totalMatches: number;
  currentRound: number;
  totalRounds: number;
  spectators: number;
}

interface SpectatorCount {
  active_spectators: number;
  authenticated_spectators: number;
  anonymous_spectators: number;
}

interface TournamentType {
  id: number;
  name: string;
  description: string;
  category: "real" | "stream_only";
  entry_fee_eur: number;
  has_physical_prizes: boolean;
  has_stream_points_prizes: boolean;
  max_participants: number;
  features: string[];
}

interface LiveTournamentDashboardProps {
  tournamentId: string;
  matches: Match[];
  stats: TournamentStats;
  spectatorCount?: SpectatorCount;
  streamUrl?: string;
  streamKey?: string;
  youtubeVideoId?: string;
  tournamentType?: TournamentType;
  onMatchClick?: (matchId: string) => void;
}

export function LiveTournamentDashboard({
  tournamentId,
  matches,
  stats,
  spectatorCount,
  streamUrl,
  streamKey,
  youtubeVideoId,
  tournamentType,
  onMatchClick,
}: LiveTournamentDashboardProps) {
  const { userPoints, forceRefresh } = useOptimizedPoints();
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);

  // Force refresh user points
  const forceRefreshPoints = useCallback(async () => {
    await forceRefresh();
  }, [forceRefresh]);

  // Set current match to the first live match
  useEffect(() => {
    const liveMatch = matches.find((match) => match.status === "in_progress");

    if (liveMatch) {
      setCurrentMatch(liveMatch);
    }
  }, [matches]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const upcomingMatches = matches
    .filter((match) => match.status === "pending")
    .slice(0, 3);

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Main Layout Grid */}
        {/* Tournament Type Display */}
        {tournamentType && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      tournamentType.category === "real"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {tournamentType.category === "real" ? (
                      <Trophy className="h-5 w-5" />
                    ) : (
                      <Target className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">
                      {tournamentType.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {tournamentType.description}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 mb-1">
                    {tournamentType.entry_fee_eur > 0 ? (
                      <span className="text-green-600 font-semibold">
                        €{tournamentType.entry_fee_eur} Entry
                      </span>
                    ) : (
                      <span className="text-blue-600 font-semibold">
                        Free Entry
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Left Sidebar - Player Stats & Info */}
          <div className="xl:col-span-1 space-y-6">
            {/* User Points & Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-lg">
                  <div className="flex items-center gap-2">
                    <Coins className="h-5 w-5" />
                    Your Stats
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={forceRefreshPoints}
                    className="h-6 w-6 p-0"
                    title="Force refresh points"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm">Betting Points</span>
                  </div>
                  <span className="text-xl font-bold text-yellow-600">
                    {userPoints?.betting_points || 0}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Stream Points</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-blue-600">
                      {userPoints?.stream_points || 0}
                    </span>
                    <button
                      onClick={forceRefreshPoints}
                      className="p-1 text-blue-500 hover:text-blue-700 transition-colors"
                      title="Refresh points"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {spectatorCount ? (
                  <SpectatorCounter
                    spectatorCount={spectatorCount}
                    className="w-full"
                    showDetails={true}
                  />
                ) : (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">Spectators</span>
                    </div>
                    <span className="text-xl font-bold text-blue-600">
                      {stats.spectators}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Participants</span>
                  </div>
                  <span className="text-xl font-bold text-green-600">
                    {stats.totalParticipants}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Tournament Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5" />
                  Tournament Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Matches Completed</span>
                    <span>
                      {stats.completedMatches}/{stats.totalMatches}
                    </span>
                  </div>
                  <Progress
                    value={(stats.completedMatches / stats.totalMatches) * 100}
                    className="h-2"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Current Round</span>
                    <span>
                      {stats.currentRound}/{stats.totalRounds}
                    </span>
                  </div>
                  <Progress
                    value={(stats.currentRound / stats.totalRounds) * 100}
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="xl:col-span-3 space-y-6">
            {/* Stream Section - Moved to top for better UX */}
            {(streamUrl || youtubeVideoId) && (
              <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 dark:border-blue-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg text-blue-800 dark:text-blue-200">
                    <Play className="h-5 w-5" />
                    Live Stream
                    <Badge variant="destructive" className="animate-pulse">
                      LIVE
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {youtubeVideoId ? (
                    <YouTubeStreamPlayer youtubeVideoId={youtubeVideoId} />
                  ) : (
                    <OBSStreamPlayer
                      streamUrl={streamUrl!}
                      streamKey={streamKey}
                      tournamentId={tournamentId}
                      isLive={true}
                      title="Live Stream"
                    />
                  )}
                </CardContent>
              </Card>
            )}

            {/* Live Match Section */}
            {currentMatch && (
              <Card className="border-2 border-red-200 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-950/20 dark:to-pink-950/20 dark:border-red-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg text-red-800 dark:text-red-200">
                    <Activity className="h-5 w-5 text-red-500" />
                    Live Match
                    <Badge variant="destructive" className="animate-pulse">
                      IN PROGRESS
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Player 1 */}
                    <div className="flex items-center gap-4 p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg border border-red-200 dark:border-red-800">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={currentMatch.player1.avatar} />
                        <AvatarFallback>
                          {getInitials(currentMatch.player1.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-semibold text-red-900 dark:text-red-100">
                          {currentMatch.player1.name}
                        </h3>
                        <p className="text-sm text-red-700 dark:text-red-300">
                          Round {currentMatch.round}, Match{" "}
                          {currentMatch.matchNumber}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                          {currentMatch.player1.score}
                        </div>
                      </div>
                    </div>

                    {/* Player 2 */}
                    <div className="flex items-center gap-4 p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg border border-red-200 dark:border-red-800">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={currentMatch.player2.avatar} />
                        <AvatarFallback>
                          {getInitials(currentMatch.player2.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-semibold text-red-900 dark:text-red-100">
                          {currentMatch.player2.name}
                        </h3>
                        <p className="text-sm text-red-700 dark:text-red-300">
                          Round {currentMatch.round}, Match{" "}
                          {currentMatch.matchNumber}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                          {currentMatch.player2.score}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Upcoming Matches */}
            {upcomingMatches.length > 0 && (
              <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 dark:border-green-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg text-green-800 dark:text-green-200">
                    <Clock className="h-5 w-5" />
                    Upcoming Matches
                    <Badge variant="default" className="bg-green-600">
                      {upcomingMatches.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {upcomingMatches.map((match) => (
                      <div
                        key={match.id}
                        className="flex items-center justify-between p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg cursor-pointer hover:bg-white/70 dark:hover:bg-slate-700/50 transition-colors border border-green-200 dark:border-green-800"
                        onClick={() => onMatchClick?.(match.id)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={match.player1.avatar} />
                              <AvatarFallback>
                                {getInitials(match.player1.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-green-900 dark:text-green-100">
                              {match.player1.name}
                            </span>
                          </div>
                          <span className="text-green-700 dark:text-green-300 font-bold">
                            vs
                          </span>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={match.player2.avatar} />
                              <AvatarFallback>
                                {getInitials(match.player2.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-green-900 dark:text-green-100">
                              {match.player2.name}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-green-700 dark:text-green-300">
                            Round {match.round}
                          </div>
                          <div className="text-sm text-green-600 dark:text-green-400">
                            Match {match.matchNumber}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Live Betting Section - Moved to bottom for better UX */}
            {(currentMatch || tournamentType?.category === "stream_only") && (
              <Card className="border-2 border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 dark:border-yellow-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg text-yellow-800 dark:text-yellow-200">
                    <Zap className="h-5 w-5" />
                    Live Betting
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {currentMatch ? (
                    <EnhancedLiveBetting
                      match={currentMatch}
                      tournamentId={tournamentId}
                    />
                  ) : (
                    <EnhancedLiveBetting tournamentId={tournamentId} />
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
