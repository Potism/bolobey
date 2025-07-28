"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
} from "lucide-react";
import Link from "next/link";

export default function HowItWorksPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          How Bolobey Works
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Learn everything about Bolobey - the ultimate tournament betting game
          where you can earn real prizes!
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
                Buy betting points or earn them through gameplay
              </p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 dark:bg-green-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="font-semibold mb-2">2. Place Bets</h3>
              <p className="text-sm text-muted-foreground">
                Bet on tournament matches and predict winners
              </p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 dark:bg-purple-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Gift className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-2">3. Win Prizes</h3>
              <p className="text-sm text-muted-foreground">
                Earn stream points and redeem amazing prizes
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
              <span>Buy points or earn from winning bets</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Spendable balance for betting</span>
            </div>
            <div className="bg-yellow-100 dark:bg-yellow-900/30 p-4 rounded-lg">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                💡 Example: You have 100 betting points → You can bet up to 100
                points on a match
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
              <span>Used to redeem prizes (gaming chairs, laptops)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Earn from winning bets and challenges</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Never decrease - only accumulate</span>
            </div>
            <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-lg">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                💡 Example: You have 500 stream points → You can redeem a prize
                worth 500 points
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
            How Betting Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold mb-4 text-green-800 dark:text-green-200">
                Basic Betting Process
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Choose a match</p>
                    <p className="text-sm text-muted-foreground">
                      Select from live tournament matches
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Select a player</p>
                    <p className="text-sm text-muted-foreground">
                      Pick who you think will win
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
                      Choose how many points to bet
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
                      See if your prediction was correct
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
                    Get back your bet + profit (2x your bet) + stream points
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

      {/* Advanced Features */}
      <div className="grid lg:grid-cols-2 gap-8 mb-12">
        {/* Win Streaks */}
        <Card className="border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 dark:border-orange-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
              <Zap className="h-6 w-6" />
              Win Streak Bonuses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Build winning streaks to earn bonus stream points on your wins!
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <span className="font-medium">3 wins in a row</span>
                <Badge variant="secondary">+10% bonus</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <span className="font-medium">5 wins in a row</span>
                <Badge variant="secondary">+25% bonus</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <span className="font-medium">10 wins in a row</span>
                <Badge variant="secondary">+50% bonus</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Risk/Reward */}
        <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 dark:border-purple-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-800 dark:text-purple-200">
              <TrendingUp className="h-6 w-6" />
              Risk/Reward System
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Bigger bets = more stream points per win!
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <span className="font-medium">Bet 50 points</span>
                <Badge variant="secondary">25 stream points</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <span className="font-medium">Bet 100 points</span>
                <Badge variant="secondary">50 stream points</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <span className="font-medium">Bet 500 points</span>
                <Badge variant="secondary">150 stream points</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <span className="font-medium">Bet 1000+ points</span>
                <Badge variant="secondary">350 stream points</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Challenges */}
      <Card className="mb-8 border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 dark:border-indigo-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-indigo-800 dark:text-indigo-200">
            <Award className="h-6 w-6" />
            Daily & Weekly Challenges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Daily Challenges */}
            <div>
              <h3 className="font-semibold mb-4 text-indigo-800 dark:text-indigo-200 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Daily Challenges
              </h3>
              <div className="space-y-3">
                <div className="bg-indigo-100 dark:bg-indigo-900/30 p-3 rounded-lg">
                  <p className="font-medium text-sm">Daily Winner</p>
                  <p className="text-xs text-muted-foreground">
                    Win 5 bets today
                  </p>
                  <Badge variant="secondary" className="mt-1">
                    100 stream points
                  </Badge>
                </div>
                <div className="bg-indigo-100 dark:bg-indigo-900/30 p-3 rounded-lg">
                  <p className="font-medium text-sm">Daily Bettor</p>
                  <p className="text-xs text-muted-foreground">
                    Place 10 bets today
                  </p>
                  <Badge variant="secondary" className="mt-1">
                    50 stream points
                  </Badge>
                </div>
                <div className="bg-indigo-100 dark:bg-indigo-900/30 p-3 rounded-lg">
                  <p className="font-medium text-sm">Daily Streak</p>
                  <p className="text-xs text-muted-foreground">
                    Win 3 bets in a row today
                  </p>
                  <Badge variant="secondary" className="mt-1">
                    150 stream points
                  </Badge>
                </div>
              </div>
            </div>

            {/* Weekly Challenges */}
            <div>
              <h3 className="font-semibold mb-4 text-indigo-800 dark:text-indigo-200 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Weekly Challenges
              </h3>
              <div className="space-y-3">
                <div className="bg-indigo-100 dark:bg-indigo-900/30 p-3 rounded-lg">
                  <p className="font-medium text-sm">Weekly Champion</p>
                  <p className="text-xs text-muted-foreground">
                    Win 25 bets this week
                  </p>
                  <Badge variant="secondary" className="mt-1">
                    500 stream points
                  </Badge>
                </div>
                <div className="bg-indigo-100 dark:bg-indigo-900/30 p-3 rounded-lg">
                  <p className="font-medium text-sm">Weekly Gambler</p>
                  <p className="text-xs text-muted-foreground">
                    Place 50 bets this week
                  </p>
                  <Badge variant="secondary" className="mt-1">
                    200 stream points
                  </Badge>
                </div>
                <div className="bg-indigo-100 dark:bg-indigo-900/30 p-3 rounded-lg">
                  <p className="font-medium text-sm">Weekly Streak Master</p>
                  <p className="text-xs text-muted-foreground">
                    Win 10 bets in a row this week
                  </p>
                  <Badge variant="secondary" className="mt-1">
                    1000 stream points
                  </Badge>
                </div>
              </div>
            </div>

            {/* Achievement Challenges */}
            <div>
              <h3 className="font-semibold mb-4 text-indigo-800 dark:text-indigo-200 flex items-center gap-2">
                <Star className="h-5 w-5" />
                Achievements
              </h3>
              <div className="space-y-3">
                <div className="bg-indigo-100 dark:bg-indigo-900/30 p-3 rounded-lg">
                  <p className="font-medium text-sm">First Win</p>
                  <p className="text-xs text-muted-foreground">
                    Win your first bet
                  </p>
                  <Badge variant="secondary" className="mt-1">
                    50 stream points
                  </Badge>
                </div>
                <div className="bg-indigo-100 dark:bg-indigo-900/30 p-3 rounded-lg">
                  <p className="font-medium text-sm">Betting Pro</p>
                  <p className="text-xs text-muted-foreground">
                    Place 100 bets total
                  </p>
                  <Badge variant="secondary" className="mt-1">
                    500 stream points
                  </Badge>
                </div>
                <div className="bg-indigo-100 dark:bg-indigo-900/30 p-3 rounded-lg">
                  <p className="font-medium text-sm">Win Streak Legend</p>
                  <p className="text-xs text-muted-foreground">
                    Win 20 bets in a row
                  </p>
                  <Badge variant="secondary" className="mt-1">
                    2000 stream points
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tournament Bonuses */}
      <Card className="mb-8 border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 dark:border-amber-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
            <Crown className="h-6 w-6" />
            Tournament Bonuses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-6">
            Participate in tournaments for extra stream points rewards!
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-amber-100 dark:bg-amber-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Crown className="h-8 w-8 text-amber-600" />
              </div>
              <h3 className="font-semibold mb-2">Winner</h3>
              <Badge variant="secondary" className="text-lg">
                +500 stream points
              </Badge>
            </div>
            <div className="text-center">
              <div className="bg-amber-100 dark:bg-amber-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="h-8 w-8 text-amber-600" />
              </div>
              <h3 className="font-semibold mb-2">Runner-up</h3>
              <Badge variant="secondary" className="text-lg">
                +250 stream points
              </Badge>
            </div>
            <div className="text-center">
              <div className="bg-amber-100 dark:bg-amber-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-amber-600" />
              </div>
              <h3 className="font-semibold mb-2">Participation</h3>
              <Badge variant="secondary" className="text-lg">
                +50 stream points
              </Badge>
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
                      Win bets and complete challenges
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
                      Go to your profile and select prizes
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
                      Choose your prize and confirm
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
                      We'll collect shipping details
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-4 text-emerald-800 dark:text-emerald-200">
                Example Prizes
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
                    <p className="font-medium">Build streaks</p>
                    <p className="text-sm text-muted-foreground">
                      Focus on building win streaks for bonus points
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-cyan-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Complete challenges</p>
                    <p className="text-sm text-muted-foreground">
                      Daily and weekly challenges give great rewards
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-cyan-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-0.5">
                    4
                  </div>
                  <div>
                    <p className="font-medium">Participate in tournaments</p>
                    <p className="text-sm text-muted-foreground">
                      Tournament bonuses are significant
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
            betting, earning points, and winning amazing prizes!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/tournaments">
              <Button size="lg" className="bg-purple-600 hover:bg-purple-700">
                <Eye className="h-5 w-5 mr-2" />
                View Tournaments
              </Button>
            </Link>
            <Link href="/profile">
              <Button
                size="lg"
                variant="outline"
                className="border-purple-600 text-purple-600 hover:bg-purple-600 hover:text-white"
              >
                <Gamepad2 className="h-5 w-5 mr-2" />
                Start Playing
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
