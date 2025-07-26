"use client";

import { Navigation } from "@/components/navigation";
import { PrizesCatalog } from "@/components/prizes-catalog";
import { ThemeToggle } from "@/components/theme-toggle";

export default function PrizesPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">🏆 Prizes</h1>
            <p className="text-muted-foreground mt-2">
              Redeem your stream points for amazing rewards!
            </p>
          </div>
          <ThemeToggle />
        </div>

        <PrizesCatalog />
      </div>
    </div>
  );
}
