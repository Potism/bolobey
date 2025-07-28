"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ShoppingCart,
  Zap,
  Star,
  CheckCircle,
  AlertCircle,
  Euro,
  Gift,
} from "lucide-react";
import { useUserPoints } from "@/lib/hooks/useUserPoints";
import { PointPackage } from "@/lib/types";

interface PointPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function PointPurchaseModal({
  isOpen,
  onClose,
  onSuccess,
}: PointPurchaseModalProps) {
  const { packages, purchaseBettingPoints } = useUserPoints();
  const [selectedPackage, setSelectedPackage] = useState<PointPackage | null>(
    null
  );
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  const handlePurchase = async () => {
    if (!selectedPackage) return;

    setPurchaseLoading(true);
    setPurchaseError(null);

    const result = await purchaseBettingPoints(selectedPackage.id);

    if (result.success) {
      onSuccess?.();
      onClose();
    } else {
      setPurchaseError(result.error || "Purchase failed");
    }

    setPurchaseLoading(false);
  };

  const getPackageIcon = (pkg: PointPackage) => {
    if (pkg.is_featured) return <Star className="h-4 w-4 text-yellow-500" />;
    if (pkg.is_popular) return <Zap className="h-4 w-4 text-blue-500" />;
    return <Gift className="h-4 w-4 text-green-500" />;
  };

  const getPackageBadge = (pkg: PointPackage) => {
    if (pkg.is_featured)
      return <Badge className="bg-yellow-500 text-white">Featured</Badge>;
    if (pkg.is_popular)
      return <Badge className="bg-blue-500 text-white">Popular</Badge>;
    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ShoppingCart className="h-6 w-6 text-blue-600" />
            Purchase Betting Points
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Package Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {packages.map((pkg) => (
              <motion.div
                key={pkg.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card
                  className={`cursor-pointer transition-all ${
                    selectedPackage?.id === pkg.id
                      ? "ring-2 ring-blue-500 bg-blue-50"
                      : "hover:shadow-md"
                  }`}
                  onClick={() => setSelectedPackage(pkg)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getPackageIcon(pkg)}
                        <CardTitle className="text-lg">{pkg.name}</CardTitle>
                      </div>
                      {getPackageBadge(pkg)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Betting Points:
                      </span>
                      <span className="font-bold text-lg">
                        {pkg.betting_points}
                      </span>
                    </div>

                    {pkg.bonus_points > 0 && (
                      <div className="flex items-center justify-between text-green-600">
                        <span className="text-sm">Bonus Points:</span>
                        <span className="font-bold">+{pkg.bonus_points}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-sm text-muted-foreground">
                        Total Points:
                      </span>
                      <span className="font-bold text-xl text-blue-600">
                        {pkg.betting_points + pkg.bonus_points}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Price:
                      </span>
                      <span className="font-bold text-lg flex items-center gap-1">
                        <Euro className="h-4 w-4" />
                        {pkg.price_eur.toFixed(2)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Selected Package Details */}
          {selectedPackage && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-blue-50 p-4 rounded-lg border border-blue-200"
            >
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-blue-900">
                  Selected Package
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Package:</span>
                  <p className="font-medium">{selectedPackage.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Points:</span>
                  <p className="font-medium text-blue-600">
                    {selectedPackage.betting_points +
                      selectedPackage.bonus_points}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Price:</span>
                  <p className="font-medium">
                    €{selectedPackage.price_eur.toFixed(2)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Value:</span>
                  <p className="font-medium">
                    €
                    {(
                      (selectedPackage.price_eur /
                        (selectedPackage.betting_points +
                          selectedPackage.bonus_points)) *
                      100
                    ).toFixed(2)}{" "}
                    per 100 points
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Error Message */}
          {purchaseError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg"
            >
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-red-700">{purchaseError}</span>
            </motion.div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={purchaseLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePurchase}
              disabled={!selectedPackage || purchaseLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {purchaseLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Purchase for €
                  {selectedPackage?.price_eur.toFixed(2) || "0.00"}
                </div>
              )}
            </Button>
          </div>

          {/* Info Section */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Info className="h-4 w-4" />
              How it works
            </h4>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• Betting points are used to place bets on matches</p>
              <p>• Win stream points when your bets are successful</p>
              <p>• Stream points can be redeemed for real prizes</p>
              <p>• All transactions are secure and tracked</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Info icon component
function Info({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
