"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, UserCheck, UserX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SpectatorCount {
  active_spectators: number;
  authenticated_spectators: number;
  anonymous_spectators: number;
}

interface SpectatorCounterProps {
  spectatorCount: SpectatorCount;
  className?: string;
  showDetails?: boolean;
}

export function SpectatorCounter({
  spectatorCount,
  className = "",
  showDetails = false,
}: SpectatorCounterProps) {
  const { active_spectators, authenticated_spectators, anonymous_spectators } =
    spectatorCount;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Eye className="h-4 w-4 text-blue-500" />
          Live Spectators
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Main Count */}
        <div className="text-center">
          <motion.div
            key={active_spectators}
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="text-2xl font-bold text-blue-600"
          >
            {active_spectators}
          </motion.div>
          <p className="text-xs text-muted-foreground">watching now</p>
        </div>

        {/* Detailed Breakdown */}
        {showDetails && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2 pt-2 border-t"
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <UserCheck className="h-3 w-3 text-green-500" />
                  <span>Signed in</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {authenticated_spectators}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <UserX className="h-3 w-3 text-gray-500" />
                  <span>Anonymous</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {anonymous_spectators}
                </Badge>
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {/* Live Indicator */}
        <div className="flex items-center justify-center gap-1">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-muted-foreground">Live</span>
        </div>
      </CardContent>
    </Card>
  );
}
