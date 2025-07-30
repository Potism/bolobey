"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Users,
  Target,
  Zap,
  Settings,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTournamentData } from "@/lib/hooks/useTournamentData";

export default function LiveDashboardPage() {
  const params = useParams();
  const tournamentId = params.tournamentId as string;

  // Use tab-isolated hook for tournament data
  const {
    tournament,
    currentMatch,
    spectatorCount,
    isLoading,
    isConnected,
    lastUpdate,
  } = useTournamentData(tournamentId);

  // Dashboard state
  const [isOverlayVisible, setIsOverlayVisible] = useState(true);
  const [isMuted, setIsMuted] = useState(false);

  // Memoized YouTube embed URL
  const embedUrl = useMemo(() => {
    if (tournament?.youtube_video_id) {
      return `https://www.youtube.com/embed/${
        tournament.youtube_video_id
      }?autoplay=1&rel=0&modestbranding=1&showinfo=0&controls=1&disablekb=0&fs=1&iv_load_policy=3&cc_load_policy=0&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(
        window.location.origin
      )}`;
    }
    return null;
  }, [tournament?.youtube_video_id]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto mb-4"></div>
          <h2 className="text-white text-2xl font-bold mb-2">
            Loading Live Dashboard...
          </h2>
          <p className="text-gray-400">Connecting to tournament data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (!tournament) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-white text-2xl font-bold mb-2">
            Tournament Not Found
          </h2>
          <p className="text-gray-400">
            The tournament you&apos;re looking for doesn&apos;t exist or has
            been removed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* YouTube Stream Background */}
      {embedUrl && (
        <div className="absolute inset-0 z-0">
          <iframe
            src={embedUrl}
            width="100%"
            height="100%"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Live Stream"
            className="w-full h-full"
          />
        </div>
      )}

      {/* Dashboard Controls */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOverlayVisible(!isOverlayVisible)}
          className="bg-black/50 text-white border-white/20 hover:bg-black/70"
        >
          {isOverlayVisible ? "Hide Overlay" : "Show Overlay"}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMuted(!isMuted)}
          className="bg-black/50 text-white border-white/20 hover:bg-black/70"
        >
          {isMuted ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
        </Button>

        <Button
          variant="outline"
          size="sm"
          asChild
          className="bg-black/50 text-white border-white/20 hover:bg-black/70"
        >
          <a href={`/streaming-control/${tournamentId}`} target="_blank">
            <Settings className="h-4 w-4" />
          </a>
        </Button>
      </div>

      {/* Overlay Elements */}
      <AnimatePresence>
        {isOverlayVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.9 }}
            exit={{ opacity: 0 }}
            className="relative z-10 min-h-screen pointer-events-none"
          >
            {/* Top Bar - Tournament Info & Live Score */}
            <motion.div
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              className="absolute top-0 left-0 right-0 bg-gradient-to-r from-black/90 via-black/80 to-black/90 backdrop-blur-sm border-b border-white/20"
            >
              <div className="flex items-center justify-between p-4">
                {/* Tournament Info */}
                <div className="flex items-center gap-4">
                  <Trophy className="h-6 w-6 text-yellow-400" />
                  <div>
                    <h1 className="text-xl font-bold text-white">
                      {tournament.name}
                    </h1>
                    <p className="text-sm text-gray-300">
                      {tournament.status === "in_progress"
                        ? "LIVE TOURNAMENT"
                        : "Tournament"}
                    </p>
                  </div>
                </div>

                {/* Live Score Widget */}
                {currentMatch && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="flex items-center gap-8"
                  >
                    {/* Player 1 */}
                    <div className="text-center">
                      <div className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 rounded-lg px-6 py-3 border border-blue-400/30">
                        <h3 className="text-white font-bold text-lg mb-1">
                          {currentMatch.player1?.display_name || "Player 1"}
                        </h3>
                        <motion.div
                          key={currentMatch.player1_score}
                          initial={{ scale: 1.3, color: "#fbbf24" }}
                          animate={{ scale: 1, color: "#ffffff" }}
                          className="text-4xl font-bold text-white"
                        >
                          {currentMatch.player1_score}
                        </motion.div>
                      </div>
                    </div>

                    {/* VS Divider */}
                    <div className="text-center">
                      <div className="text-white font-bold text-2xl mb-1">
                        VS
                      </div>
                      <div className="w-12 h-1 bg-white/50 rounded-full"></div>
                      <div className="mt-2">
                        <Badge variant="destructive" className="animate-pulse">
                          LIVE
                        </Badge>
                      </div>
                      {lastUpdate && (
                        <div className="mt-1 text-xs text-white/60">
                          Updated: {lastUpdate.toLocaleTimeString()}
                          <span className="ml-2 text-green-400 animate-pulse">
                            ●
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Player 2 */}
                    <div className="text-center">
                      <div className="bg-gradient-to-r from-red-500/20 to-red-600/20 rounded-lg px-6 py-3 border border-red-400/30">
                        <h3 className="text-white font-bold text-lg mb-1">
                          {currentMatch.player2?.display_name || "Player 2"}
                        </h3>
                        <motion.div
                          key={currentMatch.player2_score}
                          initial={{ scale: 1.3, color: "#fbbf24" }}
                          animate={{ scale: 1, color: "#ffffff" }}
                          className="text-4xl font-bold text-white"
                        >
                          {currentMatch.player2_score}
                        </motion.div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Spectator Count & Connection Status */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-black/50 px-3 py-2 rounded-lg">
                    <Users className="h-4 w-4 text-blue-400" />
                    <span className="font-bold text-white">
                      {spectatorCount}
                    </span>
                    <span className="text-sm text-gray-300">spectators</span>
                  </div>

                  {/* Connection Status */}
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                        isConnected
                          ? "bg-green-500/20 text-green-400 border border-green-500/30"
                          : "bg-red-500/20 text-red-400 border border-red-500/30"
                      }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full ${
                          isConnected ? "bg-green-400" : "bg-red-400"
                        }`}
                      ></div>
                      <span>{isConnected ? "LIVE" : "OFFLINE"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Match Info Bar */}
              {currentMatch && (
                <div className="px-4 pb-3">
                  <div className="flex items-center justify-center gap-4 text-white">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-red-400" />
                      <span className="text-sm font-medium">
                        Round {currentMatch.round} • Match{" "}
                        {currentMatch.match_number}
                      </span>
                    </div>
                    <div className="w-1 h-4 bg-white/30 rounded-full"></div>
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-400" />
                      <span className="text-sm">First to 3 points wins</span>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>

            {/* No Active Match Message */}
            {!currentMatch && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                <div className="bg-black/50 backdrop-blur-sm rounded-lg px-6 py-4 border border-white/20">
                  <Target className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-white text-lg font-medium">
                    Waiting for Match
                  </p>
                  <p className="text-gray-400 text-sm">
                    No active match in progress
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
