"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Users, Target, Zap, Camera } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Tournament {
  id: string;
  name: string;
  status: string;
  youtube_video_id?: string;
  stream_url?: string;
}

interface Match {
  id: string;
  tournament_id: string;
  phase_id: string;
  player1_id: string;
  player2_id: string;
  player1_score: number;
  player2_score: number;
  status: string;
  round: number;
  match_number: number;
  bracket_type: string;
  created_at: string;
  player1?: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
  player2?: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
}

export default function StreamingOverlayPage() {
  const params = useParams();
  const tournamentId = params.tournamentId as string;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [spectatorCount, setSpectatorCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [mediaSource, setMediaSource] = useState<"youtube" | "webcam" | "file">(
    "youtube"
  );
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [isTabActive, setIsTabActive] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

  // Performance optimization refs
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastScoreUpdateRef = useRef<{
    player1: number;
    player2: number;
  } | null>(null);

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
            "Camera permission denied. Please allow camera access in this tab.";
          console.warn(
            `[${tabId}] Camera permission denied - user needs to allow access in this tab`
          );
        } else if (error.name === "NotFoundError") {
          errorMessage += "No camera found on this device.";
          console.warn(`[${tabId}] No camera found on device`);
        } else if (error.name === "NotSupportedError") {
          errorMessage += "Camera not supported in this browser.";
          console.warn(`[${tabId}] Camera not supported in browser`);
        } else if (error.name === "NotReadableError") {
          errorMessage += "Camera is already in use by another application.";
          console.warn(`[${tabId}] Camera already in use`);
        } else {
          errorMessage += error.message || "Unknown error occurred.";
        }
      }

      // Show a subtle notification in the overlay instead of alert
      console.warn(`[${tabId}] ${errorMessage}`);
    }
  }, [tabId]);

  const stopWebcam = useCallback(() => {
    if (webcamStream) {
      console.log(`[${tabId}] Stopping webcam for overlay`);
      webcamStream.getTracks().forEach((track) => {
        track.stop();
        console.log(`[${tabId}] Stopped overlay track:`, track.kind);
      });
      setWebcamStream(null);
      console.log(`[${tabId}] Webcam stopped for overlay`);
    }
  }, [webcamStream, tabId]);

  // Cleanup webcam on unmount
  useEffect(() => {
    const handleBeforeUnload = () => {
      console.log(`[${tabId}] Overlay tab closing - cleaning up webcam`);
      stopWebcam();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      console.log(
        `[${tabId}] Overlay component unmounting - cleaning up webcam`
      );
      window.removeEventListener("beforeunload", handleBeforeUnload);
      stopWebcam();
    };
  }, [stopWebcam, tabId]);

  // Fetch tournament data
  const fetchTournament = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", tournamentId)
        .single();

      if (error) throw error;
      setTournament(data);

      // Determine media source from tournament data
      if (data.stream_url === "webcam") {
        setMediaSource("webcam");
        console.log("Tournament set to webcam mode - starting webcam");
        startWebcam(); // Auto-start webcam when webcam mode is detected
      } else if (data.youtube_video_id) {
        setMediaSource("youtube");
        console.log("Tournament set to YouTube mode");
      } else {
        setMediaSource("youtube"); // Default
      }
    } catch (error) {
      console.error("Error fetching tournament:", error);
    }
  }, [tournamentId, startWebcam]);

  useEffect(() => {
    if (tournamentId) {
      fetchTournament();
    }
  }, [tournamentId, fetchTournament]);

  // Optimized function to fetch current match
  const fetchCurrentMatch = useCallback(async () => {
    try {
      console.log("Fetching current match for tournament:", tournamentId);

      // First, get all matches for this tournament
      const { data: matchesData, error: matchesError } = await supabase
        .from("matches")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("created_at", { ascending: false });

      if (matchesError) {
        console.error("Error fetching matches:", matchesError);
        return;
      }

      console.log("All matches:", matchesData);

      // Find the active match
      const activeMatch = matchesData?.find(
        (match) => match.status === "in_progress"
      );

      if (activeMatch) {
        console.log("Found active match:", activeMatch);

        // Get user data for the players
        const playerIds = [
          activeMatch.player1_id,
          activeMatch.player2_id,
        ].filter(Boolean);

        if (playerIds.length > 0) {
          const { data: usersData, error: usersError } = await supabase
            .from("users")
            .select("id, display_name, avatar_url")
            .in("id", playerIds);

          if (usersError) {
            console.error("Error fetching users:", usersError);
          } else {
            console.log("Users data:", usersData);

            // Create a map for quick lookup
            const userMap = new Map();
            if (usersData) {
              usersData.forEach((user) => userMap.set(user.id, user));
            }

            // Combine match with user data
            const matchWithUsers = {
              ...activeMatch,
              player1: userMap.get(activeMatch.player1_id)
                ? {
                    id: activeMatch.player1_id,
                    display_name: userMap.get(activeMatch.player1_id)
                      ?.display_name,
                    avatar_url: userMap.get(activeMatch.player1_id)?.avatar_url,
                  }
                : undefined,
              player2: userMap.get(activeMatch.player2_id)
                ? {
                    id: activeMatch.player2_id,
                    display_name: userMap.get(activeMatch.player2_id)
                      ?.display_name,
                    avatar_url: userMap.get(activeMatch.player2_id)?.avatar_url,
                  }
                : undefined,
            };

            console.log("Match with users:", matchWithUsers);
            setCurrentMatch(matchWithUsers as Match);
            return;
          }
        }

        // If we can't get user data, still set the match
        setCurrentMatch(activeMatch as Match);
      } else {
        console.log("No active match found");
        setCurrentMatch(null);
      }
    } catch (error) {
      console.error("Error fetching current match:", error);
      setCurrentMatch(null);
    }
  }, [tournamentId]);

  // Optimized spectator count fetching
  const fetchSpectatorCount = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("tournament_spectators")
        .select("active_spectators")
        .eq("tournament_id", tournamentId)
        .single();

      if (!error && data) {
        setSpectatorCount(data.active_spectators || 0);
      }
    } catch (error) {
      console.error("Error fetching spectator count:", error);
    }
  }, [tournamentId]);

  // Consolidated real-time subscriptions with improved score updates
  useEffect(() => {
    if (!tournamentId) return;

    // Initial fetches
    fetchCurrentMatch();
    fetchSpectatorCount();
    setIsLoading(false);

    console.log(
      `[${tabId}] Setting up real-time subscriptions for tournament:`,
      tournamentId
    );

    // Cleanup existing connection
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Single channel for all real-time updates with performance optimization
    const channel = supabase
      .channel(`streaming-overlay-${tournamentId}-${tabId}`)
      .on("system", { event: "disconnect" }, () => {
        console.log(`[${tabId}] Real-time connection lost`);
        setIsConnected(false);
      })
      .on("system", { event: "connect" }, () => {
        console.log(`[${tabId}] Real-time connection established`);
        setIsConnected(true);
      })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        (payload) => {
          // Only process updates if tab is active to reduce resource usage
          if (isTabActive) {
            console.log(`[${tabId}] Match change detected:`, payload);

            // Check if this is a score update
            if (
              payload.eventType === "UPDATE" &&
              (payload.new.player1_score !== payload.old?.player1_score ||
                payload.new.player2_score !== payload.old?.player2_score)
            ) {
              const newScores = {
                player1: payload.new.player1_score,
                player2: payload.new.player2_score,
              };

              // Prevent duplicate score updates
              if (
                !lastScoreUpdateRef.current ||
                lastScoreUpdateRef.current.player1 !== newScores.player1 ||
                lastScoreUpdateRef.current.player2 !== newScores.player2
              ) {
                console.log(
                  `[${tabId}] Score update detected! Player1: ${payload.old?.player1_score}->${payload.new.player1_score}, Player2: ${payload.old?.player2_score}->${payload.new.player2_score}`
                );

                // Immediate score update for better responsiveness
                setCurrentMatch((prevMatch) => {
                  if (prevMatch && prevMatch.id === payload.new.id) {
                    return {
                      ...prevMatch,
                      player1_score: payload.new.player1_score,
                      player2_score: payload.new.player2_score,
                      status: payload.new.status,
                    };
                  }
                  return prevMatch;
                });

                lastScoreUpdateRef.current = newScores;
                // Update last update time
                setLastUpdateTime(new Date());

                // Also fetch the full match data to ensure consistency
                setTimeout(() => fetchCurrentMatch(), 100);
              }
            } else {
              // For other match changes, fetch the full data
              fetchCurrentMatch();
            }
          } else {
            console.log(
              `[${tabId}] Match change ignored (tab inactive):`,
              payload
            );
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournaments",
          filter: `id=eq.${tournamentId}`,
        },
        (payload) => {
          // Only process updates if tab is active
          if (isTabActive) {
            console.log(`[${tabId}] Tournament change detected:`, payload);
            // Refresh tournament data to update media source
            fetchTournament();
          } else {
            console.log(
              `[${tabId}] Tournament change ignored (tab inactive):`,
              payload
            );
          }
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
        () => {
          // Only update spectator count if tab is active
          if (isTabActive) {
            fetchSpectatorCount();
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    // Setup heartbeat to maintain connection
    heartbeatIntervalRef.current = setInterval(() => {
      if (channel) {
        console.log(`[${tabId}] Heartbeat sent`);
      }
    }, 30000); // Every 30 seconds

    return () => {
      console.log(`[${tabId}] Cleaning up overlay subscription`);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [
    tournamentId,
    fetchCurrentMatch,
    fetchSpectatorCount,
    fetchTournament,
    tabId,
    isTabActive,
  ]);

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

  // Add performance optimizations for YouTube iframe
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState(false);

  // Handle iframe load events
  const handleIframeLoad = useCallback(() => {
    console.log(`[${tabId}] YouTube iframe loaded successfully`);
    setIframeLoaded(true);
    setIframeError(false);
  }, [tabId]);

  const handleIframeError = useCallback(() => {
    console.error(`[${tabId}] YouTube iframe failed to load`);
    setIframeError(true);
    setIframeLoaded(false);
  }, [tabId]);

  // Resource management for background tabs
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      console.log(
        `[${tabId}] Tab visibility changed: ${isVisible ? "visible" : "hidden"}`
      );
      setIsTabActive(isVisible);

      // Pause/resume real-time updates based on visibility
      if (isVisible) {
        // Resume updates when tab becomes visible
        fetchCurrentMatch();
        fetchSpectatorCount();
      }
    };

    const handlePageShow = () => {
      console.log(`[${tabId}] Page shown - resuming updates`);
      setIsTabActive(true);
      fetchCurrentMatch();
      fetchSpectatorCount();
    };

    const handlePageHide = () => {
      console.log(`[${tabId}] Page hidden - pausing updates`);
      setIsTabActive(false);
    };

    // Periodic refresh as fallback (every 30 seconds)
    const periodicRefresh = setInterval(() => {
      if (isTabActive && isConnected) {
        console.log(`[${tabId}] Periodic refresh triggered`);
        fetchCurrentMatch();
        fetchSpectatorCount();
      }
    }, 30000);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("pagehide", handlePageHide);
      clearInterval(periodicRefresh);
    };
  }, [tabId, fetchCurrentMatch, fetchSpectatorCount, isTabActive, isConnected]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-2xl">Loading Stream Overlay...</div>
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
            onLoad={handleIframeLoad}
            onError={handleIframeError}
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

                {/* Spectator Count & Refresh Button */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-black/50 px-3 py-2 rounded-lg">
                    <Users className="h-4 w-4 text-blue-400" />
                    <span className="font-bold text-white">
                      {spectatorCount}
                    </span>
                    <span className="text-sm text-gray-300">spectators</span>
                  </div>

                  {/* Connection Status & Manual Refresh */}
                  <div className="flex items-center gap-2">
                    {/* Connection Status */}
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
