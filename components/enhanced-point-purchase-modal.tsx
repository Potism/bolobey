"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  CreditCard,
  Gift,
  TrendingUp,
  Star,
  Check,
  Crown,
  Zap,
  Shield,
  Sparkles,
  Euro,
  Target,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDualPoints } from "@/lib/hooks/useDualPoints";

interface EnhancedPointPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  className?: string;
}

export function EnhancedPointPurchaseModal({
  isOpen,
  onClose,
  onSuccess,
  className = "",
}: EnhancedPointPurchaseModalProps) {
  const {
    packages,
    packagesLoading,
    purchaseBettingPoints,
    userPoints,
    loading,
  } = useDualPoints();
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handlePurchase = async () => {
    if (!selectedPackage) return;

    setIsPurchasing(true);
    setError(null);

    try {
      const result = await purchaseBettingPoints(selectedPackage);

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onClose();
          onSuccess?.();
        }, 2000);
      } else {
        setError(result.error || "Purchase failed");
      }
    } catch {
      setError("Purchase failed. Please try again.");
    } finally {
      setIsPurchasing(false);
    }
  };

  const getPackageIcon = (packageName: string) => {
    if (packageName.includes("Starter")) return <Gift className="h-6 w-6" />;
    if (packageName.includes("Popular")) return <Star className="h-6 w-6" />;
    if (packageName.includes("Pro")) return <TrendingUp className="h-6 w-6" />;
    if (packageName.includes("Champion")) return <Crown className="h-6 w-6" />;
    if (packageName.includes("Elite")) return <Zap className="h-6 w-6" />;
    if (packageName.includes("Legendary"))
      return <Sparkles className="h-6 w-6" />;
    return <CreditCard className="h-6 w-6" />;
  };

  const getPackageGradient = (packageName: string) => {
    if (packageName.includes("Starter")) return "from-emerald-500 to-teal-600";
    if (packageName.includes("Popular")) return "from-blue-500 to-indigo-600";
    if (packageName.includes("Pro")) return "from-purple-500 to-violet-600";
    if (packageName.includes("Champion")) return "from-amber-500 to-orange-600";
    if (packageName.includes("Elite")) return "from-indigo-500 to-purple-600";
    if (packageName.includes("Legendary")) return "from-rose-500 to-pink-600";
    return "from-gray-500 to-gray-600";
  };

  const getPackageFeatures = (packageName: string) => {
    if (packageName.includes("Starter"))
      return ["Perfect for beginners", "Quick start", "Basic betting"];
    if (packageName.includes("Popular"))
      return ["Most popular choice", "Great value", "Popular among users"];
    if (packageName.includes("Pro"))
      return ["For serious players", "Advanced features", "Pro benefits"];
    if (packageName.includes("Champion"))
      return ["Champion level", "Premium features", "Exclusive benefits"];
    if (packageName.includes("Elite"))
      return ["Elite status", "VIP features", "Elite rewards"];
    if (packageName.includes("Legendary"))
      return ["Legendary status", "Ultimate features", "Legendary rewards"];
    return ["Standard package", "Good value", "Reliable choice"];
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${className}`}
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-background/80 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-6xl max-h-[95vh] overflow-y-auto bg-card rounded-2xl shadow-2xl border border-border"
        >
          {/* Header */}
          <div className="sticky top-0 z-20 bg-card/95 backdrop-blur-sm border-b border-border rounded-t-2xl">
            <div className="flex items-center justify-between p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-600 rounded-xl">
                  <CreditCard className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-card-foreground">
                    Purchase Betting Points
                  </h2>
                  <p className="text-muted-foreground mt-1">
                    Choose your package and start betting on matches!
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-10 w-10 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Current Balance */}
          {loading ? (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-8 bg-muted/50 border-b border-border"
            >
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-3 text-muted-foreground">
                    Loading points...
                  </span>
                </div>
              </div>
            </motion.div>
          ) : userPoints ? (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-8 bg-muted/50 border-b border-border"
            >
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-gradient-to-r from-purple-500 to-blue-600 rounded-xl shadow-lg">
                    <Target className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-card-foreground">
                      Your Current Balance
                    </h3>
                    <p className="text-muted-foreground">
                      Manage your betting and stream points
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Betting Points Card */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="relative group"
                  >
                    <Card className="bg-gradient-to-br from-green-600 to-emerald-700 border-green-500/30 hover:border-green-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/20">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="p-3 bg-white/20 rounded-xl shadow-md">
                              <Target className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">
                                Betting Points
                              </p>
                              <p className="text-xs text-green-100/70">
                                For placing bets
                              </p>
                            </div>
                          </div>
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        </div>
                        <div className="text-center">
                          <div className="text-4xl font-bold text-white mb-1">
                            {userPoints?.betting_points?.toLocaleString() ||
                              "0"}
                          </div>
                          <div className="text-sm text-green-100/80 font-medium">
                            Available for betting
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Stream Points Card */}
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="relative group"
                  >
                    <Card className="bg-gradient-to-br from-blue-600 to-cyan-700 border-blue-500/30 hover:border-blue-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="p-3 bg-white/20 rounded-xl shadow-md">
                              <Trophy className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">
                                Stream Points
                              </p>
                              <p className="text-xs text-blue-100/70">
                                For redeeming prizes
                              </p>
                            </div>
                          </div>
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        </div>
                        <div className="text-center">
                          <div className="text-4xl font-bold text-white mb-1">
                            {userPoints?.stream_points?.toLocaleString() || "0"}
                          </div>
                          <div className="text-sm text-blue-100/80 font-medium">
                            Ready to redeem
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Total Earned Card */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="relative group"
                  >
                    <Card className="bg-gradient-to-br from-purple-600 to-fuchsia-700 border-purple-500/30 hover:border-purple-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="p-3 bg-white/20 rounded-xl shadow-md">
                              <TrendingUp className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">
                                Total Earned
                              </p>
                              <p className="text-xs text-purple-100/70">
                                Lifetime achievement
                              </p>
                            </div>
                          </div>
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        </div>
                        <div className="text-center">
                          <div className="text-4xl font-bold text-white mb-1">
                            {userPoints?.stream_points?.toLocaleString() || "0"}
                          </div>
                          <div className="text-sm text-purple-100/80 font-medium">
                            Stream Points earned
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                {/* Quick Stats */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mt-6 p-4 bg-card rounded-xl border border-border"
                >
                  <div className="flex items-center justify-center gap-8 text-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Win Rate</p>
                      <p className="text-lg font-bold text-card-foreground">
                        {userPoints?.stream_points > 0 ? 100 : 0}%
                      </p>
                    </div>
                    <div className="w-px h-8 bg-border"></div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Active Balance
                      </p>
                      <p className="text-lg font-bold text-card-foreground">
                        {(userPoints?.betting_points || 0) +
                          (userPoints?.stream_points || 0)}
                      </p>
                    </div>
                    <div className="w-px h-8 bg-border"></div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Ready to Bet
                      </p>
                      <p className="text-lg font-bold text-card-foreground">
                        {userPoints?.betting_points > 0 ? "Yes" : "No"}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          ) : null}

          {/* Content */}
          <div className="p-6">
            {packagesLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  <p className="text-muted-foreground">Loading packages...</p>
                </div>
              </div>
            ) : (
              <>
                {/* How it works */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="mb-8"
                >
                  <Card className="bg-muted/50 border-border shadow-xl">
                    <CardContent className="p-8">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-primary/20 rounded-lg">
                          <TrendingUp className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold text-card-foreground">
                          How the Dual-Point System Works
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="flex items-start gap-4">
                          <div className="w-8 h-8 bg-green-400 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                            <span className="text-green-900 font-bold text-sm">
                              1
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-card-foreground mb-2">
                              Buy Betting Points
                            </p>
                            <p className="text-muted-foreground text-sm leading-relaxed">
                              Purchase betting points with real money to
                              participate in matches and tournaments
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-4">
                          <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                            <span className="text-blue-900 font-bold text-sm">
                              2
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-card-foreground mb-2">
                              Win Stream Points
                            </p>
                            <p className="text-muted-foreground text-sm leading-relaxed">
                              Earn stream points when you win bets on matches
                              and tournaments
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-4">
                          <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                            <span className="text-yellow-900 font-bold text-sm">
                              3
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-card-foreground mb-2">
                              Redeem for Prizes
                            </p>
                            <p className="text-muted-foreground text-sm leading-relaxed">
                              Exchange stream points for real prizes, rewards,
                              and exclusive items
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Point Packages */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-6 relative z-10"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-card-foreground">
                      Choose Your Package
                    </h3>
                    <Badge
                      variant="outline"
                      className="bg-green-900/20 text-green-400 border-green-600/50"
                    >
                      <Shield className="h-3 w-3 mr-1" />
                      Secure Payment
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {packages.map((pkg, index) => (
                      <motion.div
                        key={pkg.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * index }}
                        whileHover={{ scale: 1.02, y: -5 }}
                        whileTap={{ scale: 0.98 }}
                        className="relative z-10"
                      >
                        <Card
                          className={`cursor-pointer transition-all duration-300 relative overflow-hidden ${
                            selectedPackage === pkg.id
                              ? "ring-2 ring-primary shadow-xl scale-105 bg-card z-20"
                              : "hover:shadow-lg hover:border-border bg-card z-10"
                          } border-border`}
                          onClick={() => setSelectedPackage(pkg.id)}
                        >
                          {/* Background gradient */}
                          <div
                            className={`absolute inset-0 bg-gradient-to-br ${getPackageGradient(
                              pkg.name
                            )} opacity-5`}
                          />

                          {/* Featured badge */}
                          {pkg.is_featured && (
                            <div className="absolute top-4 right-4 z-30">
                              <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0">
                                <Star className="h-3 w-3 mr-1" />
                                Featured
                              </Badge>
                            </div>
                          )}

                          <CardHeader className="pb-4 relative z-10">
                            <div className="flex items-center gap-3">
                              <div
                                className={`p-3 bg-gradient-to-r ${getPackageGradient(
                                  pkg.name
                                )} rounded-xl`}
                              >
                                {getPackageIcon(pkg.name)}
                              </div>
                              <div>
                                <CardTitle className="text-lg text-card-foreground">
                                  {pkg.name}
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">
                                  Point Package
                                </p>
                              </div>
                            </div>
                          </CardHeader>

                          <CardContent className="space-y-4 relative z-10">
                            {/* Points display */}
                            <div className="text-center">
                              <div className="text-4xl font-bold text-card-foreground mb-1">
                                {pkg.betting_points.toLocaleString()}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Betting Points
                              </div>
                            </div>

                            {/* Bonus points */}
                            {pkg.bonus_points > 0 && (
                              <div className="text-center">
                                <Badge
                                  variant="outline"
                                  className="bg-green-900/20 text-green-400 border-green-600/50 px-3 py-1"
                                >
                                  <Sparkles className="h-3 w-3 mr-1" />+
                                  {pkg.bonus_points.toLocaleString()} Bonus
                                  Points
                                </Badge>
                              </div>
                            )}

                            {/* Price */}
                            <div className="text-center">
                              <div className="flex items-center justify-center gap-2 mb-1">
                                <Euro className="h-5 w-5 text-muted-foreground" />
                                <div className="text-3xl font-bold text-card-foreground">
                                  {pkg.price_eur}
                                </div>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                One-time payment
                              </div>
                            </div>

                            {/* Features */}
                            <div className="space-y-2">
                              {getPackageFeatures(pkg.name).map(
                                (feature, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-2 text-sm"
                                  >
                                    <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                                    <span className="text-muted-foreground">
                                      {feature}
                                    </span>
                                  </div>
                                )
                              )}
                            </div>

                            {/* Selection indicator */}
                            <div className="flex items-center justify-center pt-2">
                              {selectedPackage === pkg.id ? (
                                <div className="flex items-center gap-2 text-primary font-medium">
                                  <Check className="h-4 w-4" />
                                  <span>Selected</span>
                                </div>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPackage(pkg.id);
                                  }}
                                >
                                  Select Package
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* Error Message */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl"
                    >
                      <p className="text-destructive text-sm flex items-center gap-2">
                        <X className="h-4 w-4" />
                        {error}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Success Message */}
                <AnimatePresence>
                  {success && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mt-6 p-4 bg-green-900/20 border border-green-700/50 rounded-xl"
                    >
                      <p className="text-green-400 text-sm flex items-center gap-2">
                        <Check className="h-4 w-4" />
                        Points purchased successfully! You can now start
                        betting.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Action Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center justify-between mt-8 pt-6 border-t border-border"
                >
                  <Button
                    variant="outline"
                    onClick={onClose}
                    size="lg"
                    className="border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handlePurchase}
                    disabled={!selectedPackage || isPurchasing}
                    size="lg"
                    className={`bg-gradient-to-r ${
                      selectedPackage
                        ? getPackageGradient(
                            packages.find((p) => p.id === selectedPackage)
                              ?.name || ""
                          )
                        : "from-muted to-muted-foreground/20"
                    } text-white font-semibold px-8 py-3 hover:shadow-lg hover:shadow-primary/20`}
                  >
                    {isPurchasing ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Processing...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Purchase for €
                        {selectedPackage
                          ? packages.find((p) => p.id === selectedPackage)
                              ?.price_eur
                          : 0}
                      </div>
                    )}
                  </Button>
                </motion.div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
