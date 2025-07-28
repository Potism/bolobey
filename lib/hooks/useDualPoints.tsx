"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/hooks/useAuth";

interface UserPoints {
  betting_points: number;
  stream_points: number;
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

interface UseDualPointsReturn {
  // User points data
  userPoints: UserPoints | null;
  loading: boolean;
  error: string | null;

  // Point packages
  packages: PointPackage[];
  packagesLoading: boolean;

  // Transactions
  transactions: PointTransaction[];
  transactionsLoading: boolean;

  // Actions
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

  // Utilities
  refetchUserPoints: () => Promise<void>;
  refetchPackages: () => Promise<void>;
  refetchTransactions: () => Promise<void>;
  forceRefresh: () => Promise<void>;
}

export function useDualPoints(): UseDualPointsReturn {
  const { user } = useAuth();
  const [userPoints, setUserPoints] = useState<UserPoints | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [packages, setPackages] = useState<PointPackage[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(true);

  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);

  // Fetch user points
  const fetchUserPoints = useCallback(async () => {
    if (!user) {
      setUserPoints(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase.rpc(
        "get_user_points_balance",
        { user_uuid: user.id }
      );

      if (fetchError) {
        console.error("Error fetching user points:", fetchError);
        setError("Failed to fetch user points");
        return;
      }

      // Handle both array and single object responses
      const pointsData = Array.isArray(data) ? data[0] : data;

      if (pointsData) {
        setUserPoints({
          betting_points: pointsData.betting_points || 0,
          stream_points: pointsData.stream_points || 0,
        });
      } else {
        setUserPoints({ betting_points: 0, stream_points: 0 });
      }
    } catch (err) {
      console.error("Error fetching user points:", err);
      setError("Failed to fetch user points");
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch point packages
  const fetchPackages = useCallback(async () => {
    try {
      setPackagesLoading(true);
      const { data, error: fetchError } = await supabase
        .from("point_packages")
        .select("*")
        .eq("is_active", true)
        .order("price_eur", { ascending: true });

      if (fetchError) {
        console.error("Error fetching packages:", fetchError);
        return;
      }

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
    async (
      packageId: number
    ): Promise<{ success: boolean; error?: string }> => {
      if (!user) {
        return { success: false, error: "User not authenticated" };
      }

      try {
        // Get package details
        const { data: packageData, error: packageError } = await supabase
          .from("point_packages")
          .select("*")
          .eq("id", packageId)
          .single();

        if (packageError || !packageData) {
          return { success: false, error: "Package not found" };
        }

        // Calculate total points (base + bonus)
        const totalPoints =
          packageData.betting_points + packageData.bonus_points;

        // Add betting points using RPC function
        const { error: addError } = await supabase.rpc("add_betting_points", {
          user_uuid: user.id,
          points_amount: totalPoints,
          transaction_description: `Purchased ${packageData.name} for €${packageData.price_eur}`,
        });

        if (addError) {
          console.error("Error adding betting points:", addError);
          return { success: false, error: "Failed to add points" };
        }

        // Refresh user points
        await fetchUserPoints();
        await fetchTransactions();

        return { success: true };
      } catch (error) {
        console.error("Error purchasing points:", error);
        return { success: false, error: "Purchase failed" };
      }
    },
    [user, fetchUserPoints, fetchTransactions]
  );

  // Place bet (spend betting points)
  const placeBet = useCallback(
    async (
      amount: number,
      matchId: string,
      description?: string
    ): Promise<{ success: boolean; error?: string }> => {
      if (!user) {
        return { success: false, error: "User not authenticated" };
      }

      try {
        const { error } = await supabase.rpc("spend_betting_points", {
          user_uuid: user.id,
          points_amount: amount,
          reference_id: matchId,
          reference_type: "match",
          transaction_description: description || `Bet placed on match`,
        });

        if (error) {
          console.error("Error placing bet:", error);
          return { success: false, error: "Failed to place bet" };
        }

        // Refresh user points
        await fetchUserPoints();
        await fetchTransactions();

        return { success: true };
      } catch (error) {
        console.error("Error placing bet:", error);
        return { success: false, error: "Bet failed" };
      }
    },
    [user, fetchUserPoints, fetchTransactions]
  );

  // Win stream points
  const winStreamPoints = useCallback(
    async (
      amount: number,
      matchId: string,
      description?: string
    ): Promise<{ success: boolean; error?: string }> => {
      if (!user) {
        return { success: false, error: "User not authenticated" };
      }

      try {
        const { error } = await supabase.rpc("add_stream_points", {
          user_uuid: user.id,
          points_amount: amount,
          reference_id: matchId,
          reference_type: "match",
          transaction_description: description || `Won ${amount} stream points`,
        });

        if (error) {
          console.error("Error adding stream points:", error);
          return { success: false, error: "Failed to add stream points" };
        }

        // Refresh user points
        await fetchUserPoints();
        await fetchTransactions();

        return { success: true };
      } catch (error) {
        console.error("Error adding stream points:", error);
        return { success: false, error: "Failed to add stream points" };
      }
    },
    [user, fetchUserPoints, fetchTransactions]
  );

  // Redeem stream points
  const redeemStreamPoints = useCallback(
    async (
      amount: number,
      prizeId: string,
      description?: string
    ): Promise<{ success: boolean; error?: string }> => {
      if (!user) {
        return { success: false, error: "User not authenticated" };
      }

      try {
        const { error } = await supabase.rpc("spend_stream_points", {
          user_uuid: user.id,
          points_amount: amount,
          reference_id: prizeId,
          reference_type: "prize",
          transaction_description:
            description || `Redeemed prize for ${amount} stream points`,
        });

        if (error) {
          console.error("Error redeeming stream points:", error);
          return { success: false, error: "Failed to redeem points" };
        }

        // Refresh user points
        await fetchUserPoints();
        await fetchTransactions();

        return { success: true };
      } catch (error) {
        console.error("Error redeeming stream points:", error);
        return { success: false, error: "Failed to redeem points" };
      }
    },
    [user, fetchUserPoints, fetchTransactions]
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

  // Manual refresh function for immediate updates
  const forceRefresh = useCallback(async () => {
    console.log("Force refreshing user points...");
    await fetchUserPoints();
    await fetchTransactions();
  }, [fetchUserPoints, fetchTransactions]);

  // Initial data fetch
  useEffect(() => {
    fetchUserPoints();
    fetchPackages();
    fetchTransactions();
  }, [fetchUserPoints, fetchPackages, fetchTransactions]);

  return {
    // Data
    userPoints,
    loading,
    error,

    // Point packages
    packages,
    packagesLoading,

    // Transactions
    transactions,
    transactionsLoading,

    // Actions
    purchaseBettingPoints,
    placeBet,
    winStreamPoints,
    redeemStreamPoints,

    // Utilities
    refetchUserPoints,
    refetchPackages,
    refetchTransactions,
    forceRefresh,
  };
}
