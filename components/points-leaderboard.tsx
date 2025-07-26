"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Trophy, Medal, Award, TrendingUp, Users, Crown } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface LeaderboardUser {
  user_id: string;
  display_name: string;
  avatar_url?: string;
  total_points: number;
  rank: number;
  total_bets: number;
  win_rate: number;
}

export function PointsLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<"all" | "month" | "week">("all");

  const fetchLeaderboard = useCallback(async () => {
    try {
      let query = `
        WITH user_points AS (
          SELECT 
            user_id,
            SUM(points) as total_points
          FROM stream_points
          GROUP BY user_id
        ),
        user_bets AS (
          SELECT 
            user_id,
            COUNT(*) as total_bets,
            COUNT(CASE WHEN status = 'won' THEN 1 END) as won_bets
          FROM user_bets
          GROUP BY user_id
        )
        SELECT 
          u.id as user_id,
          u.display_name,
          u.avatar_url,
          COALESCE(up.total_points, 0) as total_points,
          COALESCE(ub.total_bets, 0) as total_bets,
          CASE 
            WHEN COALESCE(ub.total_bets, 0) > 0 
            THEN ROUND((COALESCE(ub.won_bets, 0)::float / ub.total_bets::float) * 100, 1)
            ELSE 0 
          END as win_rate
        FROM users u
        LEFT JOIN user_points up ON u.id = up.user_id
        LEFT JOIN user_bets ub ON u.id = ub.user_id
        WHERE COALESCE(up.total_points, 0) > 0
        ORDER BY total_points DESC
        LIMIT 50
      `;

      const { data, error } = await supabase.rpc("exec_sql", {
        sql_query: query,
      });

      if (error) {
        console.error("Error fetching leaderboard:", error);
        setError("Failed to load leaderboard");
        return;
      }

      // Add rank to each user
      const rankedData =
        data?.map((user: any, index: number) => ({
          ...user,
          rank: index + 1,
        })) || [];

      setLeaderboard(rankedData);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      setError("Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

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
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return (
          <span className="text-sm font-bold text-muted-foreground">
            #{rank}
          </span>
        );
    }
  };

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return <Badge className="bg-yellow-500 text-white">🥇 1st</Badge>;
      case 2:
        return <Badge className="bg-gray-400 text-white">🥈 2nd</Badge>;
      case 3:
        return <Badge className="bg-amber-600 text-white">🥉 3rd</Badge>;
      default:
        return <Badge variant="secondary">#{rank}</Badge>;
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
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant={timeframe === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setTimeframe("all")}
          >
            All Time
          </Button>
          <Button
            variant={timeframe === "month" ? "default" : "outline"}
            size="sm"
            onClick={() => setTimeframe("month")}
          >
            This Month
          </Button>
          <Button
            variant={timeframe === "week" ? "default" : "outline"}
            size="sm"
            onClick={() => setTimeframe("week")}
          >
            This Week
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {leaderboard.length === 0 ? (
          <div className="text-center py-8">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No leaderboard data yet</p>
            <p className="text-sm text-muted-foreground">
              Start betting to earn points and climb the leaderboard
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((user) => (
              <div
                key={user.user_id}
                className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
                  user.rank <= 3
                    ? "bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20"
                    : "bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {getRankIcon(user.rank)}
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {getInitials(user.display_name)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{user.display_name}</p>
                      {getRankBadge(user.rank)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {user.total_bets} bets
                      </span>
                      <span className="flex items-center gap-1">
                        <Trophy className="h-3 w-3" />
                        {user.win_rate}% win rate
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">
                    {user.total_points.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">points</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
