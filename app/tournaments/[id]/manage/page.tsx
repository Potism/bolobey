"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { TournamentWithDetails } from "@/lib/types";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Settings,
  Users,
  Play,
  Trash2,
  UserX,
  Trophy,
  Calendar,
  Clock,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function TournamentManagePage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const [tournament, setTournament] = useState<TournamentWithDetails | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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

  const isCreator = () => {
    return user && tournament && tournament.created_by === user.id;
  };

  const canManage = () => {
    return isCreator() || isAdmin;
  };

  const handleStartTournament = async () => {
    if (!tournament) return;

    setActionLoading(true);
    try {
      // Check if we have enough participants
      if (
        !tournament.tournament_participants ||
        tournament.tournament_participants.length < 2
      ) {
        setError("Need at least 2 participants to start tournament");
        return;
      }

      // Generate bracket first
      const { generateSingleEliminationBracket } = await import(
        "@/lib/bracket"
      );

      // Convert participants to bracket format
      const bracketParticipants = tournament.tournament_participants.map(
        (p) => ({
          id: p.id,
          tournament_id: p.tournament_id,
          user_id: p.user_id,
          seed: p.seed,
          joined_at: p.joined_at,
          user: p.user,
        })
      );

      // Generate bracket
      const participantIds = bracketParticipants.map((p) => p.user_id);
      const { matches } = generateSingleEliminationBracket(participantIds);

      // Save matches to database
      const { error: matchesError } = await supabase
        .from("matches")
        .insert(matches);

      if (matchesError) {
        console.error("Error creating matches:", matchesError);
        setError(
          "Failed to create tournament matches: " + matchesError.message
        );
        return;
      }

      // Update tournament status
      const { error } = await supabase
        .from("tournaments")
        .update({ status: "in_progress" })
        .eq("id", tournament.id);

      if (error) {
        console.error("Error starting tournament:", error);
        setError("Failed to start tournament: " + error.message);
      } else {
        setShowStartDialog(false);
        await fetchTournament();
        router.push(`/tournaments/${tournament.id}/bracket`);
      }
    } catch (error) {
      console.error("Error starting tournament:", error);
      setError("Failed to start tournament");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTournament = async () => {
    if (!tournament) return;

    setActionLoading(true);
    setError(""); // Clear any previous errors

    try {
      // First, check if user has permission to delete
      if (!canManage()) {
        setError("You don't have permission to delete this tournament");
        return;
      }

      const { error } = await supabase
        .from("tournaments")
        .delete()
        .eq("id", tournament.id);

      if (error) {
        console.error("Error deleting tournament:", error);
        if (error.code === "42501") {
          setError(
            "Permission denied: You don't have permission to delete this tournament"
          );
        } else if (error.code === "23503") {
          setError(
            "Cannot delete tournament: It may have active matches or participants"
          );
        } else {
          setError("Failed to delete tournament: " + error.message);
        }
      } else {
        setShowDeleteDialog(false);
        router.push("/tournaments");
      }
    } catch (error) {
      console.error("Error deleting tournament:", error);
      setError("Failed to delete tournament. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveParticipant = async (participantId: string) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("tournament_participants")
        .delete()
        .eq("id", participantId);

      if (error) {
        console.error("Error removing participant:", error);
        setError("Failed to remove participant: " + error.message);
      } else {
        await fetchTournament();
      }
    } catch (error) {
      console.error("Error removing participant:", error);
      setError("Failed to remove participant");
    } finally {
      setActionLoading(false);
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

  if (!canManage()) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-24">
          <div className="text-center max-w-md mx-auto">
            <Settings className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h1 className="text-2xl font-bold tracking-tight mb-2">
              Access Denied
            </h1>
            <p className="text-muted-foreground mb-6">
              You don&apos;t have permission to manage this tournament.
            </p>
            <Button asChild>
              <Link href={`/tournaments/${tournament.id}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Tournament
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
        {/* Page Header with Theme Toggle */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <Link
              href="/tournaments"
              className="text-muted-foreground hover:text-foreground flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Tournaments
            </Link>
            <span className="text-lg font-semibold text-foreground ml-4">
              Manage Tournament
            </span>
          </div>
          <ThemeToggle />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Tournament Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Tournament Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {tournament.status === "open" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <Play className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <div className="flex-1">
                      <h4 className="font-medium">Start Tournament</h4>
                      <p className="text-sm text-muted-foreground">
                        Begin the tournament and generate brackets
                      </p>
                    </div>
                    <Dialog
                      open={showStartDialog}
                      onOpenChange={setShowStartDialog}
                    >
                      <DialogTrigger asChild>
                        <Button disabled={actionLoading}>
                          <Play className="mr-2 h-4 w-4" />
                          Start Tournament
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Start Tournament</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to start this tournament? This
                            action cannot be undone and will generate the
                            tournament brackets.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setShowStartDialog(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleStartTournament}
                            disabled={actionLoading}
                          >
                            {actionLoading ? "Starting..." : "Start Tournament"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              )}

              {tournament.status === "in_progress" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <Trophy className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    <div className="flex-1">
                      <h4 className="font-medium">Tournament in Progress</h4>
                      <p className="text-sm text-muted-foreground">
                        Manage ongoing matches and brackets
                      </p>
                    </div>
                    <Button asChild>
                      <Link href={`/tournaments/${tournament.id}/bracket`}>
                        <Play className="mr-2 h-4 w-4" />
                        View Bracket
                      </Link>
                    </Button>
                  </div>
                </div>
              )}

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-4 bg-destructive/10 dark:bg-destructive/20 rounded-lg">
                  <Trash2 className="h-5 w-5 text-destructive" />
                  <div className="flex-1">
                    <h4 className="font-medium text-destructive">
                      Delete Tournament
                    </h4>
                    <p className="text-sm text-destructive-foreground">
                      Permanently delete this tournament
                    </p>
                  </div>
                  <Dialog
                    open={showDeleteDialog}
                    onOpenChange={setShowDeleteDialog}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="destructive"
                        className="text-white"
                        disabled={actionLoading}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card text-card-foreground border-destructive">
                      <DialogHeader>
                        <DialogTitle className="text-destructive">
                          Delete Tournament
                        </DialogTitle>
                        <DialogDescription className="text-destructive-foreground">
                          Are you sure you want to delete this tournament? This
                          action cannot be undone and will remove all tournament
                          data.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setShowDeleteDialog(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          className="text-white"
                          onClick={handleDeleteTournament}
                          disabled={actionLoading}
                        >
                          {actionLoading ? "Deleting..." : "Delete Tournament"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tournament Info */}
          <Card>
            <CardHeader>
              <CardTitle>Tournament Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
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
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Participants Management */}
        {tournament.tournament_participants &&
          tournament.tournament_participants.length > 0 && (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>
                  Manage Participants ({tournament.participant_count})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {tournament.tournament_participants.map(
                    (participant, index) => (
                      <div
                        key={participant.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
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
                        {tournament.status === "open" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleRemoveParticipant(participant.id)
                            }
                            disabled={actionLoading}
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          )}

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mt-6">
            <AlertDescription className="font-medium">{error}</AlertDescription>
            <div className="mt-2 text-sm">
              <p>If you&apos;re having trouble deleting the tournament:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>
                  Make sure you&apos;re the tournament creator or an admin
                </li>
                <li>Check if the tournament has any active matches</li>
                <li>Try refreshing the page and try again</li>
              </ul>
            </div>
          </Alert>
        )}
      </div>
    </div>
  );
}
