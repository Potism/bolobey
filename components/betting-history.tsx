"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  History,
  TrendingUp,
  TrendingDown,
  Target,
  Trophy,
  Clock,
  DollarSign,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BettingHistoryItem {
  id: string;
  match_id: string;
  bet_on_player_id: string;
  points_wagered: number;
  potential_winnings: number;
  status: string;
  created_at: string;
  match: {
    player1_name: string;
    player2_name: string;
    winner_name: string | null;
    status: string;
  };
  bet_on_player_name: string;
}

interface BettingStats {
  total_bets: number;
  won_bets: number;
  lost_bets: number;
  total_wagered: number;
  total_won: number;
  win_rate: number;
}

export function BettingHistory({ tournamentId }: { tournamentId: string }) {
  const { user } = useAuth();
  const [history, setHistory] = useState<BettingHistoryItem[]>([]);
  const [stats, setStats] = useState<BettingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all"); // New: filter state
  const [sortBy, setSortBy] = useState<string>("date"); // New: sort state

  const fetchBettingHistory = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("user_bets")
        .select(
          `
          *,
          match:betting_matches(
            player1_name,
            player2_name,
            winner_name,
            status
          )
        `
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching betting history:", error);
        setError("Failed to load betting history");
        return;
      }

      // Process the data to include bet_on_player_name
      const processedHistory =
        data?.map((bet: any) => ({
          ...bet,
          bet_on_player_name:
            bet.bet_on_player_id === bet.match?.player1_id
              ? bet.match.player1_name
              : bet.match.player2_name,
        })) || [];

      setHistory(processedHistory);

      // Calculate stats
      const totalBets = processedHistory.length;
      const wonBets = processedHistory.filter(
        (bet) => bet.status === "won"
      ).length;
      const lostBets = processedHistory.filter(
        (bet) => bet.status === "lost"
      ).length;
      const totalWagered = processedHistory.reduce(
        (sum, bet) => sum + bet.points_wagered,
        0
      );
      const totalWon = processedHistory
        .filter((bet) => bet.status === "won")
        .reduce((sum, bet) => sum + bet.potential_winnings, 0);

      setStats({
        total_bets: totalBets,
        won_bets: wonBets,
        lost_bets: lostBets,
        total_wagered: totalWagered,
        total_won: totalWon,
        win_rate: totalBets > 0 ? (wonBets / totalBets) * 100 : 0,
      });
    } catch (error) {
      console.error("Error fetching betting history:", error);
      setError("Failed to load betting history");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBettingHistory();
  }, [fetchBettingHistory]);

  // Filter and sort history
  const filteredHistory = useMemo(() => {
    let filtered = history;

    // Apply filter
    switch (filter) {
      case "won":
        filtered = history.filter((bet) => bet.status === "won");
        break;
      case "lost":
        filtered = history.filter((bet) => bet.status === "lost");
        break;
      case "pending":
        filtered = history.filter((bet) => bet.status === "pending");
        break;
      default:
        filtered = history;
    }

    // Apply sort
    switch (sortBy) {
      case "amount":
        filtered = [...filtered].sort(
          (a, b) => b.points_wagered - a.points_wagered
        );
        break;
      case "winnings":
        filtered = [...filtered].sort((a, b) => {
          const aWinnings = a.status === "won" ? a.potential_winnings : 0;
          const bWinnings = b.status === "won" ? b.potential_winnings : 0;
          return bWinnings - aWinnings;
        });
        break;
      case "date":
      default:
        filtered = [...filtered].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }

    return filtered;
  }, [history, filter, sortBy]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "won":
        return "bg-green-500";
      case "lost":
        return "bg-red-500";
      case "pending":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "won":
        return <Trophy className="h-4 w-4" />;
      case "lost":
        return <TrendingDown className="h-4 w-4" />;
      case "pending":
        return <Clock className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
            <History className="h-5 w-5" />
            Betting History
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
            <History className="h-5 w-5" />
            Betting History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={fetchBettingHistory} className="mt-4">
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
          <History className="h-5 w-5" />
          Betting History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enhanced Stats Overview */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Total Bets</p>
              <p className="text-2xl font-bold">{stats.total_bets}</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Win Rate</p>
              <p className="text-2xl font-bold text-green-600">
                {stats.win_rate.toFixed(1)}%
              </p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Total Wagered</p>
              <p className="text-2xl font-bold text-blue-600">
                {stats.total_wagered}
              </p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Total Won</p>
              <p className="text-2xl font-bold text-green-600">
                {stats.total_won}
              </p>
            </div>
          </div>
        )}

        {/* Filter and Sort Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <h3 className="font-semibold">Recent Bets</h3>

          <div className="flex gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Bets</SelectItem>
                <SelectItem value="won">Won</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="amount">Amount</SelectItem>
                <SelectItem value="winnings">Winnings</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Betting History List */}
        <div className="space-y-4">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-8">
              <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {filter === "all"
                  ? "No betting history yet"
                  : `No ${filter} bets found`}
              </p>
              <p className="text-sm text-muted-foreground">
                {filter === "all"
                  ? "Start betting on matches to see your history here"
                  : "Try adjusting your filters or place some bets"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHistory.map((bet) => (
                <div
                  key={bet.id}
                  className="flex items-center justify-between p-4 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {getInitials(bet.bet_on_player_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        Bet on {bet.bet_on_player_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {bet.match?.player1_name} vs {bet.match?.player2_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(bet.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(bet.status)}
                      <Badge
                        variant={
                          bet.status === "won"
                            ? "default"
                            : bet.status === "lost"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {bet.status.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{bet.points_wagered}</span>
                      <span className="text-muted-foreground">→</span>
                      <span
                        className={
                          bet.status === "won"
                            ? "text-green-600 font-bold"
                            : "text-muted-foreground"
                        }
                      >
                        {bet.status === "won" ? bet.potential_winnings : 0}
                      </span>
                    </div>
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
