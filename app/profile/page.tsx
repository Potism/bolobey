"use client";

import { Navigation } from "@/components/navigation";
import { UserProfileForm } from "@/components/user-profile-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">👤 Profile Settings</h1>
              <p className="text-muted-foreground mt-2">
                Manage your account and shipping information
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <UserProfileForm />
      </div>
    </div>
  );
}
