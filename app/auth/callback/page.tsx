"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Swords, ArrowLeft } from "lucide-react";

export default function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { setUser } = useAuth();

  useEffect(() => {
    handleAuthCallback();
  }, []);

  const handleAuthCallback = async () => {
    try {
      // Get the session from the URL
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error("Auth callback error:", error);
        setError("Authentication failed. Please try again.");
        return;
      }

      if (!session?.user) {
        console.log("No session found, redirecting to login");
        router.push("/auth/login");
        return;
      }

      console.log("Auth callback successful, user:", session.user.id);

      // Check if user profile exists
      const { error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (profileError && profileError.code === "PGRST116") {
        // User profile doesn't exist, create it
        console.log("Creating user profile for OAuth user...");

        const { error: createError } = await supabase.rpc(
          "create_user_profile_safe",
          {
            user_id: session.user.id,
            user_email: session.user.email!,
            display_name:
              session.user.user_metadata?.full_name ||
              session.user.user_metadata?.name ||
              session.user.email?.split("@")[0] ||
              "User",
          }
        );

        if (createError) {
          console.error("Failed to create user profile:", createError);
          setError("Failed to create user profile. Please contact support.");
          return;
        }

        console.log("User profile created successfully");
      } else if (profileError) {
        console.error("Error checking user profile:", profileError);
        setError("Error checking user profile. Please try again.");
        return;
      }

      // Fetch the complete user profile
      const { data: userProfile, error: fetchError } = await supabase
        .from("users")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (fetchError) {
        console.error("Error fetching user profile:", fetchError);
        setError("Error fetching user profile. Please try again.");
        return;
      }

      // Set user in context
      setUser(userProfile);

      // Redirect to dashboard or home page
      console.log("Auth callback completed, redirecting to dashboard");
      router.push("/");
    } catch (error) {
      console.error("Unexpected error in auth callback:", error);
      setError("An unexpected error occurred. Please try again.");
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 dark:to-muted/10 p-4">
        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="text-center mb-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 mb-6 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
            <div className="flex justify-center mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent">
                <Swords className="h-7 w-7 text-accent-foreground" />
              </div>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-red-600">
              Authentication Error
            </h1>
            <p className="text-muted-foreground mt-2">
              There was a problem with your authentication
            </p>
          </div>

          <Card className="border-0 shadow-lg dark:shadow-xl dark:shadow-black/10">
            <CardContent className="p-6">
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <div className="mt-4 text-center">
                <Link
                  href="/auth/login"
                  className="font-medium text-primary hover:underline"
                >
                  Return to Login
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 dark:to-muted/10 p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 mb-6 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <div className="flex justify-center mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent">
              <Swords className="h-7 w-7 text-accent-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Completing Sign In
          </h1>
          <p className="text-muted-foreground mt-2">
            Please wait while we set up your account...
          </p>
        </div>

        <Card className="border-0 shadow-lg dark:shadow-xl dark:shadow-black/10">
          <CardContent className="p-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
            <p className="text-sm text-muted-foreground">
              Setting up your profile and points...
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
