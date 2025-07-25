"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Navigation } from "@/components/navigation";
import { LiveTournamentDashboard } from "@/components/live-tournament-dashboard";
import { TournamentChat } from "@/components/tournament-chat";
import { EnhancedBracket } from "@/components/enhanced-bracket";
import { MatchScoring } from "@/components/match-scoring";
import { PushNotificationToggle } from "@/components/push-notification-toggle";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Trophy,
  Users,
  Calendar,
  Eye,
  MessageCircle,
  BarChart3,
  Zap,
} from "lucide-react";
import Link from "next/link";

// Mock tournament data
const mockTournament = {
  id: "demo-tournament",
  name: "V2 Demo Tournament",
  description:
    "Experience the next generation of tournament management with real-time features, live scoring, and interactive brackets.",
  start_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  registration_deadline: new Date(
    Date.now() + 12 * 60 * 60 * 1000
  ).toISOString(),
  max_participants: 8,
  status: "in_progress",
  format: "single_elimination",
  current_phase: "elimination",
  created_by: "demo-user",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockParticipants = [
  {
    id: "1",
    user_id: "user1",
    tournament_id: "demo",
    username: "Blade Master",
    avatar_url: "/icon.svg",
    created_at: new Date().toISOString(),
  },
  {
    id: "2",
    user_id: "user2",
    tournament_id: "demo",
    username: "Spin Doctor",
    avatar_url: "/icon.svg",
    created_at: new Date().toISOString(),
  },
  {
    id: "3",
    user_id: "user3",
    tournament_id: "demo",
    username: "Burst King",
    avatar_url: "/icon.svg",
    created_at: new Date().toISOString(),
  },
  {
    id: "4",
    user_id: "user4",
    tournament_id: "demo",
    username: "Ring Out Queen",
    avatar_url: "/icon.svg",
    created_at: new Date().toISOString(),
  },
];

const mockMatches = [
  {
    id: "match1",
    round: 1,
    matchNumber: 1,
    player1: {
      id: "user1",
      name: "Blade Master",
      score: 2,
      avatar: "/icon.svg",
    },
    player2: {
      id: "user2",
      name: "Spin Doctor",
      score: 1,
      avatar: "/icon.svg",
    },
    status: "in_progress" as const,
    startTime: new Date(Date.now() - 30 * 60 * 1000),
  },
  {
    id: "match2",
    round: 1,
    matchNumber: 2,
    player1: { id: "user3", name: "Burst King", score: 3, avatar: "/icon.svg" },
    player2: {
      id: "user4",
      name: "Ring Out Queen",
      score: 0,
      avatar: "/icon.svg",
    },
    status: "completed" as const,
    winner: { id: "user3", name: "Burst King" },
    startTime: new Date(Date.now() - 60 * 60 * 1000),
    endTime: new Date(Date.now() - 45 * 60 * 1000),
  },
  {
    id: "match3",
    round: 2,
    matchNumber: 1,
    player1: {
      id: "user1",
      name: "Blade Master",
      score: 0,
      avatar: "/icon.svg",
    },
    player2: { id: "user3", name: "Burst King", score: 0, avatar: "/icon.svg" },
    status: "pending" as const,
  },
];

export default function DemoTournamentPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedMatch, setSelectedMatch] = useState(mockMatches[0]);

  const handleMatchClick = (match: any) => {
    setSelectedMatch(match);
    setActiveTab("scoring");
  };

  const handleScoreUpdate = (
    player1Score: number,
    player2Score: number,
    winnerId?: string
  ) => {
    console.log("Score updated:", { player1Score, player2Score, winnerId });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        {/* Tournament Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">{mockTournament.name}</h1>
              <p className="text-xl text-muted-foreground mb-4">
                {mockTournament.description}
              </p>

              <div className="flex flex-wrap gap-4 mb-6">
                <Badge variant="outline" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {new Date(mockTournament.start_date).toLocaleDateString()}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {mockParticipants.length}/{mockTournament.max_participants}{" "}
                  Participants
                </Badge>
                <Badge
                  variant={
                    mockTournament.status === "in_progress"
                      ? "default"
                      : "secondary"
                  }
                >
                  {mockTournament.status}
                </Badge>
                <Badge variant="outline">
                  {mockTournament.format.replace("_", " ")}
                </Badge>
              </div>
            </div>

            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href="/tournaments">
                  <Eye className="h-4 w-4 mr-2" />
                  Back to Tournaments
                </Link>
              </Button>
            </div>
          </div>
        </motion.div>

        {/* V2 Features Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Live Dashboard
            </TabsTrigger>
            <TabsTrigger value="bracket" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Bracket
            </TabsTrigger>
            <TabsTrigger value="scoring" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Live Scoring
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Chat
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">
                Live Tournament Dashboard
              </h2>
              <p className="text-muted-foreground">
                Real-time tournament progress with live statistics and match
                updates.
              </p>
            </div>

            <LiveTournamentDashboard
              tournamentId={mockTournament.id}
              tournamentName={mockTournament.name}
              matches={mockMatches}
              onMatchClick={handleMatchClick}
            />
          </TabsContent>

          <TabsContent value="bracket" className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">Tournament Bracket</h2>
              <p className="text-muted-foreground">
                Interactive tournament bracket with live updates and match
                management.
              </p>
            </div>

            <EnhancedBracket
              tournamentId={mockTournament.id}
              matches={mockMatches}
              onMatchClick={handleMatchClick}
            />
          </TabsContent>

          <TabsContent value="scoring" className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">Live Match Scoring</h2>
              <p className="text-muted-foreground">
                Real-time scoring with instant updates across all devices.
              </p>
            </div>

            {selectedMatch ? (
              <div className="max-w-4xl mx-auto">
                <MatchScoring
                  matchId={selectedMatch.id}
                  tournamentId={mockTournament.id}
                  player1={selectedMatch.player1!}
                  player2={selectedMatch.player2!}
                  status={selectedMatch.status}
                  onScoreUpdate={handleScoreUpdate}
                />
              </div>
            ) : (
              <Card className="max-w-2xl mx-auto">
                <CardContent className="pt-6 text-center">
                  <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Select a Match</h3>
                  <p className="text-muted-foreground mb-4">
                    Choose a match from the bracket or dashboard to start
                    scoring.
                  </p>
                  <Button onClick={() => setActiveTab("bracket")}>
                    View Bracket
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="chat" className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">Tournament Chat</h2>
              <p className="text-muted-foreground">
                Real-time chat for tournament participants and spectators.
              </p>
            </div>

            <div className="w-full max-w-4xl mx-auto">
              <TournamentChat
                tournamentId={mockTournament.id}
                currentUserId="demo-user"
                currentUsername="Demo User"
                currentUserAvatar="/icon.svg"
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-16"
        >
          <Card className="max-w-2xl mx-auto">
            <CardContent className="pt-6">
              <h3 className="text-xl font-bold mb-4">
                Ready to Experience V2?
              </h3>
              <p className="text-muted-foreground mb-6">
                These features are now available in your Bolobey tournament
                platform!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild>
                  <Link href="/tournaments">Create Tournament</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/leaderboard">View Leaderboard</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Push Notification Settings */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-16"
        >
          <PushNotificationToggle />
        </motion.div>
      </div>
    </div>
  );
}
