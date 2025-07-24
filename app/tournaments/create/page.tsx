"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { CreateTournament } from "@/lib/types";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ArrowLeft, Trophy } from "lucide-react";
import Link from "next/link";

export default function CreateTournamentPage() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    start_date: "",
    registration_deadline: "",
    max_participants: 16,
    format: "single_elimination" as const,
  });

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-24">
          <div className="text-center max-w-md mx-auto">
            <Trophy className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h1 className="text-2xl font-bold tracking-tight mb-2">
              Access Denied
            </h1>
            <p className="text-muted-foreground mb-6">
              You need admin privileges to create tournaments.
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!user) {
      setError("You must be logged in to create a tournament");
      setLoading(false);
      return;
    }

    // Validate dates
    const startDate = new Date(formData.start_date);
    const deadline = new Date(formData.registration_deadline);
    const now = new Date();

    if (deadline <= now) {
      setError("Registration deadline must be in the future");
      setLoading(false);
      return;
    }

    if (startDate <= deadline) {
      setError("Tournament start date must be after registration deadline");
      setLoading(false);
      return;
    }

    const tournamentData: CreateTournament = {
      ...formData,
      created_by: user.id,
      start_date: startDate.toISOString(),
      registration_deadline: deadline.toISOString(),
    };

    try {
      const { data, error } = await supabase
        .from("tournaments")
        .insert([tournamentData])
        .select()
        .single();

      if (error) {
        throw error;
      }

      router.push(`/tournaments/${data.id}`);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to create tournament"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "max_participants" ? parseInt(value) : value,
    }));
  };

  const handleSelectChange = (name: string, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

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
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            Create Tournament
          </h1>
          <p className="text-muted-foreground">
            Set up a new Beyblade tournament for the community
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Tournament Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="name">Tournament Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Enter tournament name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Describe the tournament (optional)"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="min-h-[100px]"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="registration_deadline">
                      Registration Deadline *
                    </Label>
                    <Input
                      id="registration_deadline"
                      name="registration_deadline"
                      type="datetime-local"
                      value={formData.registration_deadline}
                      onChange={handleInputChange}
                      required
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="start_date">Tournament Start *</Label>
                    <Input
                      id="start_date"
                      name="start_date"
                      type="datetime-local"
                      value={formData.start_date}
                      onChange={handleInputChange}
                      required
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="max_participants">Max Participants</Label>
                    <Select
                      value={formData.max_participants.toString()}
                      onValueChange={(value) =>
                        handleSelectChange("max_participants", parseInt(value))
                      }
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select participant limit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="8">8 Players</SelectItem>
                        <SelectItem value="16">16 Players</SelectItem>
                        <SelectItem value="32">32 Players</SelectItem>
                        <SelectItem value="64">64 Players</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="format">Tournament Format</Label>
                    <Select
                      value={formData.format}
                      onValueChange={(value) =>
                        handleSelectChange("format", value)
                      }
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select tournament format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single_elimination">
                          Single Elimination
                        </SelectItem>
                        <SelectItem value="double_elimination">
                          Double Elimination
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    className="h-11"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-11 flex-1"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Tournament...
                      </>
                    ) : (
                      <>
                        <Trophy className="mr-2 h-4 w-4" />
                        Create Tournament
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
