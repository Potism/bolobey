"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../supabase";
import { User } from "../types";

interface AuthContextType {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if Supabase is configured
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      console.log("Supabase not configured, skipping auth initialization");
      setLoading(false);
      return;
    }

    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      // Get initial session
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSupabaseUser(session?.user ?? null);
      if (session?.user) {
        await fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }

      // Listen for auth changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log("Auth state change:", event, session?.user?.id);
        setSupabaseUser(session?.user ?? null);
        if (session?.user) {
          console.log("User authenticated, fetching profile...");
          await fetchUserProfile(session.user.id);
        } else {
          console.log("No user session, setting user to null");
          setUser(null);
          setLoading(false);
        }
      });

      return () => subscription.unsubscribe();
    } catch (error) {
      console.error("Error initializing auth:", error);
      setLoading(false);
    }
  };

  const fetchUserProfile = async (userId: string) => {
    console.log("fetchUserProfile called with userId:", userId);
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      console.log("fetchUserProfile result:", { data, error });

      if (error) {
        console.error("Error fetching user profile:", error);

        // If user profile doesn't exist, try to create it from auth user data
        if (error.code === "PGRST116") {
          console.log("User profile not found, creating from auth data...");
          const { data: authUser } = await supabase.auth.getUser();
          if (authUser.user) {
            const { error: createError } = await supabase.from("users").insert({
              id: authUser.user.id,
              email: authUser.user.email!,
              display_name:
                authUser.user.user_metadata?.display_name ||
                authUser.user.email?.split("@")[0] ||
                "User",
              role: "player",
            });

            if (!createError) {
              console.log("User profile created successfully");
              // Try to fetch the profile again
              const { data: newProfile } = await supabase
                .from("users")
                .select("*")
                .eq("id", userId)
                .single();

              if (newProfile) {
                console.log("Setting user profile:", newProfile);
                setUser(newProfile);
              }
            } else {
              console.error("Error creating user profile:", createError);
            }
          }
        }
      } else {
        console.log("Setting user profile:", data);
        setUser(data);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    } finally {
      console.log("fetchUserProfile completed, setting loading to false");
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return { error: new Error("Supabase not configured") };
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // Don't set loading to false here - let the auth state change handler manage it
      // The auth state change will trigger fetchUserProfile which sets loading to false
      return { error };
    } catch (error) {
      setLoading(false); // Only set to false on error
      return { error: error as Error };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    displayName: string
  ) => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return { error: new Error("Supabase not configured") };
    }

    setLoading(true);
    try {
      console.log("useAuth: Starting clean signup process...", {
        email,
        displayName,
      });

      // Step 1: Create auth user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          },
        },
      });

      console.log("useAuth: Supabase auth.signUp result:", { data, error });

      if (error) {
        console.error("useAuth: Supabase auth error:", error);
        return { error };
      }

      // Step 2: If signup was successful and we have a user, create profile manually
      if (data.user) {
        console.log(
          "useAuth: User created, creating profile manually...",
          data.user.id
        );

        // Use our new safe function to create user profile and points
        const { error: createError } = await supabase.rpc(
          "create_user_profile_safe",
          {
            user_id: data.user.id,
            user_email: data.user.email!,
            display_name: displayName,
          }
        );

        if (createError) {
          console.warn("useAuth: Failed to create user profile:", createError);
          // Don't return error here as auth was successful
        } else {
          console.log("useAuth: User profile and points created successfully");
        }
      }

      console.log("useAuth: Clean signup process completed successfully");
      return { error: null };
    } catch (error) {
      console.error("useAuth: Unexpected error during signup:", error);
      return { error: error as Error };
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return { error: new Error("Supabase not configured") };
    }

    setLoading(true);
    try {
      console.log("useAuth: Starting Google sign-in...");

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error("useAuth: Google sign-in error:", error);
        return { error };
      }

      console.log("useAuth: Google sign-in initiated successfully");
      return { error: null };
    } catch (error) {
      console.error("useAuth: Unexpected error during Google sign-in:", error);
      return { error: error as Error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return;
    }

    setLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = user?.role === "admin";

  // Add timeout to prevent infinite loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        console.log("Auth loading timeout, setting loading to false");
        setLoading(false);
      }
    }, 5000); // 5 second timeout

    return () => clearTimeout(timer);
  }, [loading]);

  const value = {
    user,
    supabaseUser,
    loading,
    setUser,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    isAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
