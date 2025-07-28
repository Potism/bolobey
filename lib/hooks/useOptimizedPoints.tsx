"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";

interface UserPoints {
  betting_points: number;
  stream_points: number;
  total_betting_points_earned: number;
  total_stream_points_earned: number;
  total_points_spent: number;
}

interface PointPackage {
  id: number;
  name: string;
  betting_points: number;
  price_eur: number;
  bonus_points: number;
  is_featured: boolean;
  is_active: boolean;
}

interface PointTransaction {
  id: string;
  transaction_type: string;
  points_amount: number;
  points_type: "betting" | "stream";
  balance_before: number;
  balance_after: number;
  reference_id?: string;
  reference_type?: string;
  description?: string;
  created_at: string;
}

interface UseOptimizedPointsReturn {
  userPoints: UserPoints | null;
  loading: boolean;
  error: string | null;
  packages: PointPackage[];
  packagesLoading: boolean;
  transactions: PointTransaction[];
  transactionsLoading: boolean;
  purchaseBettingPoints: (
    packageId: number
  ) => Promise<{ success: boolean; error?: string }>;
  placeBet: (
    amount: number,
    matchId: string,
    description?: string
  ) => Promise<{ success: boolean; error?: string }>;
  winStreamPoints: (
    amount: number,
    matchId: string,
    description?: string
  ) => Promise<{ success: boolean; error?: string }>;
  redeemStreamPoints: (
    amount: number,
    prizeId: string,
    description?: string
  ) => Promise<{ success: boolean; error?: string }>;
  refetchUserPoints: () => Promise<void>;
  refetchPackages: () => Promise<void>;
  refetchTransactions: () => Promise<void>;
  forceRefresh: () => Promise<void>;
}

export function useOptimizedPoints(): UseOptimizedPointsReturn {
  const { user } = useAuth();
  const [userPoints, setUserPoints] = useState<UserPoints | null>(null);
  const [packages, setPackages] = useState<PointPackage[]>([]);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simple fetch user points
  const fetchUserPoints = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase.rpc(
        "get_user_points_balance",
        {
          user_uuid: user.id,
        }
      );

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        const pointsData = Array.isArray(data) ? data[0] : data;
        setUserPoints(pointsData);
      } else {
        setUserPoints({
          betting_points: 0,
          stream_points: 0,
          total_betting_points_earned: 0,
          total_stream_points_earned: 0,
          total_points_spent: 0,
        });
      }
    } catch (err) {
      console.error("Error fetching user points:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch points");
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch packages
  const fetchPackages = useCallback(async () => {
    try {
      setPackagesLoading(true);
      const { data, error: fetchError } = await supabase
        .from("point_packages")
        .select("*")
        .eq("is_active", true)
        .order("price_eur", { ascending: true });

      if (fetchError) throw fetchError;
      setPackages(data || []);
    } catch (err) {
      console.error("Error fetching packages:", err);
    } finally {
      setPackagesLoading(false);
    }
  }, []);

  // Fetch transactions
  const fetchTransactions = useCallback(async () => {
    if (!user) return;

    try {
      setTransactionsLoading(true);
      const { data, error: fetchError } = await supabase
        .from("point_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (fetchError) throw fetchError;
      setTransactions(data || []);
    } catch (err) {
      console.error("Error fetching transactions:", err);
    } finally {
      setTransactionsLoading(false);
    }
  }, [user]);

  // Purchase betting points
  const purchaseBettingPoints = useCallback(
    async (packageId: number) => {
      if (!user) return { success: false, error: "User not authenticated" };

      try {
        const { error } = await supabase.rpc("purchase_betting_points", {
          user_uuid: user.id,
          package_id: packageId,
        });

        if (error) throw error;

        // Refresh points after purchase
        await fetchUserPoints();
        return { success: true };
      } catch (err) {
        console.error("Error purchasing points:", err);
        return {
          success: false,
          error: err instanceof Error ? err.message : "Purchase failed",
        };
      }
    },
    [user, fetchUserPoints]
  );

  // Place bet
  const placeBet = useCallback(
    async (amount: number, matchId: string, description?: string) => {
      if (!user) return { success: false, error: "User not authenticated" };

      try {
        const { error } = await supabase.rpc("place_bet", {
          user_uuid: user.id,
          match_id: matchId,
          bet_amount: amount,
          bet_description: description || "Match bet",
        });

        if (error) throw error;

        // Refresh points after bet
        await fetchUserPoints();
        return { success: true };
      } catch (err) {
        console.error("Error placing bet:", err);
        return {
          success: false,
          error: err instanceof Error ? err.message : "Bet failed",
        };
      }
    },
    [user, fetchUserPoints]
  );

  // Win stream points
  const winStreamPoints = useCallback(
    async (amount: number, matchId: string, description?: string) => {
      if (!user) return { success: false, error: "User not authenticated" };

      try {
        const { error } = await supabase.rpc("award_stream_points", {
          user_uuid: user.id,
          points_amount: amount,
          reference_id: matchId,
          reference_type: "match_win",
          description: description || "Match win",
        });

        if (error) throw error;

        // Refresh points after win
        await fetchUserPoints();
        return { success: true };
      } catch (err) {
        console.error("Error awarding stream points:", err);
        return {
          success: false,
          error: err instanceof Error ? err.message : "Award failed",
        };
      }
    },
    [user, fetchUserPoints]
  );

  // Redeem stream points
  const redeemStreamPoints = useCallback(
    async (amount: number, prizeId: string, description?: string) => {
      if (!user) return { success: false, error: "User not authenticated" };

      try {
        const { error } = await supabase.rpc("redeem_stream_points", {
          user_uuid: user.id,
          points_amount: amount,
          prize_id: prizeId,
          description: description || "Prize redemption",
        });

        if (error) throw error;

        // Refresh points after redemption
        await fetchUserPoints();
        return { success: true };
      } catch (err) {
        console.error("Error redeeming stream points:", err);
        return {
          success: false,
          error: err instanceof Error ? err.message : "Redemption failed",
        };
      }
    },
    [user, fetchUserPoints]
  );

  // Refetch functions
  const refetchUserPoints = useCallback(
    () => fetchUserPoints(),
    [fetchUserPoints]
  );
  const refetchPackages = useCallback(() => fetchPackages(), [fetchPackages]);
  const refetchTransactions = useCallback(
    () => fetchTransactions(),
    [fetchTransactions]
  );
  const forceRefresh = useCallback(() => fetchUserPoints(), [fetchUserPoints]);

  // Initial load
  useEffect(() => {
    if (user) {
      fetchUserPoints();
      fetchPackages();
      fetchTransactions();
    }
  }, [user, fetchUserPoints, fetchPackages, fetchTransactions]);

  return {
    userPoints,
    loading,
    error,
    packages,
    packagesLoading,
    transactions,
    transactionsLoading,
    purchaseBettingPoints,
    placeBet,
    winStreamPoints,
    redeemStreamPoints,
    refetchUserPoints,
    refetchPackages,
    refetchTransactions,
    forceRefresh,
  };
}
