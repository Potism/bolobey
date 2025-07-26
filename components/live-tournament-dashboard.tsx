"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { LiveBettingInterface } from "@/components/live-betting-interface";
import { OBSStreamPlayer } from "@/components/obs-stream-player";
import { YouTubeStreamPlayer } from "@/components/youtube-stream-player";
import { useAuth } from "@/lib/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import {
  Trophy,
  Users,
  Play,
  Clock,
  TrendingUp,
  Award,
  Activity,
  Coins,
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

interface LiveTournamentDashboardProps {
  tournamentId: string;
  matches: Match[];
  stats: TournamentStats;
  streamUrl?: string;
  streamKey?: string;
  youtubeVideoId?: string;
  onMatchClick?: (matchId: string) => void;
}

export function LiveTournamentDashboard({
  tournamentId,
  matches,
  stats,
  streamUrl,
  streamKey,
  youtubeVideoId,
  onMatchClick,
}: LiveTournamentDashboardProps) {
  const [isConnected] = useState(true);
  const { user } = useAuth();
  const [userPoints, setUserPoints] = useState(0);

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
  }, [user?.id]); // Only depend on user ID

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "in_progress":
        return "bg-yellow-500";
      case "pending":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Live Stream Player - Full Width */}
      {(streamUrl || streamKey || youtubeVideoId) && (
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Live Stream
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
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Tournament Stats */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Participants
                    </p>
                    <p className="text-2xl font-bold">
                      {stats.totalParticipants}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Your Points</p>
                    <p className="text-2xl font-bold">{userPoints}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Play className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Matches</p>
                    <p className="text-2xl font-bold">
                      {stats.completedMatches}/{stats.totalMatches}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Round</p>
                    <p className="text-2xl font-bold">
                      {stats.currentRound}/{stats.totalRounds}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Spectators</p>
                    <p className="text-2xl font-bold">{stats.spectators}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Progress Bar */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Tournament Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>
                    {Math.round(
                      (stats.completedMatches / stats.totalMatches) * 100
                    )}
                    %
                  </span>
                </div>
                <Progress
                  value={(stats.completedMatches / stats.totalMatches) * 100}
                  className="h-2"
                />
              </div>
            </CardContent>
          </Card>

          {/* Live Matches */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Live Matches
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {matches
                  .filter((match) => match.status === "in_progress")
                  .map((match) => (
                    <div
                      key={match.id}
                      className="flex items-center justify-between p-4 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
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
                          <span className="font-medium">
                            {match.player1.name}
                          </span>
                          <span className="text-lg font-bold">
                            {match.player1.score}
                          </span>
                        </div>

                        <div className="text-muted-foreground">vs</div>

                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold">
                            {match.player2.score}
                          </span>
                          <span className="font-medium">
                            {match.player2.name}
                          </span>
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={match.player2.avatar} />
                            <AvatarFallback>
                              {getInitials(match.player2.name)}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${getStatusColor(
                            match.status
                          )}`}
                        />
                        <Badge variant="destructive">
                          <Play className="h-3 w-3 mr-1" />
                          LIVE
                        </Badge>
                      </div>
                    </div>
                  ))}

                {matches.filter((match) => match.status === "in_progress")
                  .length === 0 && (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      No live matches at the moment
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Matches */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Upcoming Matches
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {matches
                  .filter((match) => match.status === "pending")
                  .slice(0, 3)
                  .map((match) => (
                    <div
                      key={match.id}
                      className="flex items-center justify-between p-4 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
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
                          <span className="font-medium">
                            {match.player1.name}
                          </span>
                        </div>

                        <div className="text-muted-foreground">vs</div>

                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {match.player2.name}
                          </span>
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={match.player2.avatar} />
                            <AvatarFallback>
                              {getInitials(match.player2.name)}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          Round {match.round} - Match {match.matchNumber}
                        </Badge>
                      </div>
                    </div>
                  ))}

                {matches.filter((match) => match.status === "pending")
                  .length === 0 && (
                  <div className="text-center py-8">
                    <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No upcoming matches</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Live Betting Sidebar */}
      <div className="space-y-6">
        <LiveBettingInterface tournamentId={tournamentId} />

        {/* Connection Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Connection Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isConnected ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <span className="text-sm">
                {isConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
