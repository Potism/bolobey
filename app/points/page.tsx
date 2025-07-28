"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Trophy,
  Target,
  TrendingUp,
  Gift,
  CreditCard,
  History,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  Coins,
  Award,
} from "lucide-react";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDualPoints } from "@/lib/hooks/useDualPoints";
import { EnhancedPointPurchaseModal } from "@/components/enhanced-point-purchase-modal";

export default function PointsDashboard() {
  const {
    userPoints,
    packages,
    transactions,
    loading,
    packagesLoading,
    transactionsLoading,
    purchaseBettingPoints,
  } = useDualPoints();

  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "purchase_betting_points":
        return <CreditCard className="h-4 w-4 text-green-500" />;
      case "bet_placed":
        return <Target className="h-4 w-4 text-orange-500" />;
      case "stream_points_earned":
        return <Trophy className="h-4 w-4 text-blue-500" />;
      case "stream_points_redeemed":
        return <Gift className="h-4 w-4 text-purple-500" />;
      default:
        return <Coins className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case "purchase_betting_points":
        return "text-green-600";
      case "bet_placed":
        return "text-orange-600";
      case "stream_points_earned":
        return "text-blue-600";
      case "stream_points_redeemed":
        return "text-purple-600";
      default:
        return "text-gray-600";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Points Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage your betting points and stream points
          </p>
        </div>

        {/* Current Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Betting Points */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600 font-medium">
                      Betting Points
                    </p>
                    <p className="text-2xl font-bold text-green-700">
                      {userPoints?.betting_points || 0}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Total earned:{" "}
                      {userPoints?.total_betting_points_earned || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-green-200 rounded-full">
                    <Target className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Stream Points */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600 font-medium">
                      Stream Points
                    </p>
                    <p className="text-2xl font-bold text-blue-700">
                      {userPoints?.stream_points || 0}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Total earned:{" "}
                      {userPoints?.total_stream_points_earned || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-200 rounded-full">
                    <Trophy className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Total Spent */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-orange-600 font-medium">
                      Total Spent
                    </p>
                    <p className="text-2xl font-bold text-orange-700">
                      {userPoints?.total_points_spent || 0}
                    </p>
                    <p className="text-xs text-orange-600 mt-1">
                      Across all transactions
                    </p>
                  </div>
                  <div className="p-3 bg-orange-200 rounded-full">
                    <TrendingUp className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-600 font-medium">
                      Quick Actions
                    </p>
                    <div className="space-y-2 mt-3">
                      <Button
                        size="sm"
                        onClick={() => setShowPurchaseModal(true)}
                        className="w-full bg-purple-600 hover:bg-purple-700"
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Buy Points
                      </Button>
                    </div>
                  </div>
                  <div className="p-3 bg-purple-200 rounded-full">
                    <Award className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="packages" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Point Packages
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Transaction History
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* How It Works */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    How the Dual-Point System Works
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-green-600 font-bold text-sm">
                          1
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          Buy Betting Points
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Purchase betting points with real money to participate
                          in matches
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-blue-600 font-bold text-sm">
                          2
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          Win Stream Points
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Earn stream points when you win bets on matches
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-purple-600 font-bold text-sm">
                          3
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          Redeem for Prizes
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Exchange stream points for real prizes and rewards
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {transactionsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : transactions.length > 0 ? (
                    <div className="space-y-3">
                      {transactions.slice(0, 5).map((transaction) => (
                        <div
                          key={transaction.id}
                          className="flex items-center justify-between p-3 bg-muted rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            {getTransactionIcon(transaction.transaction_type)}
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {transaction.description ||
                                  transaction.transaction_type.replace(
                                    /_/g,
                                    " "
                                  )}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(transaction.created_at)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p
                              className={`text-sm font-medium ${getTransactionColor(
                                transaction.transaction_type
                              )}`}
                            >
                              {transaction.points_type === "betting" ? (
                                <span className="flex items-center gap-1">
                                  {transaction.transaction_type ===
                                  "bet_placed" ? (
                                    <ArrowDownRight className="h-3 w-3" />
                                  ) : (
                                    <ArrowUpRight className="h-3 w-3" />
                                  )}
                                  {transaction.points_amount}
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  {transaction.transaction_type ===
                                  "stream_points_redeemed" ? (
                                    <ArrowDownRight className="h-3 w-3" />
                                  ) : (
                                    <ArrowUpRight className="h-3 w-3" />
                                  )}
                                  {transaction.points_amount}
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {transaction.points_type} points
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Coins className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        No transactions yet
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Start by purchasing some betting points!
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Packages Tab */}
          <TabsContent value="packages" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Available Point Packages
                </CardTitle>
                <p className="text-muted-foreground">
                  Choose a package to purchase betting points
                </p>
              </CardHeader>
              <CardContent>
                {packagesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {packages.map((pkg) => (
                      <motion.div
                        key={pkg.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Card className="relative overflow-hidden">
                          {pkg.is_featured && (
                            <div className="absolute top-0 right-0 bg-yellow-500 text-white text-xs px-2 py-1 rounded-bl-lg">
                              <Star className="h-3 w-3 inline mr-1" />
                              Featured
                            </div>
                          )}
                          <CardContent className="p-6">
                            <div className="text-center space-y-4">
                              <div>
                                <h3 className="text-xl font-bold text-foreground">
                                  {pkg.name}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  Point Package
                                </p>
                              </div>

                              <div>
                                <div className="text-3xl font-bold text-foreground">
                                  {pkg.betting_points}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Betting Points
                                </div>
                              </div>

                              {pkg.bonus_points > 0 && (
                                <Badge
                                  variant="outline"
                                  className="bg-green-50 text-green-700 border-green-200"
                                >
                                  +{pkg.bonus_points} Bonus Points
                                </Badge>
                              )}

                              <div>
                                <div className="text-2xl font-bold text-foreground">
                                  €{pkg.price_eur}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  One-time payment
                                </div>
                              </div>

                              <Button
                                onClick={() => setShowPurchaseModal(true)}
                                className="w-full"
                                size="lg"
                              >
                                <CreditCard className="h-4 w-4 mr-2" />
                                Purchase Package
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Transaction History
                </CardTitle>
                <p className="text-muted-foreground">
                  View all your point transactions
                </p>
              </CardHeader>
              <CardContent>
                {transactionsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : transactions.length > 0 ? (
                  <div className="space-y-3">
                    {transactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-4 bg-muted rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          {getTransactionIcon(transaction.transaction_type)}
                          <div>
                            <p className="font-medium text-foreground">
                              {transaction.description ||
                                transaction.transaction_type.replace(/_/g, " ")}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(transaction.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p
                            className={`font-medium ${getTransactionColor(
                              transaction.transaction_type
                            )}`}
                          >
                            {transaction.transaction_type === "bet_placed" ||
                            transaction.transaction_type ===
                              "stream_points_redeemed" ? (
                              <span className="flex items-center gap-1">
                                <ArrowDownRight className="h-4 w-4" />-
                                {transaction.points_amount}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <ArrowUpRight className="h-4 w-4" />+
                                {transaction.points_amount}
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {transaction.points_type} points
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Balance: {transaction.balance_after}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <History className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground text-lg">
                      No transactions yet
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Start by purchasing some betting points to see your
                      transaction history
                    </p>
                    <Button
                      onClick={() => setShowPurchaseModal(true)}
                      className="mt-4"
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Buy Points
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Purchase Modal */}
      <EnhancedPointPurchaseModal
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        onSuccess={() => {
          setShowPurchaseModal(false);
        }}
      />
    </div>
  );
}
