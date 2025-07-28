"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Trophy,
  Package,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Plus,
  BarChart3,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/hooks/useAuth";

interface DashboardStats {
  totalPrizes: number;
  totalRedemptions: number;
  totalPointsSpent: number;
  pendingRedemptions: number;
  lowStockPrizes: number;
  activeUsers: number;
}

interface Prize {
  id: string;
  name: string;
  description: string;
  points_cost: number;
  category: string;
  stock_quantity: number;
  is_featured: boolean;
  is_active: boolean;
  total_redemptions: number;
  created_at: string;
}

interface Redemption {
  id: string;
  user_id: string;
  prize_id: string;
  points_spent: number;
  status: string;
  created_at: string;
  user: {
    display_name: string;
    email: string;
  };
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

const PRIZES_PER_PAGE = 12;
const REDEMPTIONS_PER_PAGE = 20;

export default function AdminPrizesDashboard() {
  const { user } = useAuth();

  // Stats state
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Prizes state
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [prizesLoading, setPrizesLoading] = useState(true);
  const [prizesPagination, setPrizesPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: PRIZES_PER_PAGE,
    total: 0,
    totalPages: 0,
  });

  // Redemptions state
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
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
  const [activeTab, setActiveTab] = useState("overview");

  // Form states
  const [newPrize, setNewPrize] = useState({
    name: "",
    description: "",
    points_cost: "",
    category: "gaming",
    stock_quantity: "",
    is_featured: false,
  });

