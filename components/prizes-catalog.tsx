"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Alert, AlertDescription } from "./ui/alert";
import {
  Trophy,
  ShoppingCart,
  Award,
  Target,
  Filter,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
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
  is_active: boolean;
}

interface UserRedemption {
  id: string;
  prize_id: string;
  points_spent: number;
  status: string;
  created_at: string;
  prize: {
    name: string;
    category: string;
  };
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const ITEMS_PER_PAGE = 12; // Show 12 prizes per page
const REDEMPTIONS_PER_PAGE = 10; // Show 10 redemptions per page

export default function OptimizedPrizesCatalog() {
  const { user } = useAuth();

  // Prizes state
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [prizesLoading, setPrizesLoading] = useState(true);
  const [prizesPagination, setPrizesPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: ITEMS_PER_PAGE,
    total: 0,
    totalPages: 0,
  });

  // User state
  const [userStreamPoints, setUserStreamPoints] = useState(0);
  const [userRedemptions, setUserRedemptions] = useState<UserRedemption[]>([]);
  const [redemptionsLoading, setRedemptionsLoading] = useState(true);
  const [redemptionsPagination, setRedemptionsPagination] =
    useState<PaginationInfo>({
      page: 1,
      pageSize: REDEMPTIONS_PER_PAGE,
      total: 0,
      totalPages: 0,
    });

  // UI state
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const [selectedPrize, setSelectedPrize] = useState<Prize | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("featured");

  // Cache for prizes data
  const [prizesCache, setPrizesCache] = useState<{
    data: Prize[];
    timestamp: number;
    filters: string;
  } | null>(null);

  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Fetch prizes with pagination and caching
  const fetchPrizes = useCallback(
    async (page: number = 1, forceRefresh: boolean = false) => {
      try {
        setPrizesLoading(true);

        const cacheKey = `${selectedCategory}-${sortBy}-${searchTerm}`;
        const now = Date.now();

        // Check cache first
        if (
          !forceRefresh &&
          prizesCache &&
          prizesCache.filters === cacheKey &&
          now - prizesCache.timestamp < CACHE_DURATION
        ) {
          setPrizes(prizesCache.data);
          setPrizesLoading(false);
          return;
        }

        // Build query
        let query = supabase
          .from("prizes")
          .select("*", { count: "exact" })
          .eq("is_active", true);

        // Apply filters
        if (selectedCategory !== "all") {
          query = query.eq("category", selectedCategory);
        }

        if (searchTerm) {
          query = query.or(
            `name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`
          );
        }

        // Apply sorting
        switch (sortBy) {
          case "featured":
            query = query
              .order("is_featured", { ascending: false })
              .order("points_cost", { ascending: true });
            break;
          case "points-low":
            query = query.order("points_cost", { ascending: true });
            break;
          case "points-high":
            query = query.order("points_cost", { ascending: false });
            break;
          case "name":
            query = query.order("name", { ascending: true });
            break;
          default:
            query = query.order("is_featured", { ascending: false });
        }

        // Apply pagination
        const from = (page - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;
        query = query.range(from, to);

        const { data, error: fetchError, count } = await query;

        if (fetchError) {
          console.error("Error fetching prizes:", fetchError);
          return;
        }

        const totalPages = Math.ceil((count || 0) / ITEMS_PER_PAGE);

        setPrizes(data || []);
        setPrizesPagination({
          page,
          pageSize: ITEMS_PER_PAGE,
          total: count || 0,
          totalPages,
        });

        // Update cache
        setPrizesCache({
          data: data || [],
          timestamp: now,
          filters: cacheKey,
        });
      } catch (fetchError) {
        console.error("Error fetching prizes:", fetchError);
      } finally {
        setPrizesLoading(false);
      }
    },
    [selectedCategory, sortBy, searchTerm, prizesCache]
  );

  // Fetch user stream points
  const fetchUserStreamPoints = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error: fetchError } = await supabase
        .from("user_points")
        .select("stream_points")
        .eq("user_id", user.id)
        .single();

      if (fetchError) {
        console.error("Error fetching user stream points:", fetchError);
        return;
      }

