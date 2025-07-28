"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, AlertCircle, CheckCircle } from "lucide-react";

interface Match {
  id: string;
  player1_name: string;
  player2_name: string;
  player1_score: number;
  player2_score: number;
  status: string;
  round: number;
  match_number: number;
  created_at: string;
}

interface MatchStatusDebugProps {
  tournamentId: string;
}

export function MatchStatusDebug({ tournamentId }: MatchStatusDebugProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching matches:", error);
        setError(error.message);
        return;
      }

      console.log("All matches for tournament:", data);
      setMatches(data || []);
    } catch (err) {
      console.error("Error in fetchMatches:", err);
      setError("Failed to fetch matches");
    } finally {
      setLoading(false);
    }
  };

  const forceStartMatch = async (matchId: string) => {
    try {
      console.log("Force starting match:", matchId);

      const { error } = await supabase
        .from("matches")
        .update({
          status: "in_progress",
          player1_score: 0,
          player2_score: 0,
        })
        .eq("id", matchId);

      if (error) {
        console.error("Error force starting match:", error);
        setError(error.message);
        return;
      }

      console.log("Match force started successfully");
      await fetchMatches();
    } catch (err) {
      console.error("Error in forceStartMatch:", err);
      setError("Failed to start match");
    }
  };

  useEffect(() => {
    fetchMatches();
  }, [tournamentId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "in_progress":
        return "bg-green-500";
      case "active":
        return "bg-blue-500";
      case "completed":
        return "bg-gray-500";
      case "pending":
        return "bg-yellow-500";
      default:
        return "bg-red-500";
    }
  };

  const activeMatches = matches.filter(
    (m) => m.status === "in_progress" || m.status === "active"
  );
  const pendingMatches = matches.filter((m) => m.status === "pending");
  const completedMatches = matches.filter((m) => m.status === "completed");

  return (
    <Card className="border-2 border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
          <AlertCircle className="h-5 w-5" />
          Match Status Debug
          <Button
            onClick={fetchMatches}
            variant="ghost"
            size="sm"
            className="ml-auto"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Active Matches */}
          <div className="space-y-2">
            <h3 className="font-semibold text-green-700 dark:text-green-300">
              Active Matches ({activeMatches.length})
            </h3>
            {activeMatches.map((match) => (
              <div
                key={match.id}
                className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    {match.player1_name} vs {match.player2_name}
                  </span>
                  <Badge className={`text-xs ${getStatusColor(match.status)}`}>
                    {match.status}
                  </Badge>
                </div>
                <p className="text-xs text-green-600 dark:text-green-400">
                  Score: {match.player1_score} - {match.player2_score}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  Round {match.round} • Match {match.match_number}
                </p>
              </div>
            ))}
          </div>

          {/* Pending Matches */}
          <div className="space-y-2">
            <h3 className="font-semibold text-yellow-700 dark:text-yellow-300">
              Pending Matches ({pendingMatches.length})
            </h3>
            {pendingMatches.map((match) => (
              <div
                key={match.id}
                className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    {match.player1_name} vs {match.player2_name}
                  </span>
                  <Badge className={`text-xs ${getStatusColor(match.status)}`}>
                    {match.status}
                  </Badge>
                </div>
                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                  Round {match.round} • Match {match.match_number}
                </p>
                <Button
                  onClick={() => forceStartMatch(match.id)}
                  size="sm"
                  className="mt-2 w-full"
                >
                  Force Start
                </Button>
              </div>
            ))}
          </div>

          {/* Completed Matches */}
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-700 dark:text-gray-300">
              Completed Matches ({completedMatches.length})
            </h3>
            {completedMatches.map((match) => (
              <div
                key={match.id}
                className="p-3 bg-gray-100 dark:bg-gray-900/20 rounded-lg border border-gray-200 dark:border-gray-800"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    {match.player1_name} vs {match.player2_name}
                  </span>
                  <Badge className={`text-xs ${getStatusColor(match.status)}`}>
                    {match.status}
                  </Badge>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Final Score: {match.player1_score} - {match.player2_score}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Round {match.round} • Match {match.match_number}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">
            Debug Summary
          </h4>
          <div className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
            <p>• Total Matches: {matches.length}</p>
            <p>• Active Matches: {activeMatches.length}</p>
            <p>• Pending Matches: {pendingMatches.length}</p>
            <p>• Completed Matches: {completedMatches.length}</p>
            <p>• Tournament ID: {tournamentId}</p>
          </div>
        </div>

        {/* Instructions */}
        <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <h4 className="font-semibold text-purple-700 dark:text-purple-300 mb-2">
            Troubleshooting Steps
          </h4>
          <div className="text-sm text-purple-600 dark:text-purple-400 space-y-1">
            <p>
              1. If no active matches, click "Force Start" on a pending match
            </p>
            <p>2. Check browser console for any error messages</p>
            <p>3. Refresh the overlay page after starting a match</p>
            <p>4. Ensure the tournament has matches created</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