  // Edit states
  const [editingPrize, setEditingPrize] = useState<Prize | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingPrize, setDeletingPrize] = useState<Prize | null>(null);

  // Filter states
  const [prizesSearchTerm, setPrizesSearchTerm] = useState("");
  const [prizesCategoryFilter, setPrizesCategoryFilter] = useState("all");
  const [redemptionsStatusFilter, setRedemptionsStatusFilter] = useState("all");
  const [redemptionsSearchTerm, setRedemptionsSearchTerm] = useState("");

  // Cache
  const [statsCache, setStatsCache] = useState<{
    data: DashboardStats;
    timestamp: number;
  } | null>(null);

  const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

  // Fetch dashboard stats
  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);

      const now = Date.now();

      // Check cache
      if (statsCache && now - statsCache.timestamp < CACHE_DURATION) {
        setStats(statsCache.data);
        setStatsLoading(false);
        return;
      }

      // Fetch all data for stats
      const [prizesResult, redemptionsResult] = await Promise.all([
        supabase.from("prizes").select("*"),
        supabase.rpc("get_all_redemptions_admin"),
      ]);

      const prizesData = prizesResult.data || [];
      const redemptionsData = redemptionsResult.data || [];

      const stats: DashboardStats = {
        totalPrizes: prizesData.length,
        totalRedemptions: redemptionsData.length,
        totalPointsSpent: redemptionsData.reduce(
          (sum: number, r: any) => sum + (r.points_spent || 0),
          0
        ),
        pendingRedemptions: redemptionsData.filter(
          (r: any) => r.status === "pending"
        ).length,
        lowStockPrizes: prizesData.filter((p: any) => p.stock_quantity <= 5)
          .length,
        activeUsers: 0, // TODO: Implement active users tracking
      };

      setStats(stats);
      setStatsCache({ data: stats, timestamp: now });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setStatsLoading(false);
    }
  }, [statsCache]);

  // Fetch prizes with pagination
  const fetchPrizes = useCallback(
    async (page: number = 1) => {
      try {
        setPrizesLoading(true);

        let query = supabase
          .from("prizes")
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false });

        // Apply filters
        if (prizesCategoryFilter !== "all") {
          query = query.eq("category", prizesCategoryFilter);
        }

        if (prizesSearchTerm) {
          query = query.or(
            `name.ilike.%${prizesSearchTerm}%,description.ilike.%${prizesSearchTerm}%`
          );
        }

        // Apply pagination
        const from = (page - 1) * PRIZES_PER_PAGE;
        const to = from + PRIZES_PER_PAGE - 1;
        query = query.range(from, to);

        const { data, error, count } = await query;

        if (error) {
          console.error("Error fetching prizes:", error);
          return;
        }

        const totalPages = Math.ceil((count || 0) / PRIZES_PER_PAGE);

        setPrizes(data || []);
        setPrizesPagination({
          page,
          pageSize: PRIZES_PER_PAGE,
          total: count || 0,
          totalPages,
        });
      } catch (error) {
        console.error("Error fetching prizes:", error);
      } finally {
        setPrizesLoading(false);
      }
    },
    [prizesCategoryFilter, prizesSearchTerm]
  );

  // Fetch redemptions with pagination
  const fetchRedemptions = useCallback(
    async (page: number = 1) => {
      try {
        setRedemptionsLoading(true);

        const { data: redemptionsData, error: redemptionsError } =
          await supabase.rpc("get_all_redemptions_admin");

        if (redemptionsError) {
          console.error("Error fetching redemptions:", redemptionsError);
          setRedemptions([]);
          return;
        }

        // Apply filters
        let filteredData = redemptionsData || [];

        if (redemptionsStatusFilter !== "all") {
          filteredData = filteredData.filter(
            (r: any) => r.status === redemptionsStatusFilter
          );
        }

        if (redemptionsSearchTerm) {
          filteredData = filteredData.filter(
            (r: any) =>
              r.user_display_name
                ?.toLowerCase()
                .includes(redemptionsSearchTerm.toLowerCase()) ||
              r.prize_name
                ?.toLowerCase()
                .includes(redemptionsSearchTerm.toLowerCase())
          );
        }

        // Apply pagination
        const totalPages = Math.ceil(
          filteredData.length / REDEMPTIONS_PER_PAGE
        );
        const startIndex = (page - 1) * REDEMPTIONS_PER_PAGE;
        const endIndex = startIndex + REDEMPTIONS_PER_PAGE;
        const paginatedData = filteredData.slice(startIndex, endIndex);

        // Transform data
        const transformedData = paginatedData.map((item: any) => ({
          id: item.redemption_id,
          user_id: item.user_id,
          prize_id: item.prize_id,
          points_spent: item.points_spent,
          status: item.status,
          created_at: item.created_at,
          user: {
            display_name: item.user_display_name || "Unknown User",
            email: item.user_email || "unknown@example.com",
          },
          prize: {
            name: item.prize_name,
            category: item.prize_category,
          },
        }));

        setRedemptions(transformedData);
        setRedemptionsPagination({
          page,
          pageSize: REDEMPTIONS_PER_PAGE,
          total: filteredData.length,
          totalPages,
        });
      } catch (error) {
        console.error("Error fetching redemptions:", error);
      } finally {
        setRedemptionsLoading(false);
      }
    },
    [redemptionsStatusFilter, redemptionsSearchTerm]
  );

  // Initialize data
  useEffect(() => {
    if (user) {
      Promise.all([fetchStats(), fetchPrizes(1), fetchRedemptions(1)]).finally(
        () => setLoading(false)
      );
    }
  }, [user, fetchStats, fetchPrizes, fetchRedemptions]);

  // Refresh data when filters change
  useEffect(() => {
    if (!loading) {
      fetchPrizes(1);
    }
  }, [prizesCategoryFilter, prizesSearchTerm]);

  useEffect(() => {
    if (!loading) {
      fetchRedemptions(1);
    }
  }, [redemptionsStatusFilter, redemptionsSearchTerm]);

  // Pagination handlers
  const handlePrizesPageChange = (newPage: number) => {
    setPrizesPagination((prev) => ({ ...prev, page: newPage }));
    fetchPrizes(newPage);
  };

  const handleRedemptionsPageChange = (newPage: number) => {
    setRedemptionsPagination((prev) => ({ ...prev, page: newPage }));
    fetchRedemptions(newPage);
  };

  // CRUD operations
  const addPrize = async () => {
    if (
      !newPrize.name ||
      !newPrize.description ||
      !newPrize.points_cost ||
      !newPrize.stock_quantity
    ) {
      alert("Please fill in all required fields");
      return;
    }

    const pointsCost = parseInt(newPrize.points_cost);
    const stockQuantity = parseInt(newPrize.stock_quantity);

    if (pointsCost <= 0 || stockQuantity < 0) {
      alert("Please enter valid numbers for points cost and stock quantity");
      return;
    }

    try {
      const { error } = await supabase.from("prizes").insert({
        name: newPrize.name,
        description: newPrize.description,
        points_cost: pointsCost,
        category: newPrize.category,
        stock_quantity: stockQuantity,
        is_featured: newPrize.is_featured,
        is_active: true,
      });

      if (error) throw error;

      setNewPrize({
        name: "",
        description: "",
        points_cost: "",
        category: "gaming",
        stock_quantity: "",
        is_featured: false,
      });

      // Refresh data and clear cache
      setStatsCache(null);
      await Promise.all([fetchStats(), fetchPrizes(1)]);

      alert("Prize added successfully!");
    } catch (error) {
      console.error("Error adding prize:", error);
      alert("Error adding prize");
    }
  };

  const editPrize = async (prize: Prize) => {
    try {
      const { error } = await supabase
        .from("prizes")
        .update({
          name: prize.name,
          description: prize.description,
          points_cost: prize.points_cost,
          category: prize.category,
          stock_quantity: prize.stock_quantity,
          is_featured: prize.is_featured,
          updated_at: new Date().toISOString(),
        })
        .eq("id", prize.id);

      if (error) throw error;

      setShowEditDialog(false);
      setEditingPrize(null);

      // Refresh data
      await Promise.all([fetchStats(), fetchPrizes(prizesPagination.page)]);
    } catch (error) {
      console.error("Error editing prize:", error);
    }
  };

  const deletePrize = async (prizeId: string) => {
    try {
      const { error } = await supabase
        .from("prizes")
        .delete()
        .eq("id", prizeId);

      if (error) throw error;

      setShowDeleteDialog(false);
      setDeletingPrize(null);

      // Refresh data and clear cache
      setStatsCache(null);
      await Promise.all([fetchStats(), fetchPrizes(1)]);

      alert("Prize deleted successfully!");
    } catch (error: any) {
      console.error("Error deleting prize:", error);
      alert(`Error deleting prize: ${error.message || "Unknown error"}`);
    }
  };

  const updateRedemptionStatus = async (
    redemptionId: string,
    newStatus: string
  ) => {
    try {
      const { error } = await supabase
        .from("prize_redemptions")
        .update({ status: newStatus })
        .eq("id", redemptionId);

      if (error) throw error;

      alert(`Redemption status updated to ${newStatus} successfully!`);

      // Refresh data
      await Promise.all([
        fetchStats(),
        fetchRedemptions(redemptionsPagination.page),
      ]);
    } catch (error) {
      console.error("Error updating redemption status:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      alert(`Error updating redemption status: ${errorMessage}`);
    }
  };

  // Utility functions
  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      pending:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      approved:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      completed:
        "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    };
    return colors[status] || colors.pending;
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      gaming:
        "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      electronics:
        "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      clothing:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      food: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      other: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    };
    return colors[category] || colors.other;
  };

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Admin Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Please log in as admin to access this dashboard.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-h-screen p-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Prizes</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                stats?.totalPrizes
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Available for redemption
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Redemptions
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                stats?.totalRedemptions
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalPointsSpent} stream points spent
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                stats?.pendingRedemptions
              )}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                stats?.lowStockPrizes
              )}
            </div>
            <p className="text-xs text-muted-foreground">Need restocking</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="prizes">Prizes</TabsTrigger>
          <TabsTrigger value="redemptions">Redemptions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Redemptions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Recent Redemptions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {redemptions.slice(0, 5).map((redemption) => (
                    <div
                      key={redemption.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{redemption.prize.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {redemption.user?.display_name || "Unknown User"}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge className={getStatusColor(redemption.status)}>
                          {redemption.status}
                        </Badge>
                        <p className="text-sm text-muted-foreground">
                          {redemption.points_spent} stream points
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Low Stock Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Low Stock Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {prizes
                    .filter((prize) => prize.stock_quantity <= 5)
                    .slice(0, 5)
                    .map((prize) => (
                      <div
                        key={prize.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{prize.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {prize.category}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant="destructive">
                            {prize.stock_quantity} left
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="prizes" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Prize Management</h2>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Prize
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Prize</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Prize Name</Label>
                    <Input
                      id="name"
                      value={newPrize.name}
                      onChange={(e) =>
                        setNewPrize({ ...newPrize, name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newPrize.description}
                      onChange={(e) =>
                        setNewPrize({
                          ...newPrize,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="points">Stream Points Cost</Label>
                      <Input
                        id="points"
                        type="number"
                        value={newPrize.points_cost}
                        onChange={(e) =>
                          setNewPrize({
                            ...newPrize,
                            points_cost: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="stock">Stock Quantity</Label>
                      <Input
                        id="stock"
                        type="number"
                        value={newPrize.stock_quantity}
                        onChange={(e) =>
                          setNewPrize({
                            ...newPrize,
                            stock_quantity: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={newPrize.category}
                      onValueChange={(value) =>
                        setNewPrize({ ...newPrize, category: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gaming">Gaming</SelectItem>
                        <SelectItem value="electronics">Electronics</SelectItem>
                        <SelectItem value="clothing">Clothing</SelectItem>
                        <SelectItem value="accessories">Accessories</SelectItem>
                        <SelectItem value="collectibles">
                          Collectibles
                        </SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="featured"
                      checked={newPrize.is_featured}
                      onChange={(e) =>
                        setNewPrize({
                          ...newPrize,
                          is_featured: e.target.checked,
                        })
                      }
                    />
                    <Label htmlFor="featured">Featured Prize</Label>
                  </div>
                  <Button onClick={addPrize} className="w-full">
                    Add Prize
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Prizes Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="prizes-search">Search Prizes</Label>
                  <Input
                    id="prizes-search"
                    placeholder="Search prizes..."
                    value={prizesSearchTerm}
                    onChange={(e) => setPrizesSearchTerm(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="prizes-category">Category</Label>
                  <Select
                    value={prizesCategoryFilter}
                    onValueChange={setPrizesCategoryFilter}
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
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPrizesSearchTerm("");
                      setPrizesCategoryFilter("all");
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
          {prizesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading prizes...</span>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {prizes.map((prize) => (
                  <Card key={prize.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>{prize.name}</CardTitle>
                          <p className="text-sm text-muted-foreground mb-3">
                            {prize.description}
                          </p>
                        </div>
                        <Badge className={getCategoryColor(prize.category)}>
                          {prize.category}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Stream Points:
                          </span>
                          <span className="font-medium">
                            {prize.points_cost}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Stock:</span>
                          <span className="font-medium">
                            {prize.stock_quantity}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Featured:
                          </span>
                          <span className="font-medium">
                            {prize.is_featured ? "Yes" : "No"}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingPrize({ ...prize });
                            setShowEditDialog(true);
                          }}
                          className="flex-1"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setDeletingPrize(prize);
                            setShowDeleteDialog(true);
                          }}
                          className="flex-1"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
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
                    {(prizesPagination.page - 1) * prizesPagination.pageSize +
                      1}{" "}
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
        </TabsContent>

        <TabsContent value="redemptions" className="space-y-4">
          <h2 className="text-2xl font-bold">Redemption Management</h2>

          {/* Redemptions Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="redemptions-search">Search Redemptions</Label>
                  <Input
                    id="redemptions-search"
                    placeholder="Search by user or prize..."
                    value={redemptionsSearchTerm}
                    onChange={(e) => setRedemptionsSearchTerm(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="redemptions-status">Status</Label>
                  <Select
                    value={redemptionsStatusFilter}
                    onValueChange={setRedemptionsStatusFilter}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRedemptionsSearchTerm("");
                      setRedemptionsStatusFilter("all");
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

          {/* Redemptions List */}
          {redemptionsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading redemptions...</span>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {redemptions.map((redemption) => (
                  <Card key={redemption.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">
                            {redemption.prize.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {redemption.user?.display_name || "Unknown User"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {redemption.points_spent} stream points •{" "}
                            {new Date(
                              redemption.created_at
                            ).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(redemption.status)}>
                            {redemption.status}
                          </Badge>
                          {redemption.status === "pending" && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                onClick={() =>
                                  updateRedemptionStatus(
                                    redemption.id,
                                    "approved"
                                  )
                                }
                              >
                                Approve
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() =>
                                  updateRedemptionStatus(
                                    redemption.id,
                                    "rejected"
                                  )
                                }
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
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
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <h2 className="text-2xl font-bold">Analytics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Popular Categories
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(
                    prizes.reduce((acc, prize) => {
                      acc[prize.category] = (acc[prize.category] || 0) + 1;
                      return acc;
                    }, {} as { [key: string]: number })
                  )
                    .sort(([, a], [, b]) => b - a)
                    .map(([category, count]) => (
                      <div key={category} className="flex justify-between">
                        <span>{category}</span>
                        <span className="font-medium">{count} prizes</span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Top Prizes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {prizes
                    .sort(
                      (a, b) =>
                        (b.total_redemptions || 0) - (a.total_redemptions || 0)
                    )
                    .slice(0, 5)
                    .map((prize) => (
                      <div key={prize.id} className="flex justify-between">
                        <span>{prize.name}</span>
                        <span className="font-medium">
                          {prize.total_redemptions || 0} redemptions
                        </span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Prize Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Prize</DialogTitle>
          </DialogHeader>
          {editingPrize && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Prize Name</Label>
                <Input
                  id="edit-name"
                  value={editingPrize.name}
                  onChange={(e) =>
                    setEditingPrize({ ...editingPrize, name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editingPrize.description}
                  onChange={(e) =>
                    setEditingPrize({
                      ...editingPrize,
                      description: e.target.value,
                    })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-points">Stream Points Cost</Label>
                  <Input
                    id="edit-points"
                    type="number"
                    value={editingPrize.points_cost}
                    onChange={(e) =>
                      setEditingPrize({
                        ...editingPrize,
                        points_cost: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="edit-stock">Stock Quantity</Label>
                  <Input
                    id="edit-stock"
                    type="number"
                    value={editingPrize.stock_quantity}
                    onChange={(e) =>
                      setEditingPrize({
                        ...editingPrize,
                        stock_quantity: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-category">Category</Label>
                <Select
                  value={editingPrize.category}
                  onValueChange={(value) =>
                    setEditingPrize({ ...editingPrize, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gaming">Gaming</SelectItem>
                    <SelectItem value="electronics">Electronics</SelectItem>
                    <SelectItem value="clothing">Clothing</SelectItem>
                    <SelectItem value="accessories">Accessories</SelectItem>
                    <SelectItem value="collectibles">Collectibles</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit-featured"
                  checked={editingPrize.is_featured}
                  onChange={(e) =>
                    setEditingPrize({
                      ...editingPrize,
                      is_featured: e.target.checked,
                    })
                  }
                />
                <Label htmlFor="edit-featured">Featured Prize</Label>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => editPrize(editingPrize)}
                  className="flex-1"
                >
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowEditDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Prize Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Prize</DialogTitle>
          </DialogHeader>
          {deletingPrize && (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Are you sure you want to delete "{deletingPrize.name}"? This
                action cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={() => deletePrize(deletingPrize.id)}
                  className="flex-1"
                >
                  Delete Prize
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteDialog(false)}
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
