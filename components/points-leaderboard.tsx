"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Trophy, Medal, TrendingUp, Users, Crown, Target } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  total_points: number;
  total_bets: number;
  won_bets: number;
  win_rate: number;
  rank: number;
}

interface PointsLeaderboardProps {
  tournamentId?: string; // Optional: filter by tournament
  limit?: number; // Optional: limit number of entries
}

export function PointsLeaderboard({
  tournamentId,
  limit = 10,
}: PointsLeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);

      let query = supabase
        .from("stream_points")
        .select(
          `
          user_id,
          points,
          users!inner(display_name)
        `
        )
        .not("user_id", "is", null);

      if (tournamentId) {
        // If tournament specified, only include points from that tournament
        query = query
          .eq("reference_type", "tournament")
          .eq("reference_id", tournamentId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching leaderboard:", error);
        setError("Failed to load leaderboard");
        return;
      }

      // Aggregate points by user
      const userPoints = new Map<string, { points: number; name: string }>();

      data?.forEach((entry: any) => {
        const userId = entry.user_id;
        const current = userPoints.get(userId) || {
          points: 0,
          name: entry.users.display_name,
        };
        userPoints.set(userId, {
          points: current.points + entry.points,
          name: current.name,
        });
      });

      // Get betting stats for each user
      const leaderboardData: LeaderboardEntry[] = [];

      for (const [userId, userData] of userPoints) {
        // Get betting stats
        const { data: betStats } = await supabase
          .from("user_bets")
          .select("status")
          .eq("user_id", userId);

        const totalBets = betStats?.length || 0;
        const wonBets =
          betStats?.filter((bet) => bet.status === "won").length || 0;
        const winRate = totalBets > 0 ? (wonBets / totalBets) * 100 : 0;

        leaderboardData.push({
          user_id: userId,
          display_name: userData.name,
          total_points: userData.points,
          total_bets: totalBets,
          won_bets: wonBets,
          win_rate: winRate,
          rank: 0, // Will be set after sorting
        });
      }

      // Sort by points and assign ranks
      leaderboardData.sort((a, b) => b.total_points - a.total_points);
      leaderboardData.forEach((entry, index) => {
        entry.rank = index + 1;
      });

      setLeaderboard(leaderboardData.slice(0, limit));
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      setError("Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  }, [tournamentId, limit]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Medal className="h-5 w-5 text-amber-600" />;
      default:
        return <Trophy className="h-4 w-4 text-muted-foreground" />;
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Points Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Points Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={fetchLeaderboard} className="mt-4">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Points Leaderboard
          {tournamentId && <Badge variant="outline">Tournament</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {leaderboard.length === 0 ? (
            <div className="text-center py-8">
              <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No leaderboard data yet</p>
              <p className="text-sm text-muted-foreground">
                Start betting to see the top players
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {leaderboard.map((entry) => (
                <div
                  key={entry.user_id}
                  className="flex items-center justify-between p-4 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {getRankIcon(entry.rank)}
                      <span className="font-bold text-lg w-8">
                        #{entry.rank}
                      </span>
                    </div>

                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {getInitials(entry.display_name)}
                      </AvatarFallback>
                    </Avatar>

                    <div>
                      <p className="font-medium">{entry.display_name}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          {entry.total_bets} bets
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {entry.win_rate.toFixed(1)}% win rate
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-yellow-500" />
                      <span className="text-xl font-bold text-green-600">
                        {entry.total_points}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">points</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
