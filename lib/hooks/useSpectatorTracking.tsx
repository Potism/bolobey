"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";

interface SpectatorCount {
  active_spectators: number;
  authenticated_spectators: number;
  anonymous_spectators: number;
}

export function useSpectatorTracking(tournamentId: string) {
  const { user } = useAuth();
  const [spectatorCount, setSpectatorCount] = useState<SpectatorCount>({
    active_spectators: 0,
    authenticated_spectators: 0,
    anonymous_spectators: 0,
  });
  const [isTracking, setIsTracking] = useState(false);
  const sessionIdRef = useRef<string>("");
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Generate a unique session ID for this browser session
  useEffect(() => {
    if (!sessionIdRef.current) {
      sessionIdRef.current = `session_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
    }
  }, []);

  // Add spectator to tournament
  const addSpectator = useCallback(async () => {
    if (!tournamentId || isTracking) return;

    console.log("🔍 Attempting to add spectator:", {
      tournamentId,
      userId: user?.id,
      sessionId: sessionIdRef.current,
      isTracking,
    });

    try {
      const { data, error } = await supabase.rpc("add_tournament_spectator", {
        tournament_uuid: tournamentId,
        session_id_param: sessionIdRef.current,
        user_uuid: user?.id || null,
        user_agent_param: navigator.userAgent,
        ip_address_param: null, // We'll get this from the server if needed
      });

      if (error) {
        console.error("❌ Error adding spectator:", error);
        return;
      }

      console.log("✅ Successfully added spectator:", data);
      setIsTracking(true);
      console.log("Added as spectator to tournament:", tournamentId);
    } catch (error) {
      console.error("❌ Exception adding spectator:", error);
    }
  }, [tournamentId, user?.id, isTracking]);

  // Remove spectator from tournament
  const removeSpectator = useCallback(async () => {
    if (!tournamentId || !isTracking) return;

    try {
      const { error } = await supabase.rpc("remove_tournament_spectator", {
        tournament_uuid: tournamentId,
        session_id_param: sessionIdRef.current,
        user_uuid: user?.id || null,
      });

      if (error) {
        console.error("Error removing spectator:", error);
        return;
      }

      setIsTracking(false);
      console.log("Removed as spectator from tournament:", tournamentId);
    } catch (error) {
      console.error("Error removing spectator:", error);
    }
  }, [tournamentId, user?.id, isTracking]);

  // Update spectator's last seen timestamp (heartbeat)
  const updateHeartbeat = useCallback(async () => {
    if (!tournamentId || !isTracking) return;

    try {
      const { error } = await supabase.rpc("add_tournament_spectator", {
        tournament_uuid: tournamentId,
        session_id_param: sessionIdRef.current,
        user_uuid: user?.id || null,
        user_agent_param: navigator.userAgent,
        ip_address_param: null,
      });

      if (error) {
        console.error("Error updating spectator heartbeat:", error);
      }
    } catch (error) {
      console.error("Error updating spectator heartbeat:", error);
    }
  }, [tournamentId, user?.id, isTracking]);

  // Fetch current spectator count
  const fetchSpectatorCount = useCallback(async () => {
    if (!tournamentId) return;

    console.log("🔍 Fetching spectator count for tournament:", tournamentId);

    try {
      const { data, error } = await supabase
        .from("tournament_spectator_counts")
        .select("*")
        .eq("tournament_id", tournamentId)
        .single();

      if (error) {
        if (error.code !== "PGRST116") {
          // No rows returned
          console.error("❌ Error fetching spectator count:", error);
        } else {
          console.log(
            "ℹ️ No spectator data found for tournament:",
            tournamentId
          );
        }
        return;
      }

      console.log("✅ Spectator count data:", data);
      setSpectatorCount({
        active_spectators: data?.active_spectators || 0,
        authenticated_spectators: data?.authenticated_spectators || 0,
        anonymous_spectators: data?.anonymous_spectators || 0,
      });
    } catch (error) {
      console.error("❌ Exception fetching spectator count:", error);
    }
  }, [tournamentId]);

  // Subscribe to real-time spectator count updates
  useEffect(() => {
    if (!tournamentId) return;

    const channel = supabase
      .channel(`tournament_spectators_${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournament_spectators",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => {
          // Refetch count when spectator data changes
          fetchSpectatorCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId, fetchSpectatorCount]);

  // Initialize spectator tracking
  useEffect(() => {
    if (!tournamentId) return;

    // Add spectator when component mounts
    addSpectator();

    // Set up heartbeat interval (update every 2 minutes)
    heartbeatIntervalRef.current = setInterval(updateHeartbeat, 2 * 60 * 1000);

    // Set up cleanup interval (cleanup old records every 10 minutes)
    cleanupIntervalRef.current = setInterval(async () => {
      try {
        await supabase.rpc("cleanup_old_spectators");
      } catch (error) {
        console.error("Error cleaning up old spectators:", error);
      }
    }, 10 * 60 * 1000);

    // Initial fetch
    fetchSpectatorCount();

    // Cleanup on unmount
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
      }
      removeSpectator();
    };
  }, [
    tournamentId,
    addSpectator,
    updateHeartbeat,
    fetchSpectatorCount,
    removeSpectator,
  ]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, update heartbeat less frequently
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
        heartbeatIntervalRef.current = setInterval(
          updateHeartbeat,
          5 * 60 * 1000
        ); // 5 minutes
      } else {
        // Page is visible, update heartbeat more frequently
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
        heartbeatIntervalRef.current = setInterval(
          updateHeartbeat,
          2 * 60 * 1000
        ); // 2 minutes
        // Immediate heartbeat when page becomes visible
        updateHeartbeat();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [updateHeartbeat]);

  // Handle beforeunload event
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Try to remove spectator when page is unloaded
      // Note: This might not always work due to browser limitations
      removeSpectator();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [removeSpectator]);

  return {
    spectatorCount,
    isTracking,
    addSpectator,
    removeSpectator,
    fetchSpectatorCount,
  };
}
