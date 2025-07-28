"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Package,
  CheckCircle,
  XCircle,
  Truck,
  Gift,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar,
  User,
  Award,
  MessageSquare,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/hooks/useAuth";

interface Redemption {
  id: string;
  user_id: string;
  prize_id: string;
  points_spent: number;
  status: string;
  created_at: string;
  updated_at?: string;
  admin_notes?: string;
  user: {
    display_name: string;
    email: string;
  };
  prize: {
    name: string;
    category: string;
  };
}

interface RedemptionStats {
  total_redemptions: number;
  pending_redemptions: number;
  approved_redemptions: number;
  shipped_redemptions: number;
  delivered_redemptions: number;
  cancelled_redemptions: number;
  total_points_spent: number;
  avg_processing_time_hours: number;
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const REDEMPTIONS_PER_PAGE = 20;

export default function EnhancedRedemptionManagement() {
  const { user } = useAuth();

  // State
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [stats, setStats] = useState<RedemptionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedRedemption, setSelectedRedemption] =
    useState<Redemption | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Pagination
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: REDEMPTIONS_PER_PAGE,
    total: 0,
    totalPages: 0,
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  // Fetch redemptions
  const fetchRedemptions = useCallback(
    async (page: number = 1) => {
      try {
        setLoading(true);

        const { data: redemptionsData, error: redemptionsError } =
          await supabase.rpc("get_all_redemptions_admin");

        if (redemptionsError) {
          console.error("Error fetching redemptions:", redemptionsError);
          setRedemptions([]);
          return;
        }

        // Apply filters
        let filteredData = redemptionsData || [];

        if (statusFilter !== "all") {
          filteredData = filteredData.filter(
            (r: any) => r.status === statusFilter
          );
        }

        if (searchTerm) {
          filteredData = filteredData.filter(
            (r: any) =>
              r.user_display_name
                ?.toLowerCase()
                .includes(searchTerm.toLowerCase()) ||
              r.prize_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              r.user_email?.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }

        // Apply date filter
        if (dateFilter !== "all") {
          const now = new Date();
          const filterDate = new Date();

          switch (dateFilter) {
            case "today":
              filterDate.setHours(0, 0, 0, 0);
              break;
            case "week":
              filterDate.setDate(now.getDate() - 7);
              break;
            case "month":
              filterDate.setMonth(now.getMonth() - 1);
              break;
          }

          filteredData = filteredData.filter(
            (r: any) => new Date(r.created_at) >= filterDate
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
          updated_at: item.updated_at,
          admin_notes: item.admin_notes,
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
        setPagination({
          page,
          pageSize: REDEMPTIONS_PER_PAGE,
          total: filteredData.length,
          totalPages,
        });
      } catch (error) {
        console.error("Error fetching redemptions:", error);
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, searchTerm, dateFilter]
  );

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc("get_redemption_stats_admin");

      if (error) {
        console.error("Error fetching stats:", error);
        return;
      }

      if (data && data.length > 0) {
        setStats(data[0]);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, []);

  // Update redemption status
  const updateRedemptionStatus = async (
    redemptionId: string,
    newStatus: string,
    notes?: string
  ) => {
    try {
      setUpdating(redemptionId);
      setError(null);
      setSuccess(null);

      const { data, error } = await supabase.rpc(
        "update_redemption_status_enhanced",
        {
          redemption_uuid: redemptionId,
          new_status: newStatus,
          admin_notes: notes || null,
        }
      );

      if (error) throw error;

      if (data && data.success) {
        setSuccess(data.message);
        setShowUpdateDialog(false);
        setNewStatus("");
        setAdminNotes("");

        // Refresh data
        await Promise.all([fetchRedemptions(pagination.page), fetchStats()]);

        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data?.message || "Failed to update redemption status");
      }
    } catch (error) {
      console.error("Error updating redemption status:", error);
      setError("Failed to update redemption status");
    } finally {
      setUpdating(null);
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      pending:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      approved:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      shipped: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      delivered:
        "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    };
    return colors[status] || colors.pending;
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "approved":
        return <CheckCircle className="h-4 w-4" />;
      case "shipped":
        return <Truck className="h-4 w-4" />;
      case "delivered":
        return <Gift className="h-4 w-4" />;
      case "cancelled":
        return <XCircle className="h-4 w-4" />;
      case "rejected":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Initialize
  useEffect(() => {
    if (user) {
      Promise.all([fetchRedemptions(1), fetchStats()]);
    }
  }, [user, fetchRedemptions, fetchStats]);

  // Refresh when filters change
  useEffect(() => {
    if (!loading) {
      fetchRedemptions(1);
    }
  }, [statusFilter, searchTerm, dateFilter]);

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Redemption Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Please log in as admin to access redemption management.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Redemption Management</h1>
          <p className="text-muted-foreground">
            Manage prize redemptions and track delivery status
          </p>
        </div>
        <Button
          onClick={() => fetchRedemptions(pagination.page)}
          variant="outline"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Redemptions
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.total_redemptions}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.total_points_spent} points spent
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.pending_redemptions}
              </div>
              <p className="text-xs text-muted-foreground">Awaiting approval</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Delivered</CardTitle>
              <Gift className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.delivered_redemptions}
              </div>
              <p className="text-xs text-muted-foreground">
                Successfully delivered
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Avg Processing
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.avg_processing_time_hours
                  ? `${Math.round(stats.avg_processing_time_hours)}h`
                  : "N/A"}
              </div>
              <p className="text-xs text-muted-foreground">
                Average processing time
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search by user or prize..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
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
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="date">Date Range</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setDateFilter("all");
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

