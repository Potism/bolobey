"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { TournamentWithDetails } from "@/lib/types";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  Users,
  Trophy,
  Plus,
  Clock,
  User,
  Copy,
  Check,
} from "lucide-react";

export default function TournamentsPage() {
  const { isAdmin } = useAuth();
  const [tournaments, setTournaments] = useState<TournamentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<
    "all" | "open" | "in_progress" | "completed"
  >("all");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from("tournaments")
        .select(
          `
          *,
          created_by_user:users!created_by(id, display_name),
          winner:users!winner_id(id, display_name),
          tournament_participants(id, user_id)
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      const tournamentsWithCounts = data.map((tournament) => ({
        ...tournament,
        participant_count: tournament.tournament_participants?.length || 0,
      }));

      setTournaments(tournamentsWithCounts);
    } catch (error) {
      console.error("Error fetching tournaments:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTournaments = tournaments.filter((tournament) => {
    if (filter === "all") return true;
    return tournament.status === filter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
            Open
          </Badge>
        );
      case "in_progress":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
            In Progress
          </Badge>
        );
      case "completed":
        return <Badge variant="secondary">Completed</Badge>;
      case "closed":
        return <Badge variant="destructive">Closed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
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
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-muted/5 dark:bg-muted/10 rounded-lg p-6 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight mb-2">
                Tournaments
              </h1>
              <p className="text-muted-foreground">
                Join the competition and prove your skills
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={copyToClipboard}
                className="flex items-center gap-2"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? "Copied!" : "Share"}
              </Button>

              {isAdmin && (
                <Button asChild>
                  <Link href="/tournaments/create">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Tournament
                  </Link>
                </Button>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2 mb-8">
            {(["all", "open", "in_progress", "completed"] as const).map(
              (status) => (
                <Button
                  key={status}
                  variant={filter === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter(status)}
                  className="capitalize"
                >
                  {status === "all" ? "All" : status.replace("_", " ")}
                </Button>
              )
            )}
          </div>

          {/* Tournaments Grid */}
          {filteredTournaments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTournaments.map((tournament) => (
                <Card
                  key={tournament.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                >
                  <Link href={`/tournaments/${tournament.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start gap-2">
                        <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                          {tournament.name}
                        </CardTitle>
                        {getStatusBadge(tournament.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {tournament.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {tournament.description}
                        </p>
                      )}

                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4 shrink-0" />
                          <span>
                            Starts: {formatDate(tournament.start_date)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4 shrink-0" />
                          <span>
                            Registration until:{" "}
                            {formatDate(tournament.registration_deadline)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="h-4 w-4 shrink-0" />
                          <span>
                            {tournament.participant_count}/
                            {tournament.max_participants} participants
                          </span>
                        </div>

                        {tournament.winner && (
                          <div className="flex items-center gap-2 text-sm">
                            <Trophy className="h-4 w-4 shrink-0 text-yellow-500" />
                            <span className="font-medium">
                              Winner: {tournament.winner.display_name}
                            </span>
                          </div>
                        )}
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="h-4 w-4" />
                          <span>
                            by {tournament.created_by_user?.display_name}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {tournament.format.replace("_", " ")}
                        </Badge>
                      </div>

                      {/* Progress bar for open tournaments */}
                      {tournament.status === "open" && (
                        <div className="space-y-2">
                          <div className="w-full bg-secondary rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full transition-all"
                              style={{
                                width: `${
                                  ((tournament.participant_count || 0) /
                                    tournament.max_participants) *
                                  100
                                }%`,
                              }}
                            ></div>
                          </div>
                          <p className="text-xs text-center text-muted-foreground">
                            {tournament.max_participants -
                              (tournament.participant_count || 0)}{" "}
                            spots remaining
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Link>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-24">
              <div className="max-w-md mx-auto">
                <Trophy className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {filter === "all"
                    ? "No tournaments found"
                    : `No ${filter.replace("_", " ")} tournaments`}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {filter === "all"
                    ? "Be the first to create a tournament and start the competition!"
                    : `Check back later for ${filter.replace(
                        "_",
                        " "
                      )} tournaments.`}
                </p>
                {isAdmin && filter === "all" && (
                  <Button asChild>
                    <Link href="/tournaments/create">
                      <Plus className="mr-2 h-4 w-4" />
                      Create First Tournament
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
