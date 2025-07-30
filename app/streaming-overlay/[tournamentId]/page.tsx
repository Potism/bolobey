"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Users, Target, Zap, Camera } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTournament } from "@/lib/contexts/TournamentContext";

export default function StreamingOverlayPage() {
  const params = useParams();
  const tournamentId = params.tournamentId as string;

  // Use Context API for tournament data
  const { state, actions } = useTournament();
  const { tournament, currentMatch, spectatorCount, isLoading } = state;

  const [mediaSource] = useState<"youtube" | "webcam" | "file">("youtube");
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

  // Performance optimization refs
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Generate unique tab ID to prevent conflicts
  const tabId = useMemo(() => {
    return `overlay_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
  }, []);

  // Webcam functionality for overlay
  const startWebcam = useCallback(async () => {
    try {
      console.log(`[${tabId}] Starting webcam for overlay...`);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error("Webcam not supported in this browser");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: "user",
        },
        audio: false,
      });

      setWebcamStream(stream);
      console.log(`[${tabId}] Webcam started successfully for overlay`);
    } catch (error) {
      console.error(`[${tabId}] Error starting webcam for overlay:`, error);

      // Provide specific guidance based on error type
      let errorMessage = "Webcam error in overlay: ";

      if (error instanceof Error) {
        if (error.name === "NotAllowedError") {
          errorMessage +=
            "Camera permission denied. Please allow camera access.";
        } else if (error.name === "NotFoundError") {
          errorMessage += "No camera found. Please connect a camera.";
        } else if (error.name === "NotReadableError") {
          errorMessage += "Camera is in use by another application.";
        } else {
          errorMessage += error.message;
        }
      } else {
        errorMessage += "Unknown error occurred.";
      }

      console.error(errorMessage);
    }
  }, [tabId]);

  const stopWebcam = useCallback(() => {
    if (webcamStream) {
      webcamStream.getTracks().forEach((track) => track.stop());
      setWebcamStream(null);
      console.log(`[${tabId}] Webcam stopped for overlay`);
    }
  }, [webcamStream, tabId]);

  // Real-time connection management
  const setupRealTimeConnection = useCallback(() => {
    if (!tournamentId) return;

    console.log(`[${tabId}] Setting up real-time connection for overlay...`);

    // Clean up existing connection
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }

    // Create new connection with unique channel name
    const channelName = `tournament_${tournamentId}_overlay_${tabId}`;
    channelRef.current = supabase.channel(channelName);

    // Subscribe to tournament updates
    channelRef.current
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tournaments",
          filter: `id=eq.${tournamentId}`,
        },
        (payload) => {
          console.log(`[${tabId}] Tournament update received:`, payload);
          actions.fetchTournament(tournamentId);
          setLastUpdateTime(new Date());
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        (payload) => {
          console.log(`[${tabId}] Match update received:`, payload);

          // Immediate update for instant responsiveness
          actions.fetchMatches(tournamentId);
          setLastUpdateTime(new Date());
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournament_spectators",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        (payload) => {
          console.log(`[${tabId}] Spectator update received:`, payload);
          actions.fetchSpectatorCount(tournamentId);
          setLastUpdateTime(new Date());
        }
      )
      .subscribe((status) => {
        console.log(`[${tabId}] Real-time connection status:`, status);
        setIsConnected(status === "SUBSCRIBED");
      });

    // Set up heartbeat to maintain connection
    heartbeatIntervalRef.current = setInterval(() => {
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "heartbeat",
          payload: { tabId, timestamp: Date.now() },
        });
      }
    }, 30000); // Every 30 seconds

    console.log(`[${tabId}] Real-time connection setup completed for overlay`);
  }, [tournamentId, tabId, actions]);

  // Cleanup function
  const cleanup = useCallback(() => {
    console.log(`[${tabId}] Cleaning up overlay resources...`);

    // Stop webcam
    stopWebcam();

    // Clean up real-time connection
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }

    // Clean up heartbeat
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    // Clean up abort controller
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    console.log(`[${tabId}] Overlay cleanup completed`);
  }, [tabId, stopWebcam]);

  // Tab visibility management
  useEffect(() => {
    const handleBeforeUnload = () => {
      cleanup();
    };

    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;

      if (isVisible) {
        console.log(`[${tabId}] Tab became visible, refreshing data...`);
        // Refresh data when tab becomes visible
        actions.fetchTournament(tournamentId);
        actions.fetchMatches(tournamentId);
        actions.fetchSpectatorCount(tournamentId);
      }
    };

    const handlePageShow = () => {
      console.log(`[${tabId}] Page shown, refreshing data...`);
      actions.fetchTournament(tournamentId);
      actions.fetchMatches(tournamentId);
      actions.fetchSpectatorCount(tournamentId);
    };

    const handlePageHide = () => {
      console.log(`[${tabId}] Page hidden`);
    };

    // Add event listeners
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [cleanup, tabId, tournamentId, actions]);

  // Initial data loading
  useEffect(() => {
    if (!tournamentId) return;

    console.log(`[${tabId}] Loading initial data for overlay...`);

    const loadInitialData = async () => {
      try {
        await Promise.all([
          actions.fetchTournament(tournamentId),
          actions.fetchMatches(tournamentId),
          actions.fetchSpectatorCount(tournamentId),
        ]);
        console.log(`[${tabId}] Initial data loaded successfully for overlay`);
      } catch (error) {
        console.error(`[${tabId}] Error loading initial data:`, error);
      }
    };

    loadInitialData();
  }, [tournamentId, tabId, actions]);

  // Set up real-time connection
  useEffect(() => {
    if (tournamentId && !isLoading) {
      setupRealTimeConnection();
    }

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [tournamentId, isLoading, setupRealTimeConnection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Memoized YouTube embed URL with performance optimizations
  const embedUrl = useMemo(() => {
    if (tournament?.youtube_video_id) {
      // Performance-optimized YouTube embed parameters
      return `https://www.youtube.com/embed/${
        tournament.youtube_video_id
      }?autoplay=1&rel=0&modestbranding=1&showinfo=0&controls=0&disablekb=1&fs=0&iv_load_policy=3&cc_load_policy=0&playsinline=1&enablejsapi=0&origin=${encodeURIComponent(
        window.location.origin
      )}`;
    }
    return null;
  }, [tournament?.youtube_video_id]);

  // Auto-start webcam if media source is webcam
  useEffect(() => {
    if (mediaSource === "webcam" && !webcamStream) {
      startWebcam();
    } else if (mediaSource !== "webcam" && webcamStream) {
      stopWebcam();
    }
  }, [mediaSource, webcamStream, startWebcam, stopWebcam]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto mb-4"></div>
          <h2 className="text-white text-2xl font-bold mb-2">
            Loading Stream Overlay...
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
      {embedUrl && mediaSource === "youtube" && (
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

      {/* Webcam Background */}
      {mediaSource === "webcam" && (
        <div className="absolute inset-0 z-0">
          {webcamStream ? (
            <video
              ref={(video) => {
                if (video && webcamStream) {
                  video.srcObject = webcamStream;
                  video.play();
                }
              }}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center">
              <div className="text-center text-white">
                <Camera className="h-16 w-16 mx-auto mb-4 text-white/50" />
                <h2 className="text-2xl font-bold mb-2">Webcam Mode</h2>
                <p className="text-white/70 mb-4">Starting webcam...</p>

                {/* Permission Guidance */}
                <div className="mt-4 p-4 bg-white/10 rounded-lg max-w-md">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                    <p className="text-sm font-medium">
                      Camera Permission Required
                    </p>
                  </div>
                  <p className="text-xs text-white/70 mb-3">
                    This tab needs camera access. Look for the camera icon in
                    your browser&apos;s address bar and click &quot;Allow&quot;.
                  </p>

                  {/* Browser-specific instructions */}
                  <div className="text-xs text-white/60 space-y-1">
                    <p>
                      • <strong>Chrome/Edge:</strong> Click the camera icon in
                      the address bar
                    </p>
                    <p>
                      • <strong>Firefox:</strong> Click the camera icon in the
                      address bar
                    </p>
                    <p>
                      • <strong>Safari:</strong> Check Safari &gt; Settings &gt;
                      Websites &gt; Camera
                    </p>
                  </div>

                  <div className="mt-3 p-2 bg-yellow-500/20 rounded border border-yellow-500/30">
                    <p className="text-xs text-yellow-200">
                      💡 <strong>Tip:</strong> If you already allowed camera in
                      another tab, you still need to allow it in this tab too.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Overlay Elements */}
      <div className="relative z-10 min-h-screen">
        {/* Top Bar - Tournament Info & Live Score */}
        <AnimatePresence>
          {tournament && (
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
                      {lastUpdateTime && (
                        <div className="mt-1 text-xs text-white/60">
                          Updated: {lastUpdateTime.toLocaleTimeString()}
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
          )}
        </AnimatePresence>

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
      </div>
    </div>
  );
}
