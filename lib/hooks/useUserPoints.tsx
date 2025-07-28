"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";
import { UserPoints, PointTransaction, PointPackage } from "@/lib/types";

export function useUserPoints() {
  const { user } = useAuth();
  const [userPoints, setUserPoints] = useState<UserPoints | null>(null);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [packages, setPackages] = useState<PointPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user points
  const fetchUserPoints = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("user_points")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error("Error fetching user points:", error);
        setError(error.message);
        return;
      }

      setUserPoints(data);
    } catch (err) {
      console.error("Error fetching user points:", err);
      setError("Failed to fetch user points");
    }
  };

  // Fetch recent transactions
  const fetchTransactions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("point_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("Error fetching transactions:", error);
        return;
      }

      setTransactions(data || []);
    } catch (err) {
      console.error("Error fetching transactions:", err);
    }
  };

  // Fetch point packages
  const fetchPackages = async () => {
    try {
      const { data, error } = await supabase
        .from("point_packages")
        .select("*")
        .eq("is_active", true)
        .order("price_eur", { ascending: true });

      if (error) {
        console.error("Error fetching packages:", error);
        return;
      }

      setPackages(data || []);
    } catch (err) {
      console.error("Error fetching packages:", err);
    }
  };

  // Purchase betting points
  const purchaseBettingPoints = async (packageId: string) => {
    if (!user) return { success: false, error: "User not authenticated" };

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

      // Add betting points using RPC function
      const { error: addError } = await supabase.rpc("add_betting_points", {
        user_uuid: user.id,
        amount: packageData.betting_points + packageData.bonus_points,
        description: `Purchased ${packageData.name}`,
        transaction_type: "purchase",
      });

      if (addError) {
        console.error("Error adding betting points:", addError);
        return { success: false, error: addError.message };
      }

      // Refresh user points
      await fetchUserPoints();
      await fetchTransactions();

      return { success: true };
    } catch (err) {
      console.error("Error purchasing betting points:", err);
      return { success: false, error: "Purchase failed" };
    }
  };

  // Place a bet
  const placeBet = async (
    amount: number,
    description: string,
    tournamentId?: string,
    matchId?: string
  ) => {
    if (!user) return { success: false, error: "User not authenticated" };

    try {
      const { data, error } = await supabase.rpc("spend_betting_points", {
        user_uuid: user.id,
        amount: amount,
        description: description,
        tournament_id: tournamentId,
        match_id: matchId,
      });

      if (error) {
        console.error("Error placing bet:", error);
        return { success: false, error: error.message };
      }

      if (!data) {
        return { success: false, error: "Insufficient betting points" };
      }

      // Refresh user points
      await fetchUserPoints();
      await fetchTransactions();

      return { success: true };
    } catch (err) {
      console.error("Error placing bet:", err);
      return { success: false, error: "Bet failed" };
    }
  };

  // Win stream points
  const winStreamPoints = async (amount: number, description: string) => {
    if (!user) return { success: false, error: "User not authenticated" };

    try {
      const { error } = await supabase.rpc("add_stream_points", {
        user_uuid: user.id,
        amount: amount,
        description: description,
        transaction_type: "win",
      });

      if (error) {
        console.error("Error adding stream points:", error);
        return { success: false, error: error.message };
      }

      // Refresh user points
      await fetchUserPoints();
      await fetchTransactions();

      return { success: true };
    } catch (err) {
      console.error("Error adding stream points:", err);
      return { success: false, error: "Failed to add stream points" };
    }
  };

  // Spend stream points (for prizes)
  const spendStreamPoints = async (amount: number, description: string) => {
    if (!user) return { success: false, error: "User not authenticated" };

    try {
      const { data, error } = await supabase.rpc("spend_stream_points", {
        user_uuid: user.id,
        amount: amount,
        description: description,
      });

      if (error) {
        console.error("Error spending stream points:", error);
        return { success: false, error: error.message };
      }

      if (!data) {
        return { success: false, error: "Insufficient stream points" };
      }

      // Refresh user points
      await fetchUserPoints();
      await fetchTransactions();

      return { success: true };
    } catch (err) {
      console.error("Error spending stream points:", err);
      return { success: false, error: "Failed to spend stream points" };
    }
  };

  // Initialize data
  useEffect(() => {
    if (user) {
      setLoading(true);
      Promise.all([
        fetchUserPoints(),
        fetchTransactions(),
        fetchPackages(),
      ]).finally(() => setLoading(false));
    } else {
      setUserPoints(null);
      setTransactions([]);
      setLoading(false);
    }
  }, [user]);

  return {
    userPoints,
    transactions,
    packages,
    loading,
    error,
    purchaseBettingPoints,
    placeBet,
    winStreamPoints,
    spendStreamPoints,
    refresh: () => {
      if (user) {
        fetchUserPoints();
        fetchTransactions();
      }
    },
  };
}