      setUserStreamPoints(data?.stream_points || 0);
    } catch (fetchError) {
      console.error("Error fetching user stream points:", fetchError);
    }
  }, [user]);

  // Fetch user redemptions with pagination
  const fetchUserRedemptions = useCallback(
    async (page: number = 1) => {
      if (!user) return;
      try {
        setRedemptionsLoading(true);

        const { data, error: fetchError } = await supabase.rpc(
          "get_user_redemptions_safe",
          { user_uuid: user.id }
        );

        if (fetchError) {
          console.error("Error fetching user redemptions:", fetchError);
          // Fallback to direct query
          const { data: fallbackData, error: fallbackError } = await supabase
            .from("prize_redemptions")
            .select(
              `
            id,
            prize_id,
            points_spent,
            status,
            created_at,
            prize:prizes(name, category)
          `
            )
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

          if (fallbackError) {
            console.error("Error with fallback query:", fallbackError);
            setUserRedemptions([]);
            return;
          }

          const transformedData =
            (fallbackData as unknown as UserRedemption[]) || [];
          const totalPages = Math.ceil(
            transformedData.length / REDEMPTIONS_PER_PAGE
          );
          const startIndex = (page - 1) * REDEMPTIONS_PER_PAGE;
          const endIndex = startIndex + REDEMPTIONS_PER_PAGE;

          setUserRedemptions(transformedData.slice(startIndex, endIndex));
          setRedemptionsPagination({
            page,
            pageSize: REDEMPTIONS_PER_PAGE,
            total: transformedData.length,
            totalPages,
          });
          return;
        }

        // Transform function result
        const transformedData =
          data?.map(
            (item: {
              redemption_id: string;
              prize_name: string;
              prize_category: string;
              points_spent: number;
              status: string;
              created_at: string;
            }) => ({
              id: item.redemption_id,
              prize_id: "",
              points_spent: item.points_spent,
              status: item.status,
              created_at: item.created_at,
              prize: {
                name: item.prize_name,
                category: item.prize_category,
              },
            })
          ) || [];

        const totalPages = Math.ceil(
          transformedData.length / REDEMPTIONS_PER_PAGE
        );
        const startIndex = (page - 1) * REDEMPTIONS_PER_PAGE;
        const endIndex = startIndex + REDEMPTIONS_PER_PAGE;

        setUserRedemptions(transformedData.slice(startIndex, endIndex));
        setRedemptionsPagination({
          page,
          pageSize: REDEMPTIONS_PER_PAGE,
          total: transformedData.length,
          totalPages,
        });
      } catch (fetchError) {
        console.error("Error fetching user redemptions:", fetchError);
      } finally {
        setRedemptionsLoading(false);
      }
    },
    [user]
  );

  // Redeem prize
  const redeemPrize = useCallback(async () => {
    if (!user || !selectedPrize) return;
    setRedeeming(true);
    setError(null);
    setSuccess(null);

    try {
      if (userStreamPoints < selectedPrize.points_cost) {
        setError("Insufficient stream points");
        return;
      }

      if (selectedPrize.stock_quantity <= 0) {
        setError("Prize is out of stock");
        return;
      }

      const { data, error: redemptionError } = await supabase.rpc(
        "redeem_prize_dual_points",
        {
          prize_uuid: selectedPrize.id,
          user_uuid: user.id,
        }
      );

      if (redemptionError) {
        console.error("Error redeeming prize:", redemptionError);
        setError(redemptionError.message || "Failed to redeem prize");
        return;
      }

      if (data && data.success) {
        setSuccess(data.message || "Prize redeemed successfully!");
        setSelectedPrize(null);

        // Refresh data and clear cache
        setPrizesCache(null);
        await Promise.all([
          fetchPrizes(1, true),
          fetchUserStreamPoints(),
          fetchUserRedemptions(1),
        ]);

        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data?.message || "Failed to redeem prize");
      }
    } catch (error) {
      console.error("Error redeeming prize:", error);
      setError("Failed to redeem prize");
    } finally {
      setRedeeming(false);
    }
  }, [
    user,
    selectedPrize,
    userStreamPoints,
    fetchPrizes,
    fetchUserStreamPoints,
    fetchUserRedemptions,
  ]);

  // Initialize data
  useEffect(() => {
    Promise.all([
      fetchPrizes(1),
      fetchUserStreamPoints(),
      fetchUserRedemptions(1),
    ]).finally(() => setLoading(false));
  }, [fetchPrizes, fetchUserStreamPoints, fetchUserRedemptions]);

  // Refresh prizes when filters change
  useEffect(() => {
    if (!loading) {
      fetchPrizes(1, true);
    }
  }, [selectedCategory, sortBy, searchTerm]);

  // Memoized filtered prizes (for client-side search if needed)
  const filteredPrizes = useMemo(() => {
    if (!searchTerm) return prizes;

    return prizes.filter(
      (prize) =>
        prize.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prize.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [prizes, searchTerm]);

  // Pagination handlers
  const handlePrizesPageChange = (newPage: number) => {
    setPrizesPagination((prev) => ({ ...prev, page: newPage }));
    fetchPrizes(newPage);
  };

  const handleRedemptionsPageChange = (newPage: number) => {
    setRedemptionsPagination((prev) => ({ ...prev, page: newPage }));
    fetchUserRedemptions(newPage);
  };

  // Utility functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "approved":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "shipped":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "delivered":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "approved":
        return <CheckCircle className="h-4 w-4" />;
      case "shipped":
        return <Package className="h-4 w-4" />;
      case "delivered":
        return <Trophy className="h-4 w-4" />;
      case "cancelled":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading prizes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          🏆 Prizes Catalog
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Redeem your stream points for amazing prizes!
        </p>
      </div>

      {/* User Points Display */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-500" />
                <span className="font-semibold">Your Stream Points:</span>
                <span className="text-2xl font-bold text-yellow-600">
                  {userStreamPoints.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              {redemptionsPagination.total} redemptions made
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Success/Error Messages */}
      {success && (
        <Alert className="mb-6">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="mb-6">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search Prizes</Label>
              <Input
                id="search"
                placeholder="Search prizes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="gaming">Gaming</SelectItem>
                  <SelectItem value="electronics">Electronics</SelectItem>
                  <SelectItem value="clothing">Clothing</SelectItem>
                  <SelectItem value="accessories">Accessories</SelectItem>
                  <SelectItem value="collectibles">Collectibles</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="sort">Sort By</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="featured">Featured First</SelectItem>
                  <SelectItem value="points-low">
                    Points: Low to High
                  </SelectItem>
                  <SelectItem value="points-high">
                    Points: High to Low
                  </SelectItem>
                  <SelectItem value="name">Name A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedCategory("all");
                  setSortBy("featured");
                }}
                className="w-full"
              >
                <Filter className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prizes Grid */}
      <div className="mb-8">
        {prizesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading prizes...</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-6">
              {filteredPrizes.map((prize) => (
                <Card key={prize.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{prize.name}</CardTitle>
                      {prize.is_featured && (
                        <Badge variant="secondary" className="text-xs">
                          <Target className="h-3 w-3 mr-1" />
                          Featured
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {prize.description}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          Cost:
                        </span>
                        <span className="font-semibold text-yellow-600">
                          {prize.points_cost.toLocaleString()} stream points
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          Stock:
                        </span>
                        <span
                          className={`font-medium ${
                            prize.stock_quantity <= 5
                              ? "text-red-600"
                              : "text-green-600"
                          }`}
                        >
                          {prize.stock_quantity} available
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          Category:
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {prize.category}
                        </Badge>
                      </div>
                      <Button
                        className="w-full"
                        disabled={
                          userStreamPoints < prize.points_cost ||
                          prize.stock_quantity <= 0
                        }
                        onClick={() => setSelectedPrize(prize)}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        {userStreamPoints < prize.points_cost
                          ? "Not Enough Points"
                          : prize.stock_quantity <= 0
                          ? "Out of Stock"
                          : "Redeem Prize"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Prizes Pagination */}
            {prizesPagination.totalPages > 1 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing{" "}
                  {(prizesPagination.page - 1) * prizesPagination.pageSize + 1}{" "}
                  to{" "}
                  {Math.min(
                    prizesPagination.page * prizesPagination.pageSize,
                    prizesPagination.total
                  )}{" "}
                  of {prizesPagination.total} prizes
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handlePrizesPageChange(prizesPagination.page - 1)
                    }
                    disabled={prizesPagination.page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {prizesPagination.page} of{" "}
                    {prizesPagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handlePrizesPageChange(prizesPagination.page + 1)
                    }
                    disabled={
                      prizesPagination.page >= prizesPagination.totalPages
                    }
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* User Redemptions */}
      {userRedemptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Your Redemptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {redemptionsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading redemptions...</span>
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-4">
                  {userRedemptions.map((redemption) => (
                    <div
                      key={redemption.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{redemption.prize.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {redemption.points_spent} stream points •{" "}
                          {new Date(redemption.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge
                        className={`${getStatusColor(
                          redemption.status
                        )} flex items-center gap-1`}
                      >
                        {getStatusIcon(redemption.status)}
                        {redemption.status}
                      </Badge>
                    </div>
                  ))}
                </div>

                {/* Redemptions Pagination */}
                {redemptionsPagination.totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Showing{" "}
                      {(redemptionsPagination.page - 1) *
                        redemptionsPagination.pageSize +
                        1}{" "}
                      to{" "}
                      {Math.min(
                        redemptionsPagination.page *
                          redemptionsPagination.pageSize,
                        redemptionsPagination.total
                      )}{" "}
                      of {redemptionsPagination.total} redemptions
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleRedemptionsPageChange(
                            redemptionsPagination.page - 1
                          )
                        }
                        disabled={redemptionsPagination.page <= 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <span className="text-sm">
                        Page {redemptionsPagination.page} of{" "}
                        {redemptionsPagination.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleRedemptionsPageChange(
                            redemptionsPagination.page + 1
                          )
                        }
                        disabled={
                          redemptionsPagination.page >=
                          redemptionsPagination.totalPages
                        }
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Redemption Confirmation Dialog */}
      <Dialog
        open={!!selectedPrize}
        onOpenChange={() => setSelectedPrize(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Redemption</DialogTitle>
          </DialogHeader>
          {selectedPrize && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">{selectedPrize.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedPrize.description}
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Cost:</span>
                  <span className="font-semibold text-yellow-600">
                    {selectedPrize.points_cost} stream points
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Your Balance:</span>
                  <span className="font-semibold">
                    {userStreamPoints} stream points
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Remaining After:</span>
                  <span className="font-semibold">
                    {userStreamPoints - selectedPrize.points_cost} stream points
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={redeemPrize}
                  disabled={redeeming}
                  className="flex-1"
                >
                  {redeeming ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Confirm Redemption
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedPrize(null)}
                  disabled={redeeming}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
