"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import {
  Target,
  Calendar,
  Clock,
  Star,
  Zap,
  CheckCircle,
  RefreshCw,
} from "lucide-react";

interface Challenge {
  id: string;
  name: string;
  description: string;
  challenge_type: "daily" | "weekly" | "achievement";
  requirement_type: string;
  requirement_count: number;
  stream_points_reward: number;
  is_active: boolean;
}

interface ChallengeProgress {
  challenge_id: string;
  progress_count: number;
  is_completed: boolean;
  completed_at?: string;
}

interface WinStreak {
  current_streak: number;
  longest_streak: number;
  last_win_date?: string;
}

export function ChallengesDashboard() {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [progress, setProgress] = useState<ChallengeProgress[]>([]);
  const [winStreak, setWinStreak] = useState<WinStreak | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchChallengesData();
    }
  }, [user]);

  const fetchChallengesData = async () => {
    try {
      setLoading(true);

      // Fetch challenges
      const { data: challengesData } = await supabase
        .from("challenges")
        .select("*")
        .eq("is_active", true)
        .order("challenge_type", { ascending: true });

      if (challengesData) {
        setChallenges(challengesData);
      }

      // Fetch user progress
      const { data: progressData } = await supabase
        .from("user_challenge_progress")
        .select("*")
        .eq("user_id", user?.id);

      if (progressData) {
        setProgress(progressData);
      }

      // Fetch win streak
      const { data: streakData } = await supabase
        .from("user_win_streaks")
        .select("*")
        .eq("user_id", user?.id)
        .single();

      if (streakData) {
        setWinStreak(streakData);
      }
    } catch (error) {
      console.error("Error fetching challenges data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getProgressForChallenge = (challengeId: string) => {
    const progressItem = progress.find((p) => p.challenge_id === challengeId);
    return progressItem || { progress_count: 0, is_completed: false };
  };

  const getChallengeTypeColor = (type: string) => {
    switch (type) {
      case "daily":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200";
      case "weekly":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200";
      case "achievement":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading challenges...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Win Streak Section */}
      <Card className="border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 dark:border-orange-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
            <Zap className="h-6 w-6" />
            Win Streak
            {winStreak && winStreak.current_streak > 0 && (
              <Badge variant="secondary" className="ml-2">
                {winStreak.current_streak} wins
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {winStreak ? (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-2">
                  {winStreak.current_streak}
                </div>
                <p className="text-sm text-muted-foreground">Current Streak</p>
                {winStreak.current_streak >= 3 && (
                  <Badge className="mt-2 bg-orange-600">
                    +
                    {winStreak.current_streak >= 10
                      ? 50
                      : winStreak.current_streak >= 5
                      ? 25
                      : 10}
                    % Bonus
                  </Badge>
                )}
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-2">
                  {winStreak.longest_streak}
                </div>
                <p className="text-sm text-muted-foreground">Longest Streak</p>
                {winStreak.longest_streak >= 10 && (
                  <Badge className="mt-2 bg-yellow-600">
                    <Star className="h-3 w-3 mr-1" />
                    Legend
                  </Badge>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <Target className="h-12 w-12 mx-auto mb-4 text-orange-500 opacity-50" />
              <p className="text-muted-foreground">
                Start winning bets to build your streak!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Challenges Section */}
      <div className="grid gap-6">
        {/* Daily Challenges */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Daily Challenges
              <Badge variant="outline" className="ml-2">
                {challenges.filter((c) => c.challenge_type === "daily").length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {challenges
                .filter((challenge) => challenge.challenge_type === "daily")
                .map((challenge) => {
                  const progress = getProgressForChallenge(challenge.id);
                  const percentage = Math.min(
                    (progress.progress_count / challenge.requirement_count) *
                      100,
                    100
                  );

                  return (
                    <div key={challenge.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {progress.is_completed ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <Target className="h-5 w-5 text-blue-600" />
                          )}
                          <h3 className="font-medium">{challenge.name}</h3>
                        </div>
                        <Badge
                          className={getChallengeTypeColor(
                            challenge.challenge_type
                          )}
                        >
                          {challenge.stream_points_reward} pts
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {challenge.description}
                      </p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>
                            {progress.progress_count}/
                            {challenge.requirement_count}
                          </span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                        {progress.is_completed && (
                          <div className="flex items-center gap-2 text-green-600 text-sm">
                            <CheckCircle className="h-4 w-4" />
                            Completed! +{challenge.stream_points_reward} stream
                            points earned
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>

        {/* Weekly Challenges */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-600" />
              Weekly Challenges
              <Badge variant="outline" className="ml-2">
                {challenges.filter((c) => c.challenge_type === "weekly").length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {challenges
                .filter((challenge) => challenge.challenge_type === "weekly")
                .map((challenge) => {
                  const progress = getProgressForChallenge(challenge.id);
                  const percentage = Math.min(
                    (progress.progress_count / challenge.requirement_count) *
                      100,
                    100
                  );

                  return (
                    <div key={challenge.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {progress.is_completed ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <Target className="h-5 w-5 text-purple-600" />
                          )}
                          <h3 className="font-medium">{challenge.name}</h3>
                        </div>
                        <Badge
                          className={getChallengeTypeColor(
                            challenge.challenge_type
                          )}
                        >
                          {challenge.stream_points_reward} pts
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {challenge.description}
                      </p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>
                            {progress.progress_count}/
                            {challenge.requirement_count}
                          </span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                        {progress.is_completed && (
                          <div className="flex items-center gap-2 text-green-600 text-sm">
                            <CheckCircle className="h-4 w-4" />
                            Completed! +{challenge.stream_points_reward} stream
                            points earned
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>

        {/* Achievement Challenges */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-600" />
              Achievements
              <Badge variant="outline" className="ml-2">
                {
                  challenges.filter((c) => c.challenge_type === "achievement")
                    .length
                }
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {challenges
                .filter(
                  (challenge) => challenge.challenge_type === "achievement"
                )
                .map((challenge) => {
                  const progress = getProgressForChallenge(challenge.id);
                  const percentage = Math.min(
                    (progress.progress_count / challenge.requirement_count) *
                      100,
                    100
                  );

                  return (
                    <div key={challenge.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {progress.is_completed ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <Target className="h-5 w-5 text-yellow-600" />
                          )}
                          <h3 className="font-medium">{challenge.name}</h3>
                        </div>
                        <Badge
                          className={getChallengeTypeColor(
                            challenge.challenge_type
                          )}
                        >
                          {challenge.stream_points_reward} pts
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {challenge.description}
                      </p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>
                            {progress.progress_count}/
                            {challenge.requirement_count}
                          </span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                        {progress.is_completed && (
                          <div className="flex items-center gap-2 text-green-600 text-sm">
                            <CheckCircle className="h-4 w-4" />
                            Completed! +{challenge.stream_points_reward} stream
                            points earned
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-center">
        <Button onClick={fetchChallengesData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Challenges
        </Button>
      </div>
    </div>
  );
}
