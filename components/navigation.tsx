"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Swords, Plus, User, LogOut, Menu, Gift } from "lucide-react";
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

export function Navigation() {
  const { user, isAdmin, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    setMobileMenuOpen(false);
  };

  const handleMobileLinkClick = () => {
    setMobileMenuOpen(false);
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
                href="/demo-tournament"
                className="text-sm font-medium text-foreground/60 transition-colors hover:text-foreground"
              >
                V2 Demo
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
          </div>

          {/* Desktop User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            <ThemeToggle />
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
                  <DropdownMenuContent className="w-56" align="end">
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
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="h-10 w-10 p-0">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-[300px] sm:w-[400px] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-l shadow-xl"
              >
                <SheetHeader>
                  <SheetTitle className="text-left">Menu</SheetTitle>
                </SheetHeader>
                <div className="mt-6 flex flex-col space-y-4 px-4">
                  {/* Theme Toggle */}
                  <div className="flex justify-center pb-4 border-b border-border/50">
                    <ThemeToggle />
                  </div>
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
