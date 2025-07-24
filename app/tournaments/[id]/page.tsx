"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { TournamentWithDetails } from "@/lib/types";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Calendar,
  Users,
  Trophy,
  ArrowLeft,
  Clock,
  User,
  MapPin,
  Settings,
  UserPlus,
  Play,
} from "lucide-react";

export default function TournamentDetailsPage() {
  const params = useParams();
  const { user, isAdmin } = useAuth();
  const [tournament, setTournament] = useState<TournamentWithDetails | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchTournament();
    }
  }, [params.id]);

  const fetchTournament = async () => {
    try {
      const { data, error } = await supabase
        .from("tournaments")
        .select(
          `
          *,
          created_by_user:users!created_by(id, display_name),
          winner:users!winner_id(id, display_name),
          tournament_participants(
            id,
            user_id,
            seed,
            joined_at,
            user:users(id, display_name)
          )
        `
        )
        .eq("id", params.id)
        .single();

      if (error) {
        setError("Tournament not found");
        console.error("Error fetching tournament:", error);
      } else {
        setTournament({
          ...data,
          participant_count: data.tournament_participants?.length || 0,
        });
      }
    } catch (error) {
      setError("Failed to load tournament");
      console.error("Error fetching tournament:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinTournament = async () => {
    if (!user || !tournament) return;

    setJoining(true);
    try {
      const { error } = await supabase.from("tournament_participants").insert({
        tournament_id: tournament.id,
        user_id: user.id,
      });

      if (error) {
        console.error("Error joining tournament:", error);
        setError("Failed to join tournament: " + error.message);
      } else {
        // Refresh tournament data
        await fetchTournament();
      }
    } catch (error) {
      console.error("Error joining tournament:", error);
      setError("Failed to join tournament");
    } finally {
      setJoining(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
            Open for Registration
          </Badge>
        );
      case "in_progress":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
            Tournament In Progress
          </Badge>
        );
      case "completed":
        return <Badge variant="secondary">Tournament Completed</Badge>;
      case "closed":
        return <Badge variant="destructive">Registration Closed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isUserParticipant = () => {
    if (!user || !tournament) return false;
    return (
      tournament.tournament_participants?.some((p) => p.user_id === user.id) ||
      false
    );
  };

  const canJoin = () => {
    if (!user || !tournament) return false;
    if (isUserParticipant()) return false;
    if (tournament.status !== "open") return false;
    if ((tournament.participant_count || 0) >= tournament.max_participants)
      return false;
    if (new Date(tournament.registration_deadline) < new Date()) return false;
    return true;
  };

  const isCreator = () => {
    return user && tournament && tournament.created_by === user.id;
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

  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-24">
          <div className="text-center max-w-md mx-auto">
            <Trophy className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h1 className="text-2xl font-bold tracking-tight mb-2">
              Tournament Not Found
            </h1>
            <p className="text-muted-foreground mb-6">
              {error ||
                "The tournament you&apos;re looking for doesn&apos;t exist."}
            </p>
            <Button asChild>
              <Link href="/tournaments">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Tournaments
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/tournaments"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Tournaments
          </Link>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight mb-2">
                {tournament.name}
              </h1>
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                <span>
                  Organized by {tournament.created_by_user?.display_name}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {getStatusBadge(tournament.status)}
              {(isCreator() || isAdmin) && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/tournaments/${tournament.id}/manage`}>
                    <Settings className="mr-2 h-4 w-4" />
                    Manage
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tournament Info */}
            <Card>
              <CardHeader>
                <CardTitle>Tournament Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {tournament.description && (
                  <div>
                    <h4 className="font-medium mb-2">Description</h4>
                    <p className="text-muted-foreground">
                      {tournament.description}
                    </p>
                  </div>
                )}

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Tournament Start</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(tournament.start_date)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Registration Deadline</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(tournament.registration_deadline)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Participants</p>
                      <p className="text-sm text-muted-foreground">
                        {tournament.participant_count}/
                        {tournament.max_participants} players
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Format</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {tournament.format.replace("_", " ")}
                      </p>
                    </div>
                  </div>
                </div>

                {tournament.winner && (
                  <>
                    <Separator />
                    <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <Trophy className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                      <div>
                        <p className="font-medium">Tournament Winner</p>
                        <p className="text-sm text-muted-foreground">
                          🏆 {tournament.winner.display_name}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Participants List */}
            {tournament.tournament_participants &&
              tournament.tournament_participants.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      Participants ({tournament.participant_count})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {tournament.tournament_participants.map(
                        (participant, index) => (
                          <div
                            key={participant.id}
                            className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                          >
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium">
                                {participant.user?.display_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Joined{" "}
                                {new Date(
                                  participant.joined_at
                                ).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Join Tournament */}
            {user && (
              <Card>
                <CardContent className="p-6">
                  {isUserParticipant() ? (
                    <div className="text-center">
                      <div className="w-12 h-12 mx-auto bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
                        <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                      <h3 className="font-semibold mb-2">
                        You&apos;re Registered!
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        You&apos;re all set for this tournament.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        asChild
                      >
                        <Link href={`/tournaments/${tournament.id}/bracket`}>
                          <Play className="mr-2 h-4 w-4" />
                          View Bracket
                        </Link>
                      </Button>
                    </div>
                  ) : canJoin() ? (
                    <div className="text-center">
                      <h3 className="font-semibold mb-2">Join Tournament</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Register to compete in this tournament.
                      </p>
                      <Button
                        onClick={handleJoinTournament}
                        disabled={joining}
                        className="w-full"
                      >
                        {joining ? (
                          <>
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            Joining...
                          </>
                        ) : (
                          <>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Join Tournament
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <h3 className="font-semibold mb-2">
                        Registration Closed
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {tournament.status !== "open"
                          ? "This tournament is no longer accepting participants."
                          : (tournament.participant_count || 0) >=
                            tournament.max_participants
                          ? "This tournament is full."
                          : "Registration deadline has passed."}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {!user && (
              <Card>
                <CardContent className="p-6 text-center">
                  <h3 className="font-semibold mb-2">Join the Competition</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Sign up to participate in tournaments.
                  </p>
                  <Button asChild className="w-full">
                    <Link href="/auth/signup">Create Account</Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Progress Bar */}
            {tournament.status === "open" && (
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Registration Progress</span>
                      <span>
                        {tournament.participant_count}/
                        {tournament.max_participants}
                      </span>
                    </div>
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
                    <p className="text-xs text-muted-foreground text-center">
                      {tournament.max_participants -
                        (tournament.participant_count || 0)}{" "}
                      spots remaining
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mt-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