      {/* Redemptions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Redemptions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading redemptions...</span>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Prize</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {redemptions.map((redemption) => (
                    <TableRow key={redemption.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {redemption.user.display_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {redemption.user.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {redemption.prize.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {redemption.prize.category}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {redemption.points_spent}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          stream points
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${getStatusColor(
                            redemption.status
                          )} flex items-center gap-1 w-fit`}
                        >
                          {getStatusIcon(redemption.status)}
                          {redemption.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="text-sm">
                            {formatDate(redemption.created_at)}
                          </div>
                          {redemption.updated_at &&
                            redemption.updated_at !== redemption.created_at && (
                              <div className="text-xs text-muted-foreground">
                                Updated: {formatDate(redemption.updated_at)}
                              </div>
                            )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedRedemption(redemption);
                                setShowDetailsDialog(true);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {redemption.status === "pending" && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedRedemption(redemption);
                                    setNewStatus("approved");
                                    setShowUpdateDialog(true);
                                  }}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedRedemption(redemption);
                                    setNewStatus("rejected");
                                    setShowUpdateDialog(true);
                                  }}
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Reject
                                </DropdownMenuItem>
                              </>
                            )}
                            {redemption.status === "approved" && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedRedemption(redemption);
                                  setNewStatus("shipped");
                                  setShowUpdateDialog(true);
                                }}
                              >
                                <Truck className="h-4 w-4 mr-2" />
                                Mark Shipped
                              </DropdownMenuItem>
                            )}
                            {redemption.status === "shipped" && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedRedemption(redemption);
                                  setNewStatus("delivered");
                                  setShowUpdateDialog(true);
                                }}
                              >
                                <Gift className="h-4 w-4 mr-2" />
                                Mark Delivered
                              </DropdownMenuItem>
                            )}
                            {(redemption.status === "pending" ||
                              redemption.status === "approved") && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedRedemption(redemption);
                                  setNewStatus("cancelled");
                                  setShowUpdateDialog(true);
                                }}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Cancel
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {(pagination.page - 1) * pagination.pageSize + 1} to{" "}
                    {Math.min(
                      pagination.page * pagination.pageSize,
                      pagination.total
                    )}{" "}
                    of {pagination.total} redemptions
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPagination((prev) => ({
                          ...prev,
                          page: prev.page - 1,
                        }));
                        fetchRedemptions(pagination.page - 1);
                      }}
                      disabled={pagination.page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPagination((prev) => ({
                          ...prev,
                          page: prev.page + 1,
                        }));
                        fetchRedemptions(pagination.page + 1);
                      }}
                      disabled={pagination.page >= pagination.totalPages}
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

      {/* Redemption Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Redemption Details</DialogTitle>
          </DialogHeader>
          {selectedRedemption && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">
                    User Information
                  </Label>
                  <div className="mt-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>{selectedRedemption.user.display_name}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {selectedRedemption.user.email}
                    </div>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">
                    Prize Information
                  </Label>
                  <div className="mt-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4" />
                      <span>{selectedRedemption.prize.name}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {selectedRedemption.prize.category}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Points Spent</Label>
                  <div className="mt-1 text-lg font-semibold">
                    {selectedRedemption.points_spent} stream points
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="mt-1">
                    <Badge
                      className={`${getStatusColor(
                        selectedRedemption.status
                      )} flex items-center gap-1 w-fit`}
                    >
                      {getStatusIcon(selectedRedemption.status)}
                      {selectedRedemption.status}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Created</Label>
                  <div className="mt-1 text-sm">
                    {formatDate(selectedRedemption.created_at)}
                  </div>
                </div>
                {selectedRedemption.updated_at &&
                  selectedRedemption.updated_at !==
                    selectedRedemption.created_at && (
                    <div>
                      <Label className="text-sm font-medium">
                        Last Updated
                      </Label>
                      <div className="mt-1 text-sm">
                        {formatDate(selectedRedemption.updated_at)}
                      </div>
                    </div>
                  )}
              </div>

              {selectedRedemption.admin_notes && (
                <div>
                  <Label className="text-sm font-medium">Admin Notes</Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded text-sm">
                    {selectedRedemption.admin_notes}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Redemption Status</DialogTitle>
          </DialogHeader>
          {selectedRedemption && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Redemption</Label>
                <div className="mt-1 p-3 bg-gray-50 rounded">
                  <div className="font-medium">
                    {selectedRedemption.prize.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {selectedRedemption.user.display_name} •{" "}
                    {selectedRedemption.points_spent} points
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="status">New Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes">Admin Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any notes about this status change..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() =>
                    updateRedemptionStatus(
                      selectedRedemption.id,
                      newStatus,
                      adminNotes
                    )
                  }
                  disabled={!newStatus || updating === selectedRedemption.id}
                  className="flex-1"
                >
                  {updating === selectedRedemption.id ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Updating...
                    </>
                  ) : (
                    "Update Status"
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowUpdateDialog(false)}
                  disabled={updating === selectedRedemption.id}
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
