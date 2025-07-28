"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Swords,
  Plus,
  User,
  LogOut,
  Menu,
  Gift,
  BarChart3,
} from "lucide-react";
import { EnhancedNotifications } from "@/components/enhanced-notifications";
import { UserPointsDisplay } from "@/components/user-points-display";
import { motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useDualPoints } from "@/lib/hooks/useDualPoints";

export function Navigation() {
  const { user, signOut } = useAuth();
  const { forceRefresh } = useDualPoints();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isAdmin = user?.role === "admin";

  const handleSignOut = async () => {
    await signOut();
  };

  const handleRefreshPoints = async () => {
    await forceRefresh();
  };

  const handleMobileLinkClick = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <motion.div
              className="flex h-10 w-10 items-center justify-center rounded-lg gradient-beyblade"
              whileHover={{ scale: 1.05, rotate: 5 }}
              transition={{ duration: 0.3 }}
            >
              <Swords className="h-6 w-6 text-white" />
            </motion.div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight">Bolobey</span>
              <span className="text-xs text-muted-foreground">
                Tournament System
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-6">
            <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
              <Link
                href="/tournaments"
                className="text-sm font-medium text-foreground/60 transition-colors hover:text-foreground"
              >
                Tournaments
              </Link>
            </motion.div>
            <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
              <Link
                href="/leaderboard"
                className="text-sm font-medium text-foreground/60 transition-colors hover:text-foreground"
              >
                Leaderboard
              </Link>
            </motion.div>
            <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
              <Link
                href="/prizes"
                className="text-sm font-medium text-foreground/60 transition-colors hover:text-foreground flex items-center gap-1"
              >
                <Gift className="h-4 w-4" />
                Prizes
              </Link>
            </motion.div>
            <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
              <Link
                href="/how-it-works"
                className="text-sm font-medium text-foreground/60 transition-colors hover:text-foreground flex items-center gap-1"
              >
                <BarChart3 className="h-4 w-4" />
                How It Works
              </Link>
            </motion.div>
          </div>

          {/* Desktop User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            <ThemeToggle />
            {user && <EnhancedNotifications />}
            {user && <UserPointsDisplay variant="compact" />}
            {user ? (
              <div className="flex items-center space-x-3">
                {isAdmin && (
                  <Button asChild size="sm">
                    <Link href="/tournaments/create">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Tournament
                    </Link>
                  </Button>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-10 w-10 rounded-full"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="text-sm">
                          {user.display_name?.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-64" align="end">
                    <div className="flex items-center justify-start gap-2 p-2">
                      <div className="flex flex-col space-y-1 leading-none">
                        <p className="font-medium">{user.display_name}</p>
                        <p className="w-[200px] truncate text-sm text-muted-foreground">
                          {user.email}
                        </p>
                        {isAdmin && (
                          <Badge variant="secondary" className="w-fit text-xs">
                            Admin
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Points Display */}
                    <div className="px-2 py-2 border-t border-border/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-muted-foreground">
                          Points
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleRefreshPoints}
                          className="h-6 w-6 p-0"
                          title="Refresh points"
                        >
                          <svg
                            className="h-3 w-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                          </svg>
                        </Button>
                      </div>
                      <UserPointsDisplay variant="detailed" />
                    </div>

                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/profile">
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    {isAdmin && (
                      <DropdownMenuItem asChild>
                        <Link href="/admin/prizes">
                          <Gift className="mr-2 h-4 w-4" />
                          Manage Prizes
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Button variant="ghost" asChild>
                  <Link href="/auth/login">Sign In</Link>
                </Button>
                <Button asChild>
                  <Link href="/auth/signup">Sign Up</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="h-10 w-10 p-0">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-[300px] sm:w-[400px] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-l shadow-xl max-h-screen overflow-y-auto"
              >
                <SheetHeader>
                  <SheetTitle className="text-left">Menu</SheetTitle>
                </SheetHeader>
                <div className="mt-6 flex flex-col space-y-4 px-4 pb-8">
                  {/* Theme Toggle */}
                  <div className="flex justify-center pb-4 border-b border-border/50">
                    <ThemeToggle />
                  </div>

                  {/* Notifications */}
                  {user && (
                    <div className="flex justify-center pb-4 border-b border-border/50">
                      <EnhancedNotifications />
                    </div>
                  )}

                  {/* Mobile Points Display */}
                  {user && (
                    <div className="flex justify-center pb-4 border-b border-border/50">
                      <UserPointsDisplay variant="compact" />
                    </div>
                  )}
                  {/* Mobile Navigation Links */}
                  <div className="flex flex-col space-y-2">
                    <Link
                      href="/tournaments"
                      className="flex items-center px-3 py-3 text-sm font-medium text-foreground/80 transition-colors hover:text-foreground hover:bg-muted/50 rounded-lg"
                      onClick={handleMobileLinkClick}
                    >
                      Tournaments
                    </Link>
                    <Link
                      href="/leaderboard"
                      className="flex items-center px-3 py-3 text-sm font-medium text-foreground/80 transition-colors hover:text-foreground hover:bg-muted/50 rounded-lg"
                      onClick={handleMobileLinkClick}
                    >
                      Leaderboard
                    </Link>
                  </div>
                  <div>
                    <Link
                      href="/prizes"
                      className="flex items-center px-3 py-3 text-sm font-medium text-foreground/80 transition-colors hover:text-foreground hover:bg-muted/50 rounded-lg"
                      onClick={handleMobileLinkClick}
                    >
                      <Gift className="mr-3 h-4 w-4" />
                      Prizes
                    </Link>
                    <Link
                      href="/how-it-works"
                      className="flex items-center px-3 py-3 text-sm font-medium text-foreground/80 transition-colors hover:text-foreground hover:bg-muted/50 rounded-lg"
                      onClick={handleMobileLinkClick}
                    >
                      <BarChart3 className="mr-3 h-4 w-4" />
                      How It Works
                    </Link>
                  </div>

                  {/* Mobile User Section */}
                  {user ? (
                    <div className="space-y-4">
                      <div className="border-t border-border/50 pt-4">
                        <div className="flex items-center space-x-3 px-3 py-3 bg-muted/30 rounded-lg">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="text-sm">
                              {user.display_name?.charAt(0).toUpperCase() ||
                                "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <p className="font-medium">{user.display_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {user.email}
                            </p>
                            {isAdmin && (
                              <Badge
                                variant="secondary"
                                className="w-fit text-xs mt-1"
                              >
                                Admin
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Mobile Points Display */}
                        <div className="mt-3 px-3 py-3 bg-muted/20 rounded-lg">
                          <UserPointsDisplay variant="detailed" />
                        </div>
                      </div>

                      <div className="flex flex-col space-y-2">
                        {isAdmin && (
                          <Button
                            asChild
                            className="justify-start"
                            variant="ghost"
                          >
                            <Link
                              href="/tournaments/create"
                              onClick={handleMobileLinkClick}
                            >
                              <Plus className="mr-3 h-4 w-4" />
                              Create Tournament
                            </Link>
                          </Button>
                        )}
                        {isAdmin && (
                          <Button
                            asChild
                            className="justify-start"
                            variant="ghost"
                          >
                            <Link
                              href="/admin/prizes"
                              onClick={handleMobileLinkClick}
                            >
                              <Gift className="mr-3 h-4 w-4" />
                              Manage Prizes
                            </Link>
                          </Button>
                        )}
                        <Button
                          asChild
                          className="justify-start"
                          variant="ghost"
                        >
                          <Link href="/profile" onClick={handleMobileLinkClick}>
                            <User className="mr-3 h-4 w-4" />
                            Profile
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          className="justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                          onClick={handleSignOut}
                        >
                          <LogOut className="mr-3 h-4 w-4" />
                          Sign out
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-t pt-4 space-y-3">
                      <Button asChild className="w-full">
                        <Link
                          href="/auth/signup"
                          onClick={handleMobileLinkClick}
                        >
                          Sign Up
                        </Link>
                      </Button>
                      <Button asChild variant="outline" className="w-full">
                        <Link
                          href="/auth/login"
                          onClick={handleMobileLinkClick}
                        >
                          Sign In
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
