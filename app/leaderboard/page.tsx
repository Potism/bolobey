"use client";

import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";
import { PlayerStats } from "@/lib/types";
import { Navigation } from "@/components/navigation";
import { useOptimizedFetch } from "@/lib/hooks/useOptimizedFetch";
import ErrorBoundary from "@/lib/utils/error-boundary";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Trophy,
  Medal,
  Search,
  TrendingUp,
  Users,
  Target,
  Crown,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

export default function LeaderboardPage() {
  const [players, setPlayers] = useState<PlayerStats[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<
    "tournaments_won" | "win_percentage" | "total_matches"
  >("tournaments_won");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [usingDemoData, setUsingDemoData] = useState(false);

  useEffect(() => {
    fetchLeaderboardData();
  }, []);

  useEffect(() => {
    filterAndSortPlayers();
  }, [players, searchTerm, sortBy, sortOrder]);

  const fetchLeaderboardData = async () => {
    try {
      // Check if Supabase is configured
      const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
      const hasSupabaseKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      console.log(
        "Supabase URL:",
        hasSupabaseUrl ? "Configured" : "NOT CONFIGURED"
      );
      console.log(
        "Supabase Key:",
        hasSupabaseKey ? "Configured" : "NOT CONFIGURED"
      );

      if (!hasSupabaseUrl || !hasSupabaseKey) {
        console.log("Supabase not configured, using demo data");
        setUsingDemoData(true);
        setDemoData();
        setLoading(false);
        return;
      }

      // Debug: Check raw data first
      console.log("Fetching leaderboard data...");

      const { data, error } = await supabase
        .from("player_stats")
        .select("*")
        .order("tournaments_won", { ascending: false })
        .order("win_percentage", { ascending: false });

      if (error) {
        console.error("Error fetching player_stats:", error);
        throw error;
      }

      console.log("Player stats data:", data);
      setPlayers(data || []);

      // Debug: Also check tournaments and matches
      const { data: tournaments, error: tournamentsError } = await supabase
        .from("tournaments")
        .select("id, name, status, winner_id")
        .eq("status", "completed");

      if (tournamentsError) {
        console.error("Error fetching tournaments:", tournamentsError);
      } else {
        console.log("Completed tournaments:", tournaments);
      }

      const { data: matches, error: matchesError } = await supabase
        .from("matches")
        .select("id, tournament_id, player1_id, player2_id, winner_id, status")
        .eq("status", "completed");

      if (matchesError) {
        console.error("Error fetching matches:", matchesError);
      } else {
        console.log("Completed matches:", matches);
      }

      // Debug: Check user roles
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, display_name, role")
        .in("role", ["player", "admin"]);

      if (usersError) {
        console.error("Error fetching users:", usersError);
      } else {
        console.log("Users with roles:", users);
      }

      // Debug: Check tournament participants
      const { data: participants, error: participantsError } = await supabase
        .from("tournament_participants")
        .select("tournament_id, user_id");

      if (participantsError) {
        console.error("Error fetching participants:", participantsError);
      } else {
        console.log("Tournament participants:", participants);
      }
    } catch (error) {
      console.error("Error fetching leaderboard data:", error);
      setUsingDemoData(true);
      setDemoData();
    } finally {
      setLoading(false);
    }
  };

  const setDemoData = () => {
    const demoPlayers: PlayerStats[] = [
      {
        id: "1",
        display_name: "BladeMaster",
        total_matches: 45,
        matches_won: 38,
        win_percentage: 84.4,
        tournaments_won: 8,
        tournaments_played: 12,
        total_points: 156,
        total_burst_points: 89,
        total_ringout_points: 45,
        total_spinout_points: 22,
      },
      {
        id: "2",
        display_name: "SpinDoctor",
        total_matches: 52,
        matches_won: 41,
        win_percentage: 78.8,
        tournaments_won: 6,
        tournaments_played: 15,
        total_points: 142,
        total_burst_points: 78,
        total_ringout_points: 38,
        total_spinout_points: 26,
      },
      {
        id: "3",
        display_name: "BeyBlaster",
        total_matches: 38,
        matches_won: 32,
        win_percentage: 84.2,
        tournaments_won: 5,
        tournaments_played: 8,
        total_points: 134,
        total_burst_points: 76,
        total_ringout_points: 35,
        total_spinout_points: 23,
      },
      {
        id: "4",
        display_name: "ArenaKing",
        total_matches: 67,
        matches_won: 48,
        win_percentage: 71.6,
        tournaments_won: 4,
        tournaments_played: 18,
        total_points: 198,
        total_burst_points: 112,
        total_ringout_points: 56,
        total_spinout_points: 30,
      },
      {
        id: "5",
        display_name: "TournamentTitan",
        total_matches: 29,
        matches_won: 25,
        win_percentage: 86.2,
        tournaments_won: 3,
        tournaments_played: 5,
        total_points: 98,
        total_burst_points: 58,
        total_ringout_points: 25,
        total_spinout_points: 15,
      },
    ];
    setPlayers(demoPlayers);
  };

  const filterAndSortPlayers = () => {
    const filtered = players.filter((player) =>
      player.display_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];

      if (sortOrder === "desc") {
        return bValue - aValue;
      } else {
        return aValue - bValue;
      }
    });

    setFilteredPlayers(filtered);
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Crown className="h-6 w-6 text-primary" />;
      case 1:
        return <Medal className="h-6 w-6 text-accent-foreground/80" />;
      case 2:
        return <Medal className="h-6 w-6 text-accent-foreground/60" />;
      default:
        return (
          <span className="text-lg font-bold text-muted-foreground">
            {index + 1}
          </span>
        );
    }
  };

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return (
          <Badge className="bg-accent text-accent-foreground">
            🥇 Champion
          </Badge>
        );
      case 1:
        return (
          <Badge className="bg-muted text-muted-foreground">🥈 Elite</Badge>
        );
      case 2:
        return (
          <Badge className="bg-muted text-muted-foreground">🥉 Veteran</Badge>
        );
      case 3:
      case 4:
        return <Badge variant="secondary">Top 5</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        <Navigation />

        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="bg-muted/5 dark:bg-muted/10 rounded-lg p-6 mb-8">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600">
                  <Trophy className="h-8 w-8 text-white" />
                </div>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                Leaderboard
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                The top Beyblade competitors ranked by their tournament
                victories and performance
              </p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Card className="bg-background/50">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Total Players
                      </p>
                      <p className="text-2xl font-bold">{players.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-background/50">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Tournaments
                      </p>
                      <p className="text-2xl font-bold">
                        {players.reduce(
                          (sum, p) => sum + p.tournaments_played,
                          0
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-background/50">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Target className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Total Matches
                      </p>
                      <p className="text-2xl font-bold">
                        {players.reduce((sum, p) => sum + p.total_matches, 0)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-background/50">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-purple-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Avg Win Rate
                      </p>
                      <p className="text-2xl font-bold">
                        {players.length > 0
                          ? Math.round(
                              players.reduce(
                                (sum, p) => sum + p.win_percentage,
                                0
                              ) / players.length
                            )
                          : 0}
                        %
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search players..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2">
              <Select
                value={sortBy}
                onValueChange={(value) =>
                  setSortBy(
                    value as
                      | "tournaments_won"
                      | "win_percentage"
                      | "total_matches"
                  )
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tournaments_won">
                    Tournaments Won
                  </SelectItem>
                  <SelectItem value="win_percentage">Win Percentage</SelectItem>
                  <SelectItem value="total_matches">Total Matches</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setSortOrder(sortOrder === "desc" ? "asc" : "desc")
                }
                className="w-10"
              >
                <TrendingUp
                  className={`h-4 w-4 transition-transform ${
                    sortOrder === "asc" ? "rotate-180" : ""
                  }`}
                />
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setLoading(true);
                  fetchLeaderboardData();
                }}
                className="w-10"
                title="Refresh leaderboard"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Leaderboard */}
          <div className="space-y-4">
            {filteredPlayers.map((player, index) => (
              <Card
                key={player.id}
                className="hover:shadow-lg dark:hover:shadow-xl dark:hover:shadow-black/10 transition-all duration-300"
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted">
                        {getRankIcon(index)}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-xl font-semibold">
                            {player.display_name}
                          </h3>
                          {getRankBadge(index)}
                        </div>

                        <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Trophy className="h-4 w-4" />
                            <span>{player.tournaments_won} wins</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Target className="h-4 w-4" />
                            <span>{player.total_matches} matches</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <TrendingUp className="h-4 w-4" />
                            <span>{player.win_percentage}% win rate</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-3xl font-bold text-primary mb-1">
                        {player[sortBy]}
                        {sortBy === "win_percentage" && "%"}
                      </div>
                      <p className="text-sm text-muted-foreground capitalize">
                        {sortBy.replace("_", " ")}
                      </p>
                    </div>
                  </div>

                  {/* Progress bar for win percentage */}
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-muted-foreground mb-1">
                      <span>Win Rate</span>
                      <span>{player.win_percentage}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${player.win_percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Empty State */}
          {filteredPlayers.length === 0 && (
            <div className="text-center py-24">
              <div className="max-w-md mx-auto">
                <Trophy className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchTerm ? "No players found" : "No players yet"}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {searchTerm
                    ? "Try adjusting your search terms"
                    : "Be the first to join a tournament and climb the leaderboard!"}
                </p>
                {!searchTerm && (
                  <Button asChild>
                    <Link href="/tournaments">Join a Tournament</Link>
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Data Source Notice */}
          {usingDemoData && (
            <div className="mt-8 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200 text-center">
                <strong>Demo Mode:</strong> Showing sample leaderboard data. Set
                up your Supabase database to see real player statistics.
              </p>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
