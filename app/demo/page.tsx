"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Navigation } from "@/components/navigation";
import { MatchScoring } from "@/components/match-scoring";
import { EnhancedBracket } from "@/components/enhanced-bracket";
import { PushNotificationToggle } from "@/components/push-notification-toggle";
import { LiveTournamentDashboard } from "@/components/live-tournament-dashboard";
import { TournamentChat } from "@/components/tournament-chat";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Users, Zap, Smartphone, Download, Wifi } from "lucide-react";

// Demo data
const demoMatches = [
  {
    id: "match-1",
    round: 1,
    matchNumber: 1,
    player1: { id: "player-1", name: "Alex Chen", score: 2 },
    player2: { id: "player-2", name: "Sarah Kim", score: 1 },
    status: "in_progress" as const,
  },
  {
    id: "match-2",
    round: 1,
    matchNumber: 2,
    player1: { id: "player-3", name: "Mike Johnson", score: 0 },
    player2: { id: "player-4", name: "Emma Davis", score: 0 },
    status: "pending" as const,
  },
  {
    id: "match-3",
    round: 1,
    matchNumber: 3,
    player1: { id: "player-5", name: "David Wilson", score: 3 },
    player2: { id: "player-6", name: "Lisa Brown", score: 1 },
    winner: { id: "player-5", name: "David Wilson" },
    status: "completed" as const,
  },
  {
    id: "match-4",
    round: 1,
    matchNumber: 4,
    player1: { id: "player-7", name: "Tom Anderson", score: 0 },
    player2: { id: "player-8", name: "Rachel Green", score: 0 },
    status: "pending" as const,
  },
  {
    id: "match-5",
    round: 2,
    matchNumber: 5,
    player1: { id: "player-5", name: "David Wilson", score: 0 },
    player2: { id: "tbd", name: "TBD", score: 0 },
    status: "pending" as const,
  },
  {
    id: "match-6",
    round: 2,
    matchNumber: 6,
    player1: { id: "tbd", name: "TBD", score: 0 },
    player2: { id: "tbd", name: "TBD", score: 0 },
    status: "pending" as const,
  },
  {
    id: "match-7",
    round: 3,
    matchNumber: 7,
    player1: { id: "tbd", name: "TBD", score: 0 },
    player2: { id: "tbd", name: "TBD", score: 0 },
    status: "pending" as const,
  },
];

export default function DemoPage() {
  const [activeTab, setActiveTab] = useState("scoring");
  const [selectedMatch, setSelectedMatch] = useState(demoMatches[0]);

  const handleScoreUpdate = (
    player1Score: number,
    player2Score: number,
    winnerId?: string
  ) => {
    console.log("Score updated:", { player1Score, player2Score, winnerId });
  };

  const handleMatchClick = (match: (typeof demoMatches)[0]) => {
    setSelectedMatch(match);
    setActiveTab("scoring");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            🚀 V2 Features Demo
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Experience the next generation of tournament management
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <Badge variant="secondary" className="text-sm px-4 py-2">
              <Zap className="mr-2 h-4 w-4" />
              Real-time Scoring
            </Badge>
            <Badge variant="secondary" className="text-sm px-4 py-2">
              <Trophy className="mr-2 h-4 w-4" />
              Enhanced Brackets
            </Badge>
            <Badge variant="secondary" className="text-sm px-4 py-2">
              <Smartphone className="mr-2 h-4 w-4" />
              PWA Ready
            </Badge>
            <Badge variant="secondary" className="text-sm px-4 py-2">
              <Users className="mr-2 h-4 w-4" />
              Live Updates
            </Badge>
          </div>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Real-time Match Scoring
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Live scoring with instant updates across all devices. Perfect
                  for tournament organizers and spectators.
                </p>
                <ul className="space-y-2 text-sm">
                  <li>• Instant score updates</li>
                  <li>• Live connection status</li>
                  <li>• Winner detection</li>
                  <li>• Mobile-optimized controls</li>
                </ul>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  Enhanced Bracket Visualization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Interactive tournament brackets with live status updates and
                  match management.
                </p>
                <ul className="space-y-2 text-sm">
                  <li>• Interactive match cards</li>
                  <li>• Live status indicators</li>
                  <li>• Match details modal</li>
                  <li>• Responsive design</li>
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Demo Section */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="scoring">Live Scoring</TabsTrigger>
            <TabsTrigger value="bracket">Bracket</TabsTrigger>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
          </TabsList>

          <TabsContent value="scoring" className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">
                Live Match Scoring Demo
              </h2>
              <p className="text-muted-foreground">
                Try the real-time scoring system. Updates will be reflected
                instantly across all connected devices.
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              <MatchScoring
                matchId={selectedMatch.id}
                tournamentId="demo-tournament"
                player1={selectedMatch.player1!}
                player2={selectedMatch.player2!}
                status={selectedMatch.status}
                onScoreUpdate={handleScoreUpdate}
              />
            </div>
          </TabsContent>

          <TabsContent value="bracket" className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">Enhanced Bracket Demo</h2>
              <p className="text-muted-foreground">
                Interactive tournament bracket with live updates and match
                management.
              </p>
            </div>

            <div className="w-full">
              <EnhancedBracket
                tournamentId="demo-tournament"
                matches={demoMatches}
                onMatchClick={handleMatchClick}
              />
            </div>
          </TabsContent>

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

            <div className="w-full">
              <LiveTournamentDashboard
                tournamentId="demo-tournament"
                tournamentName="Demo Tournament"
                matches={demoMatches}
                onMatchClick={handleMatchClick}
              />
            </div>
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
                tournamentId="demo-tournament"
                currentUserId="demo-user-1"
                currentUsername="Demo User"
                currentUserAvatar="/icon.svg"
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* PWA Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-16 space-y-8"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-primary" />
                Progressive Web App Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Download className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Install as App</h3>
                  <p className="text-sm text-muted-foreground">
                    Install Bolobey on your device for a native app experience
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Wifi className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Offline Support</h3>
                  <p className="text-sm text-muted-foreground">
                    Access core features even without internet connection
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Push Notifications</h3>
                  <p className="text-sm text-muted-foreground">
                    Get real-time updates about matches and tournaments
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Push Notification Toggle */}
          <div className="max-w-md mx-auto">
            <PushNotificationToggle />
          </div>
        </motion.div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-12"
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
      </div>
    </div>
  );
}
