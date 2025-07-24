"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { TournamentWithDetails, PlayerStats } from "@/lib/types";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";

import { Badge } from "@/components/ui/badge";

import { Trophy, Zap, Users, Calendar, ArrowRight, Medal } from "lucide-react";

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const [featuredTournaments, setFeaturedTournaments] = useState<
    TournamentWithDetails[]
  >([]);
  const [topPlayers, setTopPlayers] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchHomeData();
  }, []);

  const fetchHomeData = async () => {
    try {
      // Check if Supabase is configured
      if (
        !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ) {
        console.log("Supabase not configured, using demo mode");
        setLoading(false);
        return;
      }

      // Fetch featured tournaments (open + recent)
      const { data: tournaments, error: tournamentsError } = await supabase
        .from("tournaments")
        .select(
          `
          *,
          created_by_user:users!created_by(id, display_name),
          tournament_participants(id)
        `
        )
        .in("status", ["open", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(3);

      if (tournamentsError) {
        console.error("Error fetching tournaments:", tournamentsError);
      }

      // Fetch top players
      const { data: players, error: playersError } = await supabase
        .from("player_stats")
        .select("*")
        .order("tournaments_won", { ascending: false })
        .order("win_percentage", { ascending: false })
        .limit(5);

      if (playersError) {
        console.error("Error fetching players:", playersError);
      }

      if (tournaments) {
        const tournamentsWithCounts = tournaments.map((tournament) => ({
          ...tournament,
          participant_count: tournament.tournament_participants?.length || 0,
        }));
        setFeaturedTournaments(tournamentsWithCounts);
      }

      if (players) {
        setTopPlayers(players);
      }
    } catch (error) {
      console.error("Error fetching home data:", error);
      setError(
        "Unable to load data. Please check your Supabase configuration."
      );
    } finally {
      setLoading(false);
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

  // Show loading spinner only for a maximum of 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        setLoading(false);
        console.log("Loading timeout - showing page anyway");
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [loading]);

  if (authLoading || (loading && !error)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading Bolobey...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Development Notice */}
      {(!process.env.NEXT_PUBLIC_SUPABASE_URL || error) && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
          <div className="container mx-auto px-4 py-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-200 text-center">
              <strong>Demo Mode:</strong> Supabase not configured. Set up your
              database to see live data.
            </p>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Subtle background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20"></div>

        {/* Floating elements for visual interest */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            {/* Main headline */}
            <h1 className="text-6xl md:text-8xl font-bold tracking-tight mb-8 leading-none">
              <span className="text-foreground">Bolobey</span>
            </h1>

            {/* Subtitle */}
            <p className="text-2xl md:text-3xl font-light text-muted-foreground mb-12 leading-relaxed">
              Tournament management,{" "}
              <span className="text-foreground font-medium">reimagined</span>
            </p>

            {/* Description */}
            <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
              Create, compete, and conquer in the ultimate Beyblade tournament
              platform. Seamless brackets, real-time updates, and professional
              management tools.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                size="lg"
                asChild
                className="h-14 px-10 text-lg font-medium rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Link href="/tournaments">
                  <Trophy className="mr-3 h-5 w-5" />
                  Explore Tournaments
                </Link>
              </Button>

              {!user && (
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="h-14 px-10 text-lg font-medium rounded-full border-2 hover:bg-muted/50 transition-all duration-300"
                >
                  <Link href="/auth/signup">
                    Get Started
                    <ArrowRight className="ml-3 h-5 w-5" />
                  </Link>
                </Button>
              )}
            </div>

            {/* Stats or social proof */}
            <div className="mt-16 pt-8 border-t border-border/50">
              <div className="flex justify-center items-center gap-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>Join thousands of players</span>
                </div>
                <div className="w-px h-4 bg-border"></div>
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  <span>Professional tournaments</span>
                </div>
                <div className="w-px h-4 bg-border"></div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  <span>Real-time brackets</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-32">
        <div className="container mx-auto px-4">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              Powerful features,{" "}
              <span className="text-muted-foreground">simple design</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Everything you need to create and manage professional tournaments,
              all wrapped in an intuitive interface that just works.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center group">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Zap className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-2xl font-semibold mb-4">Smart Brackets</h3>
              <p className="text-muted-foreground leading-relaxed">
                Automated bracket generation with intelligent seeding and
                real-time updates. Single elimination, double elimination, and
                more formats.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Users className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-2xl font-semibold mb-4">Player Analytics</h3>
              <p className="text-muted-foreground leading-relaxed">
                Comprehensive statistics and rankings. Track your progress,
                analyze performance, and climb the global leaderboards.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Trophy className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-2xl font-semibold mb-4">
                Tournament Management
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Professional tournament tools with registration management,
                match scheduling, and automated result tracking.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Tournaments */}
      {featuredTournaments.length > 0 && (
        <section className="py-32 bg-muted/20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
                Live tournaments
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Join the action in these exciting competitions happening right
                now
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {featuredTournaments.map((tournament) => (
                <div key={tournament.id} className="group cursor-pointer">
                  <Link href={`/tournaments/${tournament.id}`}>
                    <div className="bg-background rounded-2xl p-8 border border-border/50 hover:border-border hover:shadow-lg transition-all duration-300 group-hover:scale-[1.02]">
                      <div className="flex justify-between items-start mb-6">
                        <h3 className="text-xl font-semibold group-hover:text-primary transition-colors">
                          {tournament.name}
                        </h3>
                        <Badge
                          variant={
                            tournament.status === "open"
                              ? "default"
                              : "secondary"
                          }
                          className="rounded-full"
                        >
                          {tournament.status === "open"
                            ? "Open"
                            : "In Progress"}
                        </Badge>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm">
                            Starts {formatDate(tournament.start_date)}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span className="text-sm">
                            {tournament.participant_count}/
                            {tournament.max_participants} players
                          </span>
                        </div>

                        <div className="pt-4">
                          <div className="flex justify-between text-sm text-muted-foreground mb-2">
                            <span>Registration</span>
                            <span>
                              {Math.round(
                                ((tournament.participant_count || 0) /
                                  tournament.max_participants) *
                                  100
                              )}
                              %
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-primary h-2 rounded-full transition-all duration-500"
                              style={{
                                width: `${
                                  ((tournament.participant_count || 0) /
                                    tournament.max_participants) *
                                  100
                                }%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>

            <div className="text-center mt-12">
              <Button
                variant="outline"
                size="lg"
                asChild
                className="rounded-full px-8"
              >
                <Link href="/tournaments">
                  View All Tournaments
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Top Players */}
      {topPlayers.length > 0 && (
        <section className="py-32">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
                Champions
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Meet the top performers in the Beyblade community
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              <div className="bg-background rounded-2xl border border-border/50 overflow-hidden">
                {topPlayers.map((player, index) => (
                  <div
                    key={player.id}
                    className="group hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center justify-between p-8">
                      <div className="flex items-center gap-6">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm transition-transform group-hover:scale-110 ${
                            index === 0
                              ? "bg-gradient-to-br from-yellow-400 to-yellow-600 text-yellow-50 shadow-lg"
                              : index === 1
                              ? "bg-gradient-to-br from-gray-400 to-gray-600 text-gray-50 shadow-lg"
                              : index === 2
                              ? "bg-gradient-to-br from-amber-500 to-amber-700 text-amber-50 shadow-lg"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {index < 3 ? (
                            <Medal className="h-5 w-5" />
                          ) : (
                            <span className="text-lg">{index + 1}</span>
                          )}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                            {player.display_name}
                          </h3>
                          <p className="text-muted-foreground">
                            {player.total_matches} matches •{" "}
                            {player.tournaments_won} tournaments won
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                          {player.win_percentage}%
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Win Rate
                        </p>
                      </div>
                    </div>
                    {index < topPlayers.length - 1 && (
                      <div className="h-px bg-border/50 mx-8"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Setup Guide */}
      {!process.env.NEXT_PUBLIC_SUPABASE_URL && (
        <section className="py-32 bg-muted/20">
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
                Ready to set up?
              </h2>
              <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
                Configure your Supabase database to start managing real
                tournaments and player data with our professional platform.
              </p>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="h-14 px-10 text-lg font-medium rounded-full border-2 hover:bg-muted/50 transition-all duration-300"
              >
                <Link href="https://supabase.com" target="_blank">
                  Set Up Supabase
                  <ArrowRight className="ml-3 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      {!user && process.env.NEXT_PUBLIC_SUPABASE_URL && (
        <section className="py-32 bg-gradient-to-br from-primary/5 to-primary/10">
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
                Ready to compete?
              </h2>
              <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
                Join thousands of Beyblade fans in epic tournaments and climb to
                the top of the rankings with our professional platform.
              </p>
              <Button
                size="lg"
                asChild
                className="h-14 px-10 text-lg font-medium rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Link href="/auth/signup">
                  Get Started Now
                  <ArrowRight className="ml-3 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
