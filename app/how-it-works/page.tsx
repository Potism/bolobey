"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  Coins,
  Target,
  Zap,
  Users,
  Calendar,
  Award,
  TrendingUp,
  Gamepad2,
  Gift,
  Star,
  Crown,
  Clock,
  CheckCircle,
  ArrowRight,
  Play,
  Eye,
  BarChart3,
  Home,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

export default function GuidePage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between mb-8">
        <Link href="/">
          <Button variant="outline" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </Link>
      </div>

      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Bolobey Guide
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Your complete guide to Bolobey - the ultimate tournament betting
          platform where you can earn real prizes!
        </p>
      </div>

      {/* Quick Start Guide */}
      <Card className="mb-8 border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
            <Play className="h-6 w-6" />
            Quick Start Guide
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-blue-100 dark:bg-blue-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Coins className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="font-semibold mb-2">1. Get Points</h3>
              <p className="text-sm text-muted-foreground">
                Purchase betting points to start playing
              </p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 dark:bg-green-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="font-semibold mb-2">2. Place Bets</h3>
              <p className="text-sm text-muted-foreground">
                Bet on live tournament matches
              </p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 dark:bg-purple-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Gift className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-2">3. Win Prizes</h3>
              <p className="text-sm text-muted-foreground">
                Earn stream points and redeem prizes
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two Types of Points */}
      <div className="grid lg:grid-cols-2 gap-8 mb-12">
        <Card className="border-2 border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 dark:border-yellow-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <Coins className="h-6 w-6" />
              Betting Points
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Used to place bets on matches</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Purchase points to start betting</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Win more points when you win bets</span>
            </div>
            <div className="bg-yellow-100 dark:bg-yellow-900/30 p-4 rounded-lg">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                💡 Example: Bet 100 points → Win 200 betting points
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
              <Trophy className="h-6 w-6" />
              Stream Points
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Used to redeem physical prizes</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Earn 50% of your bet as stream points</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Never decrease - only accumulate</span>
            </div>
            <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-lg">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                💡 Example: Bet 100 points → Win 50 stream points
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* How Betting Works */}
      <Card className="mb-8 border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 dark:border-green-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
            <Target className="h-6 w-6" />
            How Live Betting Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold mb-4 text-green-800 dark:text-green-200">
                Betting Process
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Find a live match</p>
                    <p className="text-sm text-muted-foreground">
                      Look for matches with "Betting Open" status
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Choose your player</p>
                    <p className="text-sm text-muted-foreground">
                      Pick who you think will win the match
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Enter bet amount</p>
                    <p className="text-sm text-muted-foreground">
                      Choose how many points to wager
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-0.5">
                    4
                  </div>
                  <div>
                    <p className="font-medium">Wait for result</p>
                    <p className="text-sm text-muted-foreground">
                      Watch the match and see if you won
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-4 text-green-800 dark:text-green-200">
                Betting Rewards
              </h3>
              <div className="space-y-4">
                <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-green-800 dark:text-green-200">
                      Win
                    </span>
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Get 2x your bet in betting points + 50% in stream points
                  </p>
                </div>
                <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <X className="h-5 w-5 text-red-600" />
                    <span className="font-semibold text-red-800 dark:text-red-200">
                      Lose
                    </span>
                  </div>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    Lose your bet amount (no stream points)
                  </p>
                </div>
                <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-lg">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    💡 Example: Bet 100 points → Win 200 betting points + 50
                    stream points
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* V3 Features */}
      <Card className="mb-8 border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 dark:border-purple-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-800 dark:text-purple-200">
            <Zap className="h-6 w-6" />
            V3 Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold mb-4 text-purple-800 dark:text-purple-200">
                Enhanced Betting Experience
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Real-time countdown timers</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Dynamic odds calculation</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Live betting statistics</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Enhanced error handling</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Better mobile responsiveness</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-4 text-purple-800 dark:text-purple-200">
                Performance Improvements
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Faster loading times</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Optimized database queries</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Better caching strategies</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Improved real-time updates</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Enhanced user feedback</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prize Redemption */}
      <Card className="mb-8 border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20 dark:border-emerald-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200">
            <Gift className="h-6 w-6" />
            Prize Redemption
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold mb-4 text-emerald-800 dark:text-emerald-200">
                How to Redeem Prizes
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="bg-emerald-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Earn stream points</p>
                    <p className="text-sm text-muted-foreground">
                      Win bets to accumulate stream points
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-emerald-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Visit Prizes section</p>
                    <p className="text-sm text-muted-foreground">
                      Go to the Prizes page in the navigation
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-emerald-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Select and redeem</p>
                    <p className="text-sm text-muted-foreground">
                      Choose your prize and confirm redemption
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-emerald-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-0.5">
                    4
                  </div>
                  <div>
                    <p className="font-medium">Receive your prize</p>
                    <p className="text-sm text-muted-foreground">
                      We'll collect shipping details and send your prize
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-4 text-emerald-800 dark:text-emerald-200">
                Available Prizes
              </h3>
              <div className="space-y-3">
                <div className="bg-emerald-100 dark:bg-emerald-900/30 p-3 rounded-lg">
                  <p className="font-medium">Gaming Chair</p>
                  <Badge variant="secondary">5,000 stream points</Badge>
                </div>
                <div className="bg-emerald-100 dark:bg-emerald-900/30 p-3 rounded-lg">
                  <p className="font-medium">Gaming Laptop</p>
                  <Badge variant="secondary">25,000 stream points</Badge>
                </div>
                <div className="bg-emerald-100 dark:bg-emerald-900/30 p-3 rounded-lg">
                  <p className="font-medium">Gaming Headset</p>
                  <Badge variant="secondary">1,000 stream points</Badge>
                </div>
                <div className="bg-emerald-100 dark:bg-emerald-900/30 p-3 rounded-lg">
                  <p className="font-medium">Gaming Mouse</p>
                  <Badge variant="secondary">500 stream points</Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pro Tips */}
      <Card className="mb-8 border-2 border-cyan-200 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/20 dark:to-blue-950/20 dark:border-cyan-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-cyan-800 dark:text-cyan-200">
            <BarChart3 className="h-6 w-6" />
            Pro Tips & Strategy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold mb-4 text-cyan-800 dark:text-cyan-200">
                Strategy Tips
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="bg-cyan-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Start small</p>
                    <p className="text-sm text-muted-foreground">
                      Begin with small bets to learn the game
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-cyan-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Watch live matches</p>
                    <p className="text-sm text-muted-foreground">
                      Observe players before placing bets
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-cyan-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Focus on stream points</p>
                    <p className="text-sm text-muted-foreground">
                      Stream points are for real prizes
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-cyan-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-0.5">
                    4
                  </div>
                  <div>
                    <p className="font-medium">Check betting times</p>
                    <p className="text-sm text-muted-foreground">
                      Betting closes before matches start
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-4 text-cyan-800 dark:text-cyan-200">
                Risk Management
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-0.5">
                    ⚠
                  </div>
                  <div>
                    <p className="font-medium">Never bet all your points</p>
                    <p className="text-sm text-muted-foreground">
                      Keep some points for future bets
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-0.5">
                    ⚠
                  </div>
                  <div>
                    <p className="font-medium">Don't chase losses</p>
                    <p className="text-sm text-muted-foreground">
                      If you're losing, take a break
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-0.5">
                    ⚠
                  </div>
                  <div>
                    <p className="font-medium">Set limits</p>
                    <p className="text-sm text-muted-foreground">
                      Decide how much you want to bet before starting
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-0.5">
                    ⚠
                  </div>
                  <div>
                    <p className="font-medium">Bet responsibly</p>
                    <p className="text-sm text-muted-foreground">
                      Remember this is a game for entertainment
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Call to Action */}
      <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 dark:border-purple-800">
        <CardContent className="text-center py-12">
          <h2 className="text-3xl font-bold mb-4 text-purple-800 dark:text-purple-200">
            Ready to Start Playing?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Now that you understand how Bolobey works, it's time to start
            betting, earning stream points, and winning amazing prizes!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/tournaments">
              <Button size="lg" className="bg-purple-600 hover:bg-purple-700">
                <Eye className="h-5 w-5 mr-2" />
                View Tournaments
              </Button>
            </Link>
            <Link href="/">
              <Button
                size="lg"
                variant="outline"
                className="border-purple-600 text-purple-600 hover:bg-purple-600 hover:text-white"
              >
                <Home className="h-5 w-5 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Add missing X icon component
const X = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);
