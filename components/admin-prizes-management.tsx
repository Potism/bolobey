"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Gift,
  Plus,
  Package,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Truck,
  Users,
  Coins,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/hooks/useAuth";

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
  delivered_count: number;
}

interface Redemption {
  id: string;
  user_id: string;
  prize_id: string;
  points_spent: number;
  status: string;
  created_at: string;
  admin_notes?: string;
  user: {
    display_name: string;
    email: string;
  };
  prize: {
    name: string;
  };
}

export function AdminPrizesManagement() {
  const { user } = useAuth();
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states for adding/editing prizes
  const [showAddPrizeDialog, setShowAddPrizeDialog] = useState(false);
  const [editingPrize, setEditingPrize] = useState<Prize | null>(null);
  const [prizeForm, setPrizeForm] = useState({
    name: "",
    description: "",
    points_cost: "",
    category: "gaming",
    stock_quantity: "",
    is_featured: false,
    is_active: true,
  });

  // Redemption management
  const [selectedRedemption, setSelectedRedemption] =
    useState<Redemption | null>(null);
  const [showRedemptionDialog, setShowRedemptionDialog] = useState(false);
  const [redemptionStatus, setRedemptionStatus] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  // Check if user is admin
  const isAdmin = user?.role === "admin";

  // Fetch prizes with stats
  const fetchPrizes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("prizes_with_stats")
        .select("*")
        .order("created_at", { ascending: false });

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

  // Fetch redemptions
  const fetchRedemptions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("prize_redemptions")
        .select(
          `
          *,
          user:users(display_name, email),
          prize:prizes(name)
        `
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching redemptions:", error);
        setError("Failed to load redemptions");
        return;
      }

      setRedemptions(data || []);
    } catch (error) {
      console.error("Error fetching redemptions:", error);
      setError("Failed to load redemptions");
    }
  }, []);

  // Add new prize
  const addPrize = useCallback(async () => {
    if (!prizeForm.name || !prizeForm.description || !prizeForm.points_cost) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      const { error } = await supabase.rpc("add_prize", {
        prize_name: prizeForm.name,
        prize_description: prizeForm.description,
        points_cost: parseInt(prizeForm.points_cost),
        prize_category: prizeForm.category,
        stock_quantity: parseInt(prizeForm.stock_quantity) || 0,
        is_featured: prizeForm.is_featured,
      });

      if (error) {
        setError(error.message);
        return;
      }

      setSuccess("Prize added successfully!");
      setShowAddPrizeDialog(false);
      resetPrizeForm();
      await fetchPrizes();
    } catch (error) {
      setError("Failed to add prize");
    }
  }, [prizeForm, fetchPrizes]);

  // Update redemption status
  const updateRedemptionStatus = useCallback(async () => {
    if (!selectedRedemption || !redemptionStatus) return;

    try {
      const { error } = await supabase.rpc("update_redemption_status", {
        redemption_uuid: selectedRedemption.id,
        new_status: redemptionStatus,
        admin_notes: adminNotes || null,
      });

      if (error) {
        setError(error.message);
        return;
      }

      setSuccess("Redemption status updated successfully!");
      setShowRedemptionDialog(false);
      setSelectedRedemption(null);
      setRedemptionStatus("");
      setAdminNotes("");
      await fetchRedemptions();
    } catch (error) {
      setError("Failed to update redemption status");
    }
  }, [selectedRedemption, redemptionStatus, adminNotes, fetchRedemptions]);

  // Reset prize form
  const resetPrizeForm = () => {
    setPrizeForm({
      name: "",
      description: "",
      points_cost: "",
      category: "gaming",
      stock_quantity: "",
      is_featured: false,
      is_active: true,
    });
  };

  // Get status color
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
        return <CheckCircle className="h-4 w-4" />;
      case "cancelled":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  useEffect(() => {
    Promise.all([fetchPrizes(), fetchRedemptions()]).finally(() =>
      setLoading(false)
    );
  }, [fetchPrizes, fetchRedemptions]);

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Admin Access Required</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            You need admin privileges to access this page.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const pendingRedemptions = redemptions.filter((r) => r.status === "pending");
  const totalRedemptions = redemptions.length;
  const totalPointsSpent = redemptions.reduce(
    (sum, r) => sum + r.points_spent,
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Prizes Management</h1>
          <p className="text-muted-foreground">
            Manage prizes and redemption requests
          </p>
        </div>
        <Dialog open={showAddPrizeDialog} onOpenChange={setShowAddPrizeDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Prize
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Prize</DialogTitle>
              <DialogDescription>
                Create a new prize for users to redeem with their points.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Prize Name</Label>
                <Input
                  id="name"
                  value={prizeForm.name}
                  onChange={(e) =>
                    setPrizeForm({ ...prizeForm, name: e.target.value })
                  }
                  placeholder="Enter prize name"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={prizeForm.description}
                  onChange={(e) =>
                    setPrizeForm({ ...prizeForm, description: e.target.value })
                  }
                  placeholder="Enter prize description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="points_cost">Points Cost</Label>
                  <Input
                    id="points_cost"
                    type="number"
                    value={prizeForm.points_cost}
                    onChange={(e) =>
                      setPrizeForm({
                        ...prizeForm,
                        points_cost: e.target.value,
                      })
                    }
                    placeholder="100"
                  />
                </div>
                <div>
                  <Label htmlFor="stock_quantity">Stock Quantity</Label>
                  <Input
                    id="stock_quantity"
                    type="number"
                    value={prizeForm.stock_quantity}
                    onChange={(e) =>
                      setPrizeForm({
                        ...prizeForm,
                        stock_quantity: e.target.value,
                      })
                    }
                    placeholder="10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={prizeForm.category}
                  onValueChange={(value) =>
                    setPrizeForm({ ...prizeForm, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="electronics">Electronics</SelectItem>
                    <SelectItem value="gaming">Gaming</SelectItem>
                    <SelectItem value="clothing">Clothing</SelectItem>
                    <SelectItem value="accessories">Accessories</SelectItem>
                    <SelectItem value="collectibles">Collectibles</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowAddPrizeDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={addPrize}>Add Prize</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Error/Success Alerts */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-600">{success}</p>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Prizes</p>
                <p className="text-2xl font-bold">{prizes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">
                  Total Redemptions
                </p>
                <p className="text-2xl font-bold">{totalRedemptions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">
                  {pendingRedemptions.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Points Spent</p>
                <p className="text-2xl font-bold">{totalPointsSpent}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Prizes List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Prizes Catalog
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {prizes.map((prize) => (
              <div
                key={prize.id}
                className="flex items-center justify-between p-4 bg-muted rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-medium">{prize.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {prize.description}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <Badge variant="outline">{prize.category}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {prize.points_cost} points
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {prize.stock_quantity} in stock
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 mb-2">
                    {prize.is_featured && (
                      <Badge className="bg-yellow-500">Featured</Badge>
                    )}
                    {!prize.is_active && (
                      <Badge variant="destructive">Inactive</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {prize.total_redemptions} redemptions
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Redemptions List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Recent Redemptions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {redemptions.slice(0, 10).map((redemption) => (
              <div
                key={redemption.id}
                className="flex items-center justify-between p-4 bg-muted rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-3 h-3 rounded-full ${getStatusColor(
                      redemption.status
                    )}`}
                  />
                  <div>
                    <p className="font-medium">{redemption.prize.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {redemption.user.display_name} ({redemption.user.email})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(redemption.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(redemption.status)}
                    <Badge variant="outline" className="capitalize">
                      {redemption.status}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium text-red-600">
                    -{redemption.points_spent} points
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedRedemption(redemption);
                      setRedemptionStatus(redemption.status);
                      setAdminNotes(redemption.admin_notes || "");
                      setShowRedemptionDialog(true);
                    }}
                  >
                    Update Status
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Redemption Status Update Dialog */}
      <Dialog
        open={showRedemptionDialog}
        onOpenChange={setShowRedemptionDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Redemption Status</DialogTitle>
            <DialogDescription>
              Update the status and add notes for this redemption.
            </DialogDescription>
          </DialogHeader>
          {selectedRedemption && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedRedemption.prize.name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedRedemption.user.display_name} -{" "}
                  {selectedRedemption.points_spent} points
                </p>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={redemptionStatus}
                  onValueChange={setRedemptionStatus}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="notes">Admin Notes</Label>
                <Textarea
                  id="notes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add any notes about this redemption..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRedemptionDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={updateRedemptionStatus}>Update Status</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
