"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Gift,
  Trophy,
  Star,
  ShoppingCart,
  Coins,
  Package,
  Award,
  Target,
  Filter,
  Search,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/hooks/useAuth";

interface Prize {
  id: string;
  name: string;
  description: string;
  points_cost: number;
  category: string;
  image_url?: string;
  stock_quantity: number;
  is_featured: boolean;
  created_at: string;
}

interface UserRedemption {
  id: string;
  user_id: string;
  prize_id: string;
  points_spent: number;
  status: "pending" | "approved" | "shipped" | "delivered" | "cancelled";
  created_at: string;
  prize: Prize;
}

export function PrizesCatalog() {
  const { user } = useAuth();
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [userRedemptions, setUserRedemptions] = useState<UserRedemption[]>([]);
  const [userPoints, setUserPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("featured");

  // Redemption states
  const [selectedPrize, setSelectedPrize] = useState<Prize | null>(null);
  const [showRedemptionDialog, setShowRedemptionDialog] = useState(false);
  const [redeeming, setRedeeming] = useState(false);

  // Fetch prizes
  const fetchPrizes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("prizes")
        .select("*")
        .order("is_featured", { ascending: false })
        .order("points_cost", { ascending: true });

      if (error) {
        console.error("Error fetching prizes:", error);
        setError("Failed to load prizes");
        return;
      }

      setPrizes(data || []);
    } catch (error) {
      console.error("Error fetching prizes:", error);
      setError("Failed to load prizes");
    }
  }, []);

  // Fetch user points
  const fetchUserPoints = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc("get_user_points_balance", {
        user_uuid: user.id,
      });

      if (error) {
        console.error("Error fetching user points:", error);
        return;
      }

      setUserPoints(data || 0);
    } catch (error) {
      console.error("Error fetching user points:", error);
    }
  }, [user]);

  // Fetch user redemptions
  const fetchUserRedemptions = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("prize_redemptions")
        .select(
          `
          *,
          prize:prizes(*)
        `
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching redemptions:", error);
        return;
      }

      setUserRedemptions(data || []);
    } catch (error) {
      console.error("Error fetching redemptions:", error);
    }
  }, [user]);

  // Redeem prize
  const redeemPrize = useCallback(async () => {
    if (!user || !selectedPrize) return;

    setRedeeming(true);
    try {
      // Check if user has shipping address
      if (!user.shipping_address) {
        setError(
          "Please add your shipping address in your profile before redeeming prizes"
        );
        return;
      }

      // Check if user has enough points
      if (userPoints < selectedPrize.points_cost) {
        setError("Insufficient points");
        return;
      }

      // Check if prize is in stock
      if (selectedPrize.stock_quantity <= 0) {
        setError("Prize is out of stock");
        return;
      }

      // Create redemption record
      const { error: redemptionError } = await supabase
        .from("prize_redemptions")
        .insert({
          user_id: user.id,
          prize_id: selectedPrize.id,
          points_spent: selectedPrize.points_cost,
          status: "pending",
        });

      if (redemptionError) {
        setError(redemptionError.message);
        return;
      }

      // Deduct points from user
      const { error: pointsError } = await supabase
        .from("stream_points")
        .insert({
          user_id: user.id,
          points: -selectedPrize.points_cost,
          transaction_type: "prize_redemption",
          description: `Redeemed ${selectedPrize.name}`,
          reference_id: selectedPrize.id,
          reference_type: "prize",
        });

      if (pointsError) {
        setError(pointsError.message);
        return;
      }

      // Update prize stock
      const { error: stockError } = await supabase
        .from("prizes")
        .update({ stock_quantity: selectedPrize.stock_quantity - 1 })
        .eq("id", selectedPrize.id);

      if (stockError) {
        console.error("Error updating stock:", stockError);
      }

      // Refresh data
      await Promise.all([
        fetchPrizes(),
        fetchUserPoints(),
        fetchUserRedemptions(),
      ]);

      setShowRedemptionDialog(false);
      setSelectedPrize(null);
      setError(null);
    } catch (error) {
      setError("Failed to redeem prize");
    } finally {
      setRedeeming(false);
    }
  }, [
    user,
    selectedPrize,
    userPoints,
    fetchPrizes,
    fetchUserPoints,
    fetchUserRedemptions,
  ]);

  useEffect(() => {
    Promise.all([
      fetchPrizes(),
      fetchUserPoints(),
      fetchUserRedemptions(),
    ]).finally(() => setLoading(false));
  }, [fetchPrizes, fetchUserPoints, fetchUserRedemptions]);

  // Filter and sort prizes
  const filteredPrizes = prizes
    .filter((prize) => {
      const matchesCategory =
        categoryFilter === "all" || prize.category === categoryFilter;
      const matchesSearch =
        prize.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prize.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "points_low":
          return a.points_cost - b.points_cost;
        case "points_high":
          return b.points_cost - a.points_cost;
        case "name":
          return a.name.localeCompare(b.name);
        case "featured":
        default:
          return (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0);
      }
    });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500";
      case "approved":
        return "bg-blue-500";
      case "shipped":
        return "bg-purple-500";
      case "delivered":
        return "bg-green-500";
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Prizes Catalog</h1>
          <p className="text-muted-foreground">
            Redeem your stream points for amazing prizes!
          </p>
        </div>

        {user && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <Coins className="h-5 w-5 text-yellow-500" />
            <span className="font-bold text-lg">{userPoints}</span>
            <span className="text-muted-foreground">points</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Label htmlFor="search">Search Prizes</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Search prizes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="electronics">Electronics</SelectItem>
              <SelectItem value="gaming">Gaming</SelectItem>
              <SelectItem value="clothing">Clothing</SelectItem>
              <SelectItem value="accessories">Accessories</SelectItem>
              <SelectItem value="collectibles">Collectibles</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="featured">Featured</SelectItem>
              <SelectItem value="points_low">Lowest Points</SelectItem>
              <SelectItem value="points_high">Highest Points</SelectItem>
              <SelectItem value="name">Name A-Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Prizes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPrizes.map((prize) => (
          <Card key={prize.id} className="relative">
            {prize.is_featured && (
              <Badge className="absolute top-2 right-2 bg-yellow-500">
                <Star className="h-3 w-3 mr-1" />
                Featured
              </Badge>
            )}

            <CardHeader>
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback>{getInitials(prize.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="text-lg">{prize.name}</CardTitle>
                  <Badge variant="outline">{prize.category}</Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <p className="text-muted-foreground">{prize.description}</p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-yellow-500" />
                  <span className="font-bold">{prize.points_cost}</span>
                  <span className="text-muted-foreground">points</span>
                </div>

                <div className="text-sm text-muted-foreground">
                  {prize.stock_quantity > 0 ? (
                    <span className="text-green-600">
                      {prize.stock_quantity} in stock
                    </span>
                  ) : (
                    <span className="text-red-600">Out of stock</span>
                  )}
                </div>
              </div>

              <Button
                onClick={() => {
                  setSelectedPrize(prize);
                  setShowRedemptionDialog(true);
                  setError(null);
                }}
                disabled={
                  !user ||
                  prize.stock_quantity <= 0 ||
                  userPoints < prize.points_cost
                }
                className="w-full"
              >
                <Gift className="h-4 w-4 mr-2" />
                {!user
                  ? "Login to Redeem"
                  : prize.stock_quantity <= 0
                  ? "Out of Stock"
                  : userPoints < prize.points_cost
                  ? "Not Enough Points"
                  : "Redeem Prize"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredPrizes.length === 0 && (
        <div className="text-center py-12">
          <Gift className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No prizes found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search or filters
          </p>
        </div>
      )}

      {/* Redemption History */}
      {user && userRedemptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              My Redemptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {userRedemptions.map((redemption) => (
                <div
                  key={redemption.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3 h-3 rounded-full ${getStatusColor(
                        redemption.status
                      )}`}
                    />
                    <div>
                      <p className="font-medium">{redemption.prize.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(redemption.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-600">
                      -{redemption.points_spent} points
                    </p>
                    <Badge variant="outline" className="capitalize">
                      {redemption.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Redemption Dialog */}
      <Dialog
        open={showRedemptionDialog}
        onOpenChange={setShowRedemptionDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redeem Prize</DialogTitle>
            <DialogDescription>
              Are you sure you want to redeem this prize?
            </DialogDescription>
          </DialogHeader>

          {selectedPrize && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    {getInitials(selectedPrize.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedPrize.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedPrize.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span>Cost:</span>
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-yellow-500" />
                  <span className="font-bold">{selectedPrize.points_cost}</span>
                  <span className="text-muted-foreground">points</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span>Your Balance:</span>
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-yellow-500" />
                  <span className="font-bold">{userPoints}</span>
                  <span className="text-muted-foreground">points</span>
                </div>
              </div>

              {userPoints < selectedPrize.points_cost && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">
                    You need {selectedPrize.points_cost - userPoints} more
                    points to redeem this prize.
                  </p>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{error}</p>
                  {error.includes("shipping address") && (
                    <Link
                      href="/profile"
                      className="text-blue-600 hover:underline text-sm mt-2 inline-block"
                    >
                      Go to Profile Settings →
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRedemptionDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={redeemPrize}
              disabled={
                redeeming ||
                !selectedPrize ||
                userPoints < (selectedPrize?.points_cost || 0)
              }
            >
              {redeeming ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Redeeming...
                </>
              ) : (
                <>
                  <Gift className="h-4 w-4 mr-2" />
                  Confirm Redemption
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
