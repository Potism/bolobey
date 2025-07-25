"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Users,
  Trophy,
  Zap,
  Target,
  TrendingUp,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

export default function CreateTournamentPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    start_date: "",
    registration_deadline: "",
    max_participants: 16,
    format: "single_elimination" as
      | "single_elimination"
      | "double_elimination"
      | "round_robin"
      | "beyblade_x",
  });

  const formatOptions = [
    {
      value: "single_elimination",
      label: "Single Elimination",
      description: "Classic knockout tournament",
      icon: Trophy,
    },
    {
      value: "double_elimination",
      label: "Double Elimination",
      description: "Players get a second chance",
      icon: Trophy,
    },
    {
      value: "round_robin",
      label: "Round Robin",
      description: "Everyone plays everyone",
      icon: Users,
    },
    {
      value: "beyblade_x",
      label: "Beyblade X",
      description: "Round Robin + Elimination with point scoring",
      icon: Zap,
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("tournaments")
        .insert({
          name: formData.name,
          description: formData.description,
          start_date: formData.start_date,
          registration_deadline: formData.registration_deadline,
          max_participants: formData.max_participants,
          format: formData.format,
          created_by: user.id,
          status: "open",
          current_phase: "registration",
        })
        .select()
        .single();

      if (error) throw error;

      router.push(`/tournaments/${data.id}`);
    } catch (error) {
      console.error("Error creating tournament:", error);
      setError("Failed to create tournament. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    field: keyof typeof formData,
    value: string | number
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-24">
          <div className="text-center max-w-md mx-auto">
            <Trophy className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h1 className="text-2xl font-bold tracking-tight mb-2">
              Sign In Required
            </h1>
            <p className="text-muted-foreground mb-6">
              You need to be signed in to create a tournament.
            </p>
            <Button asChild>
              <Link href="/auth/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const selectedFormat = formatOptions.find((f) => f.value === formData.format);

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

          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Create New Tournament
          </h1>
          <p className="text-muted-foreground">
            Set up your tournament and start inviting participants.
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Tournament Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Tournament Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Enter tournament name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      handleInputChange("description", e.target.value)
                    }
                    placeholder="Describe your tournament..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="registration_deadline">
                      Registration Deadline *
                    </Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="registration_deadline"
                        type="date"
                        value={formData.registration_deadline}
                        onChange={(e) =>
                          handleInputChange(
                            "registration_deadline",
                            e.target.value
                          )
                        }
                        required
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date *</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="start_date"
                        type="date"
                        value={formData.start_date}
                        onChange={(e) =>
                          handleInputChange("start_date", e.target.value)
                        }
                        required
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tournament Format */}
            <Card>
              <CardHeader>
                <CardTitle>Tournament Format</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="format">Format *</Label>
                  <Select
                    value={formData.format}
                    onValueChange={(value: typeof formData.format) =>
                      handleInputChange("format", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {formatOptions.map((format) => {
                        const Icon = format.icon;
                        return (
                          <SelectItem key={format.value} value={format.value}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {format.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Format Description */}
                {selectedFormat && (
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      {(() => {
                        const Icon = selectedFormat.icon;
                        return (
                          <Icon className="h-5 w-5 text-accent-foreground" />
                        );
                      })()}
                      <span className="font-semibold text-foreground">
                        {selectedFormat.label}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {selectedFormat.description}
                    </p>

                    {/* Beyblade X specific info */}
                    {formData.format === "beyblade_x" && (
                      <div className="mt-3 p-3 bg-accent/10 rounded border border-accent">
                        <h4 className="font-semibold text-sm mb-2 text-accent-foreground">
                          Beyblade X Scoring System
                        </h4>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="flex items-center gap-1">
                            <Zap className="h-3 w-3 text-accent-foreground" />
                            <span>Burst: 3pts</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Target className="h-3 w-3 text-accent-foreground" />
                            <span>Ring-Out: 2pts</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3 text-accent-foreground" />
                            <span>Spin-Out: 1pt</span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Round Robin phase followed by Elimination bracket
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="max_participants">Maximum Participants</Label>
                  <Select
                    value={formData.max_participants.toString()}
                    onValueChange={(value) =>
                      handleInputChange("max_participants", parseInt(value))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[4, 8, 16, 32, 64].map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          {num} participants
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={
                loading ||
                !formData.name ||
                !formData.start_date ||
                !formData.registration_deadline
              }
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating Tournament...
                </>
              ) : (
                <>
                  <Trophy className="mr-2 h-4 w-4" />
                  Create Tournament
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
