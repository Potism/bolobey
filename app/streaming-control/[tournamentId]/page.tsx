"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { useTournament } from "@/lib/contexts/TournamentContext";
import { supabase } from "@/lib/supabase";
import type { Match } from "@/lib/contexts/TournamentContext";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { motion } from "framer-motion";
import { MatchStatusDebug } from "@/components/match-status-debug";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Trophy,
  Target,
  Users,
  Settings,
  ExternalLink,
  Copy,
  RefreshCw,
  Monitor,
  Zap,
  CheckCircle,
  AlertCircle,
  Award,
  Video,
  Camera,
  Youtube,
  FileVideo,
  Volume2,
  VolumeX,
} from "lucide-react";

export default function StreamingControlPage() {
  const params = useParams();
  const { user } = useAuth();
  const tournamentId = params.tournamentId as string;

  // Use the new Context API
  const { state, actions } = useTournament();

  // Local state for UI controls
  const [selectedPlayer1, setSelectedPlayer1] = useState<string>("");
  const [selectedPlayer2, setSelectedPlayer2] = useState<string>("");
  const [showParticipantSelector, setShowParticipantSelector] = useState(false);
  const [overlayUrl, setOverlayUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);

  // Media Control State
  const [mediaSource, setMediaSource] = useState<"youtube" | "webcam" | "file">(
    "youtube"
  );
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [volume, setVolume] = useState(50);
  const [showMediaSettings, setShowMediaSettings] = useState(false);
  const [isUpdatingMedia, setIsUpdatingMedia] = useState(false);
  const [webcamPermission, setWebcamPermission] = useState<
    "granted" | "denied" | "unknown"
  >("unknown");

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
    return `tab_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
  }, []);

  // Destructure state from context
  const {
    tournament,
    matches,
    participants,
    currentMatch,
    spectatorCount,
    isLoading,
  } = state;

  // Initialize data using Context API
  useEffect(() => {
    if (tournamentId) {
      // Set overlay URL
      const baseUrl = window.location.origin;
      setOverlayUrl(`${baseUrl}/streaming-overlay/${tournamentId}`);

      // Fetch all data using Context API
      actions.fetchTournament(tournamentId);
      actions.fetchMatches(tournamentId);
      actions.fetchParticipants(tournamentId);
      actions.fetchSpectatorCount(tournamentId);
    }
  }, [tournamentId, actions]);

  // Check if user is admin or tournament creator
  const isAuthorized = useMemo(() => {
    if (!user || !tournament) return false;
    return user.id === tournament.created_by || user.role === "admin";
  }, [user, tournament]);

  // Fetch tournament data

  // Real-time updates with enhanced connection management
  useEffect(() => {
    if (!tournamentId) return;

    // Cleanup existing connection
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    console.log(
      `[${tabId}] Setting up real-time connection for tournament:`,
      tournamentId
    );

    const channel = supabase
      .channel(`streaming-control-${tournamentId}-${tabId}`)
      .on("system", { event: "disconnect" }, () => {
        console.log(`[${tabId}] Real-time connection lost`);
      })
      .on("system", { event: "connect" }, () => {
        console.log(`[${tabId}] Real-time connection established`);
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
          console.log(`[${tabId}] Match change detected in control:`, payload);

          // Optimized score update handling
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
                `[${tabId}] Score update: Player1: ${payload.old?.player1_score}->${payload.new.player1_score}, Player2: ${payload.old?.player2_score}->${payload.new.player2_score}`
              );
              lastScoreUpdateRef.current = newScores;
            }
          }

          // Immediate refresh for better responsiveness
          actions.fetchMatches(tournamentId);
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
          actions.fetchSpectatorCount(tournamentId);
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
      console.log(`[${tabId}] Cleaning up real-time subscription`);
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
  }, [tournamentId, actions, tabId]);

  // Update match score using Context API
  const updateMatchScore = useCallback(
    async (matchId: string, player1Score: number, player2Score: number) => {
      try {
        console.log(
          `[${tabId}] Updating match ${matchId}: ${player1Score} - ${player2Score}`
        );

        await actions.updateMatchScore(matchId, player1Score, player2Score);
        console.log(`[${tabId}] Score updated successfully`);
      } catch (error) {
        console.error(`[${tabId}] Error updating match score:`, error);
        alert("Failed to update score: " + (error as Error).message);
      }
    },
    [actions, tabId]
  );

  // Copy overlay URL
  const copyOverlayUrl = async () => {
    try {
      await navigator.clipboard.writeText(overlayUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Error copying URL:", error);
    }
  };

  // Webcam functions
  const startWebcam = useCallback(async () => {
    try {
      console.log("Requesting webcam permissions...");

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Webcam is not supported in this browser");
      }

      // Request permissions with specific constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: "user", // Use front camera
        },
        audio: false, // No audio for streaming control
      });

      setWebcamStream(stream);
      setWebcamEnabled(true);
      console.log("Webcam started successfully", stream);

      // Show success message
      alert("Webcam started successfully! You can now use it in the overlay.");
    } catch (error: any) {
      console.error("Error starting webcam:", error);

      let errorMessage = "Failed to start webcam. ";

      if (error.name === "NotAllowedError") {
        errorMessage +=
          "Camera permission was denied. Please:\n\n" +
          "1. Click the camera icon in your browser's address bar\n" +
          "2. Select 'Allow' for camera access\n" +
          "3. Refresh the page and try again";
      } else if (error.name === "NotFoundError") {
        errorMessage +=
          "No camera found. Please connect a camera and try again.";
      } else if (error.name === "NotSupportedError") {
        errorMessage +=
          "Camera is not supported in this browser. Try using Chrome or Firefox.";
      } else if (error.name === "NotReadableError") {
        errorMessage +=
          "Camera is already in use by another application. Please close other apps using the camera.";
      } else {
        errorMessage += "Unknown error: " + error.message;
      }

      alert(errorMessage);
    }
  }, []);

  const stopWebcam = useCallback(() => {
    if (webcamStream) {
      console.log(`[${tabId}] Stopping webcam stream`);
      webcamStream.getTracks().forEach((track) => {
        track.stop();
        console.log(`[${tabId}] Stopped track:`, track.kind);
      });
      setWebcamStream(null);
      setWebcamEnabled(false);
      console.log(`[${tabId}] Webcam stopped successfully`);
    }
  }, [webcamStream, tabId]);

  // Cleanup webcam when component unmounts or tab closes
  useEffect(() => {
    const handleBeforeUnload = () => {
      console.log(`[${tabId}] Tab closing - cleaning up webcam`);
      stopWebcam();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      console.log(`[${tabId}] Component unmounting - cleaning up webcam`);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      stopWebcam();
    };
  }, [stopWebcam, tabId]);

  // Tab visibility handling for performance optimization
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      console.log(
        `[${tabId}] Tab visibility changed: ${isVisible ? "visible" : "hidden"}`
      );

      if (isVisible) {
        // Resume updates when tab becomes visible
        actions.fetchMatches(tournamentId);
        actions.fetchSpectatorCount(tournamentId);
      }
    };

    const handlePageShow = () => {
      console.log(`[${tabId}] Page shown - resuming updates`);
      actions.fetchMatches(tournamentId);
      actions.fetchSpectatorCount(tournamentId);
    };

    const handlePageHide = () => {
      console.log(`[${tabId}] Page hidden - pausing updates`);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [tabId, actions, tournamentId]);

  // Check webcam permissions
  const checkWebcamPermissions = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setWebcamPermission("denied");
        return;
      }

      // Check if we can enumerate devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(
        (device) => device.kind === "videoinput"
      );

      if (videoDevices.length === 0) {
        setWebcamPermission("denied");
        return;
      }

      // Try to get permissions
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop()); // Stop immediately
      setWebcamPermission("granted");
    } catch (error) {
      console.log("Webcam permission check failed:", error);
      if (error instanceof Error && error.name === "NotAllowedError") {
        setWebcamPermission("denied");
      } else {
        setWebcamPermission("unknown");
      }
    }
  }, []);

  // Check permissions on component mount
  useEffect(() => {
    checkWebcamPermissions();
  }, [checkWebcamPermissions]);

  // Extract YouTube video ID from URL
  const extractYouTubeId = useCallback((url: string) => {
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  }, []);

  // Update tournament media settings
  const updateTournamentMedia = useCallback(async () => {
    if (!tournament) {
      alert("Tournament not loaded. Please refresh the page.");
      return;
    }

    setIsUpdatingMedia(true);

    try {
      console.log("Updating tournament media settings...");
      console.log("Media source:", mediaSource);
      console.log("YouTube URL:", youtubeUrl);

      const updateData: Record<string, any> = {};

      if (mediaSource === "youtube") {
        if (!youtubeUrl) {
          alert("Please enter a YouTube URL");
          return;
        }
        const videoId = extractYouTubeId(youtubeUrl);
        if (videoId) {
          updateData.youtube_video_id = videoId;
          updateData.stream_url = null; // Clear webcam setting
          console.log("YouTube video ID extracted:", videoId);
        } else {
          alert("Invalid YouTube URL. Please check the format.");
          return;
        }
      } else if (mediaSource === "webcam") {
        updateData.stream_url = "webcam";
        updateData.youtube_video_id = null; // Clear YouTube setting
        console.log("Setting webcam as media source");
      } else if (mediaSource === "file") {
        alert("File upload feature coming soon!");
        return;
      }

      if (Object.keys(updateData).length > 0) {
        console.log("Updating tournament with data:", updateData);

        const { data, error } = await supabase
          .from("tournaments")
          .update(updateData)
          .eq("id", tournamentId)
          .select()
          .single();

        if (error) {
          console.error("Supabase error:", error);
          throw error;
        }

        console.log("Tournament updated successfully:", data);
        alert("Media settings updated successfully!");

        // Refresh tournament data
        const { data: refreshedTournament } = await supabase
          .from("tournaments")
          .select("*")
          .eq("id", tournamentId)
          .single();

        if (refreshedTournament) {
          // Tournament will be updated via Context API
          actions.fetchTournament(tournamentId);
        }
      } else {
        alert("No changes to apply");
      }
    } catch (error) {
      console.error("Error updating tournament media:", error);
      alert("Failed to update media settings: " + (error as Error).message);
    } finally {
      setIsUpdatingMedia(false);
    }
  }, [tournament, mediaSource, youtubeUrl, tournamentId, extractYouTubeId]);

  // Start the current match
  const startMatch = useCallback(
    async (matchId: string) => {
      try {
        console.log(`[${tabId}] Starting match:`, matchId);

        const { error } = await supabase
          .from("matches")
          .update({ status: "in_progress" })
          .eq("id", matchId);

        if (error) {
          console.error(`[${tabId}] Error starting match:`, error);
          throw error;
        }

        console.log(`[${tabId}] Match started successfully`);

        // Refresh matches via Context API
        actions.fetchMatches(tournamentId);
      } catch (error) {
        console.error(`[${tabId}] Error starting match:`, error);
        // Try to refresh state
        actions.fetchMatches(tournamentId);
      }
    },
    [actions, tournamentId, tabId]
  );

  // Stop the current match
  const stopMatch = useCallback(
    async (matchId: string) => {
      try {
        console.log(`[${tabId}] Stopping match:`, matchId);

        const { error } = await supabase
          .from("matches")
          .update({ status: "completed" })
          .eq("id", matchId);

        if (error) {
          console.error(`[${tabId}] Error stopping match:`, error);
          throw error;
        }

        console.log(`[${tabId}] Match stopped successfully`);

        // Refresh matches via Context API
        actions.fetchMatches(tournamentId);
      } catch (error) {
        console.error(`[${tabId}] Error stopping match:`, error);
        // Try to refresh state
        actions.fetchMatches(tournamentId);
      }
    },
    [actions, tournamentId, tabId]
  );

  // Manual refresh function for when buttons get stuck
  const manualRefresh = useCallback(async () => {
    console.log(`[${tabId}] Manual refresh triggered`);
    try {
      // Refresh all data manually
      const fetchTournament = async () => {
        try {
          const { data, error } = await supabase
            .from("tournaments")
            .select("*")
            .eq("id", tournamentId)
            .single();
          if (error) throw error;
          // Tournament will be updated via Context API
          actions.fetchTournament(tournamentId);
        } catch (error) {
          console.error("Error fetching tournament:", error);
        }
      };

      await Promise.all([
        actions.fetchTournament(tournamentId),
        actions.fetchMatches(tournamentId),
        actions.fetchParticipants(tournamentId),
        actions.fetchSpectatorCount(tournamentId),
      ]);
      console.log(`[${tabId}] Manual refresh completed`);
    } catch (error) {
      console.error(`[${tabId}] Manual refresh failed:`, error);
    }
  }, [actions, tabId, tournamentId]);

  // Create a new match with selected participants
  const createMatchWithParticipants = useCallback(async () => {
    if (!selectedPlayer1 || !selectedPlayer2) {
      alert("Please select both players");
      return;
    }

    if (selectedPlayer1 === selectedPlayer2) {
      alert("Please select different players");
      return;
    }

    try {
      const player1 = participants.find((p) => p.user_id === selectedPlayer1);
      const player2 = participants.find((p) => p.user_id === selectedPlayer2);

      if (!player1 || !player2) {
        alert("Selected players not found");
        return;
      }

      // Get or create a phase for this tournament
      let phaseId = null;
      const { data: existingPhase } = await supabase
        .from("tournament_phases")
        .select("id")
        .eq("tournament_id", tournamentId)
        .eq("phase_type", "elimination")
        .single();

      if (existingPhase) {
        phaseId = existingPhase.id;
      } else {
        const { data: newPhase, error: phaseError } = await supabase
          .from("tournament_phases")
          .insert({
            tournament_id: tournamentId,
            phase_type: "elimination",
            phase_order: 1,
            status: "in_progress",
          })
          .select("id")
          .single();

        if (phaseError) throw new Error("Failed to create tournament phase");
        phaseId = newPhase.id;
      }

      const { error } = await supabase.from("matches").insert({
        tournament_id: tournamentId,
        phase_id: phaseId,
        player1_id: selectedPlayer1,
        player2_id: selectedPlayer2,
        player1_score: 0,
        player2_score: 0,
        status: "in_progress",
        round: 1,
        match_number: matches.length + 1,
        bracket_type: "upper",
      });

      if (error) throw error;

      // Reset selections
      setSelectedPlayer1("");
      setSelectedPlayer2("");
      setShowParticipantSelector(false);

      // Force refresh matches immediately
      setTimeout(() => {
        actions.fetchMatches(tournamentId);
      }, 500);
    } catch (error) {
      console.error("Error creating match:", error);
      alert("Error creating match: " + (error as Error).message);
    }
  }, [
    selectedPlayer1,
    selectedPlayer2,
    participants,
    tournamentId,
    matches.length,
    actions,
  ]);

  // Reset match scores
  const resetMatchScores = useCallback(async (matchId: string) => {
    try {
      const { error } = await supabase
        .from("matches")
        .update({
          player1_score: 0,
          player2_score: 0,
          status: "in_progress",
        })
        .eq("id", matchId);

      if (error) throw error;
    } catch (error) {
      console.error("Error resetting match scores:", error);
    }
  }, []);

  // Get match winner
  const getMatchWinner = useCallback((match: Match) => {
    if (match.status !== "completed") return null;
    if (match.player1_score > match.player2_score) {
      return match.player1?.display_name || "Player 1";
    } else if (match.player2_score > match.player1_score) {
      return match.player2?.display_name || "Player 2";
    }
    return "Tie";
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading streaming control...</div>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Tournament not found</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You don't have permission to access this streaming control.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Streaming Control</h1>
              <p className="text-muted-foreground">
                Remote control for {tournament.name} streaming overlay
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  tournament.status === "in_progress"
                    ? "destructive"
                    : "secondary"
                }
              >
                {tournament.status === "in_progress"
                  ? "LIVE"
                  : tournament.status}
              </Badge>
              <Button
                onClick={manualRefresh}
                variant="outline"
                size="sm"
                title="Refresh all data (use when buttons get stuck after switching tabs)"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                onClick={() => setShowAdvancedControls(!showAdvancedControls)}
                variant="outline"
                size="sm"
              >
                <Settings className="h-4 w-4 mr-2" />
                Advanced
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Overlay URL Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                OBS Browser Source URL
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Overlay URL for OBS</Label>
                <div className="flex gap-2">
                  <Input
                    value={overlayUrl}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button onClick={copyOverlayUrl} variant="outline" size="sm">
                    {copied ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Add this URL as a Browser Source in OBS Studio
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>OBS Settings</Label>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>• Width: 1920px</p>
                  <p>• Height: 1080px</p>
                  <p>• Refresh browser when scene becomes active: ✅</p>
                  <p>• Shutdown source when not visible: ❌</p>
                </div>
              </div>

              <Button
                onClick={() => window.open(overlayUrl, "_blank")}
                className="w-full"
                variant="outline"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Preview Overlay
              </Button>
            </CardContent>
          </Card>

          {/* Media Control */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Live Stream Control
                <Button
                  onClick={() => setShowMediaSettings(!showMediaSettings)}
                  variant="ghost"
                  size="sm"
                  className="ml-auto"
                >
                  {showMediaSettings ? "Hide" : "Show"} Settings
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Media Source Selector */}
              <div className="space-y-3">
                <Label>Media Source</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    onClick={() => setMediaSource("youtube")}
                    variant={mediaSource === "youtube" ? "default" : "outline"}
                    className="flex flex-col items-center gap-2 p-4 h-auto"
                  >
                    <Youtube className="h-5 w-5" />
                    <span className="text-xs">YouTube</span>
                  </Button>
                  <Button
                    onClick={() => setMediaSource("webcam")}
                    variant={mediaSource === "webcam" ? "default" : "outline"}
                    className="flex flex-col items-center gap-2 p-4 h-auto"
                  >
                    <Camera className="h-5 w-5" />
                    <span className="text-xs">Webcam</span>
                  </Button>
                  <Button
                    onClick={() => setMediaSource("file")}
                    variant={mediaSource === "file" ? "default" : "outline"}
                    className="flex flex-col items-center gap-2 p-4 h-auto"
                  >
                    <FileVideo className="h-5 w-5" />
                    <span className="text-xs">File</span>
                  </Button>
                </div>
              </div>

              {/* Media Settings */}
              {showMediaSettings && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 pt-4 border-t"
                >
                  {/* YouTube Settings */}
                  {mediaSource === "youtube" && (
                    <div className="space-y-3">
                      <Label>YouTube Video URL</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="https://www.youtube.com/watch?v=..."
                          value={youtubeUrl}
                          onChange={(e) => setYoutubeUrl(e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          onClick={() => {
                            if (youtubeUrl) {
                              updateTournamentMedia();
                            } else {
                              alert("Please enter a YouTube URL first");
                            }
                          }}
                          disabled={!youtubeUrl || isUpdatingMedia}
                          size="sm"
                        >
                          {isUpdatingMedia ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            "Save"
                          )}
                        </Button>
                      </div>
                      {youtubeUrl && (
                        <div className="text-xs text-muted-foreground">
                          {extractYouTubeId(youtubeUrl) ? (
                            <span className="text-green-600">
                              ✅ Valid YouTube URL
                            </span>
                          ) : (
                            <span className="text-red-600">
                              ❌ Invalid YouTube URL format
                            </span>
                          )}
                        </div>
                      )}

                      {/* YouTube Preview */}
                      {tournament?.youtube_video_id && (
                        <div className="space-y-2">
                          <Label>Current YouTube Video</Label>
                          <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                            <iframe
                              src={`https://www.youtube.com/embed/${tournament.youtube_video_id}?autoplay=0&rel=0&modestbranding=1&showinfo=0&controls=1&disablekb=1&fs=0&iv_load_policy=3&cc_load_policy=0`}
                              width="100%"
                              height="100%"
                              frameBorder="0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              title="YouTube Preview"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            This video will appear in the streaming overlay
                          </p>
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground">
                        Paste a YouTube URL to embed the video in the overlay
                      </p>
                    </div>
                  )}

                  {/* Webcam Settings */}
                  {mediaSource === "webcam" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Webcam Status</Label>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              webcamEnabled
                                ? "default"
                                : webcamPermission === "granted"
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {webcamEnabled
                              ? "Active"
                              : webcamPermission === "granted"
                              ? "Ready"
                              : "Permission Required"}
                          </Badge>
                        </div>
                      </div>

                      {/* Permission Status */}
                      {webcamPermission === "denied" && (
                        <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                          <p className="text-sm font-medium text-red-800 dark:text-red-200">
                            Camera Permission Required
                          </p>
                          <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                            Please allow camera access in your browser settings
                          </p>
                          <div className="mt-2 text-xs text-red-600 dark:text-red-300">
                            <p>
                              • Click the camera icon in your browser's address
                              bar
                            </p>
                            <p>• Select "Allow" for camera access</p>
                            <p>• Refresh the page and try again</p>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          onClick={startWebcam}
                          disabled={
                            webcamEnabled || webcamPermission === "denied"
                          }
                          size="sm"
                          className="flex-1"
                        >
                          <Camera className="h-4 w-4 mr-2" />
                          {webcamEnabled ? "Webcam Active" : "Start Webcam"}
                        </Button>
                        <Button
                          onClick={stopWebcam}
                          disabled={!webcamEnabled}
                          variant="destructive"
                          size="sm"
                          className="flex-1"
                        >
                          Stop Webcam
                        </Button>
                      </div>

                      {webcamEnabled && (
                        <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                          <p className="text-sm font-medium text-green-800 dark:text-green-200">
                            Webcam Active
                          </p>
                          <p className="text-xs text-green-600 dark:text-green-300">
                            Your webcam is now available in the overlay
                          </p>
                        </div>
                      )}

                      {webcamPermission === "granted" && !webcamEnabled && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                            Camera Ready
                          </p>
                          <p className="text-xs text-blue-600 dark:text-blue-300">
                            Click "Start Webcam" to begin streaming
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Audio Controls */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Audio Controls</Label>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => setAudioEnabled(!audioEnabled)}
                          variant={audioEnabled ? "default" : "outline"}
                          size="sm"
                        >
                          {audioEnabled ? (
                            <Volume2 className="h-4 w-4" />
                          ) : (
                            <VolumeX className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Volume</span>
                        <span className="text-sm font-mono">{volume}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={volume}
                        onChange={(e) => setVolume(Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Quick Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={updateTournamentMedia}
                  disabled={isUpdatingMedia}
                  className="flex-1"
                  variant="outline"
                >
                  {isUpdatingMedia ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Settings className="h-4 w-4 mr-2" />
                      Apply Settings
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => window.open(overlayUrl, "_blank")}
                  variant="outline"
                  size="sm"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Live Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Live Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <Users className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <p className="text-2xl font-bold">{spectatorCount}</p>
                  <p className="text-sm text-muted-foreground">Spectators</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <Target className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p className="text-2xl font-bold">{matches.length}</p>
                  <p className="text-sm text-muted-foreground">Total Matches</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Current Match:</span>
                  <Badge variant={currentMatch ? "default" : "secondary"}>
                    {currentMatch ? "Active" : "None"}
                  </Badge>
                </div>
                {currentMatch && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium">
                      {currentMatch.player1?.display_name || "Player 1"} vs{" "}
                      {currentMatch.player2?.display_name || "Player 2"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Round {currentMatch.round} • Match{" "}
                      {currentMatch.match_number}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Current Match Control */}
        {currentMatch && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Live Match Control
                <Badge variant="destructive" className="animate-pulse">
                  LIVE
                </Badge>
                <div className="ml-auto flex gap-2">
                  <Button
                    onClick={() => resetMatchScores(currentMatch.id)}
                    variant="outline"
                    size="sm"
                  >
                    Reset Scores
                  </Button>
                  <Button
                    onClick={() => setShowStopConfirm(true)}
                    variant="destructive"
                    size="sm"
                  >
                    Stop Match
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Match Participants Info */}
              <div className="mb-6 p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-3">
                  Current Match Participants:
                </h4>
                <div className="flex items-center justify-center gap-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl mb-2">
                      {currentMatch.player1?.display_name?.charAt(0) || "P"}
                    </div>
                    <p className="font-medium">
                      {currentMatch.player1?.display_name || "Player 1"}
                    </p>
                    <p className="text-sm text-muted-foreground">Player 1</p>
                  </div>
                  <div className="text-2xl font-bold">VS</div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-xl mb-2">
                      {currentMatch.player2?.display_name?.charAt(0) || "P"}
                    </div>
                    <p className="font-medium">
                      {currentMatch.player2?.display_name || "Player 2"}
                    </p>
                    <p className="text-sm text-muted-foreground">Player 2</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Player 1 */}
                <div className="text-center p-6 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <h3 className="text-xl font-bold mb-4">
                    {currentMatch.player1?.display_name || "Player 1"}
                  </h3>
                  <motion.div
                    key={currentMatch.player1_score}
                    initial={{ scale: 1.2, color: "#fbbf24" }}
                    animate={{ scale: 1, color: "#1e40af" }}
                    className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-4"
                  >
                    {currentMatch.player1_score}
                  </motion.div>
                  <div className="flex gap-2 justify-center">
                    <Button
                      onClick={() =>
                        updateMatchScore(
                          currentMatch.id,
                          currentMatch.player1_score + 1,
                          currentMatch.player2_score
                        )
                      }
                      variant="outline"
                      size="sm"
                    >
                      +1
                    </Button>
                    <Button
                      onClick={() =>
                        updateMatchScore(
                          currentMatch.id,
                          currentMatch.player1_score - 1,
                          currentMatch.player2_score
                        )
                      }
                      variant="outline"
                      size="sm"
                    >
                      -1
                    </Button>
                  </div>
                </div>

                {/* Player 2 */}
                <div className="text-center p-6 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-800">
                  <h3 className="text-xl font-bold mb-4">
                    {currentMatch.player2?.display_name || "Player 2"}
                  </h3>
                  <motion.div
                    key={currentMatch.player2_score}
                    initial={{ scale: 1.2, color: "#fbbf24" }}
                    animate={{ scale: 1, color: "#dc2626" }}
                    className="text-4xl font-bold text-red-600 dark:text-red-400 mb-4"
                  >
                    {currentMatch.player2_score}
                  </motion.div>
                  <div className="flex gap-2 justify-center">
                    <Button
                      onClick={() =>
                        updateMatchScore(
                          currentMatch.id,
                          currentMatch.player1_score,
                          currentMatch.player2_score + 1
                        )
                      }
                      variant="outline"
                      size="sm"
                    >
                      +1
                    </Button>
                    <Button
                      onClick={() =>
                        updateMatchScore(
                          currentMatch.id,
                          currentMatch.player1_score,
                          currentMatch.player2_score - 1
                        )
                      }
                      variant="outline"
                      size="sm"
                    >
                      -1
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Participant Selector */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Quick Match Creator
              <Button
                onClick={() =>
                  setShowParticipantSelector(!showParticipantSelector)
                }
                variant="ghost"
                size="sm"
                className="ml-auto"
              >
                {showParticipantSelector ? "Hide" : "Show"} Selector
              </Button>
            </CardTitle>
          </CardHeader>
          {showParticipantSelector && (
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Player 1 Selection */}
                <div className="space-y-2">
                  <Label>Player 1</Label>
                  <Select
                    value={selectedPlayer1}
                    onValueChange={setSelectedPlayer1}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Player 1" />
                    </SelectTrigger>
                    <SelectContent>
                      {participants.map((participant) => (
                        <SelectItem
                          key={participant.user_id}
                          value={participant.user_id}
                        >
                          {participant.user.display_name} (Seed{" "}
                          {participant.seed})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Player 2 Selection */}
                <div className="space-y-2">
                  <Label>Player 2</Label>
                  <Select
                    value={selectedPlayer2}
                    onValueChange={setSelectedPlayer2}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Player 2" />
                    </SelectTrigger>
                    <SelectContent>
                      {participants.map((participant) => (
                        <SelectItem
                          key={participant.user_id}
                          value={participant.user_id}
                        >
                          {participant.user.display_name} (Seed{" "}
                          {participant.seed})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={createMatchWithParticipants}
                  disabled={!selectedPlayer1 || !selectedPlayer2}
                  className="flex-1"
                >
                  Create & Start Match
                </Button>
                <Button
                  onClick={() => {
                    setSelectedPlayer1("");
                    setSelectedPlayer2("");
                  }}
                  variant="outline"
                >
                  Clear Selection
                </Button>
              </div>

              {/* Selected Players Preview */}
              {selectedPlayer1 && selectedPlayer2 && (
                <div className="p-3 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Match Preview:</h4>
                  <div className="flex items-center justify-center gap-4">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                        {participants
                          .find((p) => p.user_id === selectedPlayer1)
                          ?.user.display_name?.charAt(0) || "P"}
                      </div>
                      <p className="text-sm font-medium mt-1">
                        {participants.find((p) => p.user_id === selectedPlayer1)
                          ?.user.display_name || "Player 1"}
                      </p>
                    </div>
                    <div className="text-2xl font-bold">VS</div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white font-bold">
                        {participants
                          .find((p) => p.user_id === selectedPlayer2)
                          ?.user.display_name?.charAt(0) || "P"}
                      </div>
                      <p className="text-sm font-medium mt-1">
                        {participants.find((p) => p.user_id === selectedPlayer2)
                          ?.user.display_name || "Player 2"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Match History */}
        {matches.filter((match) => match.status === "completed").length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Match History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {matches
                  .filter((match) => match.status === "completed")
                  .slice(0, 5)
                  .map((match) => (
                    <div
                      key={match.id}
                      className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">
                            {match.player1?.display_name || "Player 1"} vs{" "}
                            {match.player2?.display_name || "Player 2"}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            Round {match.round} • Match {match.match_number}
                          </p>
                          <p className="text-sm font-medium">
                            Final Score: {match.player1_score} -{" "}
                            {match.player2_score}
                          </p>
                          <p className="text-sm text-green-600 dark:text-green-400">
                            Winner: {getMatchWinner(match)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="default">Completed</Badge>
                          <Button
                            onClick={() => resetMatchScores(match.id)}
                            variant="outline"
                            size="sm"
                          >
                            Reset & Restart
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Debug Section */}
        <MatchStatusDebug tournamentId={tournamentId} />

        {/* Match List */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Tournament Matches
              <Button
                onClick={() => actions.fetchMatches(tournamentId)}
                variant="ghost"
                size="sm"
                className="ml-auto"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {matches.map((match) => (
                <div
                  key={match.id}
                  className={`p-4 rounded-lg border ${
                    match.status === "in_progress"
                      ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                      : match.status === "completed"
                      ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                      : "bg-muted"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">
                        {match.player1?.display_name || "Player 1"} vs{" "}
                        {match.player2?.display_name || "Player 2"}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Round {match.round} • Match {match.match_number}
                      </p>
                      {match.status !== "pending" && (
                        <p className="text-sm font-medium">
                          Score: {match.player1_score} - {match.player2_score}
                        </p>
                      )}
                      {match.status === "completed" && (
                        <p className="text-sm text-green-600 dark:text-green-400">
                          Winner: {getMatchWinner(match)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          match.status === "in_progress"
                            ? "destructive"
                            : match.status === "completed"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {match.status}
                      </Badge>
                      {match.status === "pending" && (
                        <Button onClick={() => startMatch(match.id)} size="sm">
                          Start Match
                        </Button>
                      )}
                      {match.status === "completed" && (
                        <Button
                          onClick={() => resetMatchScores(match.id)}
                          variant="outline"
                          size="sm"
                        >
                          Reset
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Stop Match Confirmation Dialog */}
        <Dialog open={showStopConfirm} onOpenChange={setShowStopConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Stop Current Match?</DialogTitle>
              <DialogDescription>
                This will end the current match and mark it as completed. The
                overlay will no longer show this match.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowStopConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  stopMatch(currentMatch!.id);
                  setShowStopConfirm(false);
                }}
              >
                Stop Match
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
