"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { EnhancedLiveBetting } from "@/components/enhanced-live-betting";
import { LiveScoringWidget } from "@/components/live-scoring-widget";
import { OBSStreamPlayer } from "@/components/obs-stream-player";
import { YouTubeStreamPlayer } from "@/components/youtube-stream-player";
import { SpectatorCounter } from "@/components/spectator-counter";
import { useAuth } from "@/lib/hooks/useAuth";
import { supabase } from "@/lib/supabase";
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
  Crown,
} from "lucide-react";

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

interface LiveTournamentDashboardProps {
  tournamentId: string;
  matches: Match[];
  stats: TournamentStats;
  spectatorCount?: SpectatorCount;
  streamUrl?: string;
  streamKey?: string;
  youtubeVideoId?: string;
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
  onMatchClick,
}: LiveTournamentDashboardProps) {
  const [isConnected] = useState(true);
  const { user } = useAuth();
  const [userPoints, setUserPoints] = useState(0);
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);

  // Fetch user's points balance
  const fetchUserPoints = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc("get_user_points_balance", {
        user_uuid: user.id,
      });

      if (error) {
        console.error("Error fetching user points:", error);
        return;
      }

      setUserPoints(data || 0);
    } catch (error) {
      console.error("Error fetching user points:", error);
    }
  }, [user]);

  useEffect(() => {
    fetchUserPoints();
  }, [user?.id]);

  // Set current match to the first live match
  useEffect(() => {
    console.log("Dashboard - received matches:", matches);
    console.log("Dashboard - looking for in_progress matches");

    const liveMatch = matches.find((match) => match.status === "in_progress");
    console.log("Dashboard - found live match:", liveMatch);

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

  const liveMatches = matches.filter((match) => match.status === "in_progress");
  const upcomingMatches = matches
    .filter((match) => match.status === "pending")
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Left Sidebar - Player Stats & Info */}
        <div className="xl:col-span-1 space-y-6">
          {/* User Points & Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Coins className="h-5 w-5" />
                Your Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm">Points Balance</span>
                </div>
                <span className="text-xl font-bold text-yellow-600">
                  {userPoints}
                </span>
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
                  value={
                    stats.totalMatches > 0
                      ? (stats.completedMatches / stats.totalMatches) * 100
                      : 0
                  }
                  className="h-2"
                />
                <div className="text-xs text-muted-foreground text-center">
                  {stats.totalMatches > 0
                    ? `${Math.round(
                        (stats.completedMatches / stats.totalMatches) * 100
                      )}% Complete`
                    : "0% Complete"}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-purple-500" />
                  <span className="text-sm">Current Round</span>
                </div>
                <span className="text-lg font-bold text-purple-600">
                  {stats.currentRound}/{stats.totalRounds}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Current Match Info */}
          {currentMatch && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Live Match
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-yellow-600">
                      LIVE NOW
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-center">
                      <Avatar className="h-12 w-12 mx-auto mb-2">
                        <AvatarImage src={currentMatch.player1.avatar} />
                        <AvatarFallback>
                          {getInitials(currentMatch.player1.name)}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-sm font-medium">
                        {currentMatch.player1.name}
                      </p>
                      <p className="text-2xl font-bold text-blue-600">
                        {currentMatch.player1.score}
                      </p>
                    </div>

                    <div className="text-muted-foreground text-lg font-bold">
                      VS
                    </div>

                    <div className="text-center">
                      <Avatar className="h-12 w-12 mx-auto mb-2">
                        <AvatarImage src={currentMatch.player2.avatar} />
                        <AvatarFallback>
                          {getInitials(currentMatch.player2.name)}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-sm font-medium">
                        {currentMatch.player2.name}
                      </p>
                      <p className="text-2xl font-bold text-red-600">
                        {currentMatch.player2.score}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-muted-foreground">
                    Round {currentMatch.round} • Match{" "}
                    {currentMatch.matchNumber}
                  </div>

                  {/* Quick Score Update Buttons */}
                  {currentMatch.status === "in_progress" && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onMatchClick?.(currentMatch.id)}
                        className="text-xs"
                      >
                        <Zap className="h-3 w-3 mr-1" />
                        Full Scoring
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onMatchClick?.(currentMatch.id)}
                        className="text-xs"
                      >
                        <Trophy className="h-3 w-3 mr-1" />
                        View Details
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upcoming Matches */}
          {upcomingMatches.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5" />
                  Upcoming
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingMatches.map((match) => (
                  <div
                    key={match.id}
                    className="p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => onMatchClick?.(match.id)}
                  >
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={match.player1.avatar} />
                          <AvatarFallback className="text-xs">
                            {getInitials(match.player1.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium truncate">
                          {match.player1.name}
                        </span>
                      </div>
                      <span className="text-muted-foreground">vs</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          {match.player2.name}
                        </span>
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={match.player2.avatar} />
                          <AvatarFallback className="text-xs">
                            {getInitials(match.player2.name)}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Round {match.round} • Match {match.matchNumber}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Center - Live Stream */}
        <div className="xl:col-span-2">
          {streamUrl || streamKey || youtubeVideoId ? (
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Live Tournament Stream
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* YouTube Stream Player */}
                  {youtubeVideoId && (
                    <YouTubeStreamPlayer
                      tournamentId={tournamentId}
                      isLive={true}
                      title="Live Tournament Stream"
                      youtubeVideoId={youtubeVideoId}
                      isAdmin={false}
                    />
                  )}

                  {/* Legacy OBS Stream Player */}
                  {!youtubeVideoId && (streamUrl || streamKey) && (
                    <OBSStreamPlayer
                      streamUrl={streamUrl}
                      streamKey={streamKey}
                      tournamentId={tournamentId}
                      isLive={true}
                      title="Live Tournament Stream"
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="w-full h-96 flex items-center justify-center">
              <CardContent className="text-center">
                <Play className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Live Stream</h3>
                <p className="text-muted-foreground">
                  Stream will appear here when the tournament goes live
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Sidebar - Live Betting & Scoring */}
        <div className="xl:col-span-1 space-y-6">
          <EnhancedLiveBetting
            tournamentId={tournamentId}
            userPoints={userPoints}
          />

          {/* Live Scoring Widget */}
          {currentMatch && (
            <LiveScoringWidget
              matchId={currentMatch.id}
              tournamentId={tournamentId}
              player1={currentMatch.player1}
              player2={currentMatch.player2}
              status={
                currentMatch.status as "pending" | "in_progress" | "completed"
              }
              compact={true}
              onScoreUpdate={(player1Score, player2Score, winnerId) => {
                // Update the current match scores
                setCurrentMatch({
                  ...currentMatch,
                  player1: { ...currentMatch.player1, score: player1Score },
                  player2: { ...currentMatch.player2, score: player2Score },
                  status: winnerId ? "completed" : "in_progress",
                });
              }}
            />
          )}
        </div>
      </div>

      {/* Bottom Section - Connection Status & Additional Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <div>
                <p className="text-sm text-muted-foreground">Connection</p>
                <p className="text-sm font-medium">
                  {isConnected ? "Connected" : "Disconnected"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <div>
                <p className="text-sm text-muted-foreground">Live Matches</p>
                <p className="text-sm font-medium">{liveMatches.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4" />
              <div>
                <p className="text-sm text-muted-foreground">
                  Tournament Status
                </p>
                <p className="text-sm font-medium capitalize">
                  {stats.currentRound > 1 ? "In Progress" : "Starting"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
