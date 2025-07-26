"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  User,
  MapPin,
  Phone,
  Save,
  AlertCircle,
  Edit,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/hooks/useAuth";

interface PrizeRedemption {
  id: string;
  user_id: string;
  prize_id: string;
  points_spent: number;
  status: "pending" | "approved" | "shipped" | "delivered" | "cancelled";
  shipping_address: string;
  tracking_number: string;
  admin_notes: string;
  created_at: string;
  updated_at: string;
  user?: {
    display_name: string;
    email: string;
    phone_number: string;
    city: string;
    state_province: string;
    postal_code: string;
    country: string;
  };
  prize?: {
    name: string;
    description: string;
    image_url: string;
  };
}

export function AdminPrizesShipping() {
  const { user } = useAuth();
  const [redemptions, setRedemptions] = useState<PrizeRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedRedemption, setSelectedRedemption] =
    useState<PrizeRedemption | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    status: "" as
      | "pending"
      | "approved"
      | "shipped"
      | "delivered"
      | "cancelled",
    tracking_number: "",
    admin_notes: "",
  });

  useEffect(() => {
    if (user?.role === "admin") {
      fetchRedemptions();
    }
  }, [user]);

  const fetchRedemptions = async () => {
    try {
      const { data, error } = await supabase
        .from("prize_redemptions")
        .select(
          `
          *,
          user:users(
            display_name,
            email,
            phone_number,
            city,
            state_province,
            postal_code,
            country
          ),
          prize:prizes(
            name,
            description,
            image_url
          )
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRedemptions(data || []);
    } catch (error) {
      console.error("Error fetching redemptions:", error);
      setError("Failed to load prize redemptions");
    } finally {
      setLoading(false);
    }
  };

  const updateRedemptionStatus = async (
    redemptionId: string,
    updates: Partial<PrizeRedemption>
  ) => {
    setUpdating(redemptionId);
    setError(null);
    setSuccess(null);

    try {
      const { error } = await supabase
        .from("prize_redemptions")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", redemptionId);

      if (error) throw error;

      setSuccess("Redemption status updated successfully!");
      await fetchRedemptions();
      setIsEditing(false);
      setSelectedRedemption(null);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error("Error updating redemption:", error);
      setError("Failed to update redemption status");
    } finally {
      setUpdating(null);
    }
  };

  const handleEdit = (redemption: PrizeRedemption) => {
    setSelectedRedemption(redemption);
    setEditForm({
      status: redemption.status,
      tracking_number: redemption.tracking_number || "",
      admin_notes: redemption.admin_notes || "",
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!selectedRedemption) return;
    updateRedemptionStatus(selectedRedemption.id, editForm);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "approved":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "shipped":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "delivered":
        return "bg-green-100 text-green-800 border-green-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "approved":
        return <CheckCircle className="h-4 w-4" />;
      case "shipped":
        return <Truck className="h-4 w-4" />;
      case "delivered":
        return <Package className="h-4 w-4" />;
      case "cancelled":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!user || user.role !== "admin") {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You need admin privileges to access this page.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading prize redemptions...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const pendingRedemptions = redemptions.filter((r) => r.status === "pending");
  const approvedRedemptions = redemptions.filter(
    (r) => r.status === "approved"
  );
  const shippedRedemptions = redemptions.filter((r) => r.status === "shipped");
  const deliveredRedemptions = redemptions.filter(
    (r) => r.status === "delivered"
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Prize Shipping Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <span className="font-semibold text-yellow-800">Pending</span>
              </div>
              <p className="text-2xl font-bold text-yellow-800">
                {pendingRedemptions.length}
              </p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-blue-800">Approved</span>
              </div>
              <p className="text-2xl font-bold text-blue-800">
                {approvedRedemptions.length}
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-purple-600" />
                <span className="font-semibold text-purple-800">Shipped</span>
              </div>
              <p className="text-2xl font-bold text-purple-800">
                {shippedRedemptions.length}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-green-600" />
                <span className="font-semibold text-green-800">Delivered</span>
              </div>
              <p className="text-2xl font-bold text-green-800">
                {deliveredRedemptions.length}
              </p>
            </div>
          </div>

          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending ({pendingRedemptions.length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Approved ({approvedRedemptions.length})
          </TabsTrigger>
          <TabsTrigger value="shipped" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Shipped ({shippedRedemptions.length})
          </TabsTrigger>
          <TabsTrigger value="delivered" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Delivered ({deliveredRedemptions.length})
          </TabsTrigger>
        </TabsList>

        {["pending", "approved", "shipped", "delivered"].map((status) => (
          <TabsContent key={status} value={status} className="space-y-4">
            {redemptions
              .filter((r) => r.status === status)
              .map((redemption) => (
                <Card key={redemption.id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <Badge
                            className={`${getStatusColor(
                              redemption.status
                            )} flex items-center gap-1`}
                          >
                            {getStatusIcon(redemption.status)}
                            {redemption.status.toUpperCase()}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(redemption.created_at)}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Prize Information */}
                          <div>
                            <h3 className="font-semibold mb-2 flex items-center gap-2">
                              <Package className="h-4 w-4" />
                              Prize Details
                            </h3>
                            <div className="space-y-2">
                              <p className="font-medium">
                                {redemption.prize?.name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {redemption.prize?.description}
                              </p>
                              <p className="text-sm">
                                <span className="font-medium">
                                  Points spent:
                                </span>{" "}
                                {redemption.points_spent}
                              </p>
                            </div>
                          </div>

                          {/* User Information */}
                          <div>
                            <h3 className="font-semibold mb-2 flex items-center gap-2">
                              <User className="h-4 w-4" />
                              Customer Details
                            </h3>
                            <div className="space-y-2">
                              <p className="font-medium">
                                {redemption.user?.display_name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {redemption.user?.email}
                              </p>
                              {redemption.user?.phone_number && (
                                <p className="text-sm flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {redemption.user.phone_number}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Shipping Address */}
                        {redemption.shipping_address && (
                          <div className="mt-4">
                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              Shipping Address
                            </h4>
                            <div className="bg-muted p-3 rounded-lg">
                              <p className="text-sm">
                                {redemption.shipping_address}
                              </p>
                              {redemption.user?.city && (
                                <p className="text-sm text-muted-foreground">
                                  {redemption.user.city},{" "}
                                  {redemption.user.state_province}{" "}
                                  {redemption.user.postal_code}
                                </p>
                              )}
                              {redemption.user?.country && (
                                <p className="text-sm text-muted-foreground">
                                  {redemption.user.country}
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Tracking Information */}
                        {redemption.tracking_number && (
                          <div className="mt-4">
                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                              <Truck className="h-4 w-4" />
                              Tracking Information
                            </h4>
                            <p className="text-sm font-mono bg-muted p-2 rounded">
                              {redemption.tracking_number}
                            </p>
                          </div>
                        )}

                        {/* Admin Notes */}
                        {redemption.admin_notes && (
                          <div className="mt-4">
                            <h4 className="font-semibold mb-2">Admin Notes</h4>
                            <p className="text-sm bg-muted p-3 rounded-lg">
                              {redemption.admin_notes}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(redemption)}
                          disabled={updating === redemption.id}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>

                        {redemption.status === "pending" && (
                          <Button
                            size="sm"
                            onClick={() =>
                              updateRedemptionStatus(redemption.id, {
                                status: "approved",
                              })
                            }
                            disabled={updating === redemption.id}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                        )}

                        {redemption.status === "approved" && (
                          <Button
                            size="sm"
                            onClick={() =>
                              updateRedemptionStatus(redemption.id, {
                                status: "shipped",
                              })
                            }
                            disabled={updating === redemption.id}
                          >
                            <Truck className="h-4 w-4 mr-1" />
                            Mark Shipped
                          </Button>
                        )}

                        {redemption.status === "shipped" && (
                          <Button
                            size="sm"
                            onClick={() =>
                              updateRedemptionStatus(redemption.id, {
                                status: "delivered",
                              })
                            }
                            disabled={updating === redemption.id}
                          >
                            <Package className="h-4 w-4 mr-1" />
                            Mark Delivered
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </TabsContent>
        ))}
      </Tabs>

      {/* Edit Modal */}
      {isEditing && selectedRedemption && (
        <Card className="fixed inset-4 z-50 overflow-y-auto bg-background border shadow-lg">
          <CardHeader>
            <CardTitle>Edit Redemption</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={editForm.status}
                onValueChange={(value) =>
                  setEditForm({
                    ...editForm,
                    status: value as
                      | "pending"
                      | "approved"
                      | "shipped"
                      | "delivered"
                      | "cancelled",
                  })
                }
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
              <Label htmlFor="tracking_number">Tracking Number</Label>
              <Input
                id="tracking_number"
                value={editForm.tracking_number}
                onChange={(e) =>
                  setEditForm({ ...editForm, tracking_number: e.target.value })
                }
                placeholder="Enter tracking number"
              />
            </div>

            <div>
              <Label htmlFor="admin_notes">Admin Notes</Label>
              <Textarea
                id="admin_notes"
                value={editForm.admin_notes}
                onChange={(e) =>
                  setEditForm({ ...editForm, admin_notes: e.target.value })
                }
                placeholder="Add admin notes"
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={updating === selectedRedemption.id}
              >
                <Save className="h-4 w-4 mr-1" />
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
