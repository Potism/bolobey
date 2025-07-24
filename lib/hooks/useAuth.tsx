"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../supabase";
import { User } from "../types";

interface AuthContextType {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<{ error: Error | null }>;
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
        setSupabaseUser(session?.user ?? null);
        if (session?.user) {
          await fetchUserProfile(session.user.id);
        } else {
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
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching user profile:", error);

        // If user profile doesn't exist, try to create it from auth user data
        if (error.code === "PGRST116") {
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
              // Try to fetch the profile again
              const { data: newProfile } = await supabase
                .from("users")
                .select("*")
                .eq("id", userId)
                .single();

              if (newProfile) {
                setUser(newProfile);
              }
            }
          }
        }
      } else {
        setUser(data);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    } finally {
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
      return { error };
    } catch (error) {
      return { error: error as Error };
    } finally {
      setLoading(false);
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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          },
        },
      });

      if (error) {
        return { error };
      }

      // If signup was successful and we have a user, ensure profile is created
      if (data.user) {
        // Try to create user profile manually in case trigger fails
        const { error: profileError } = await supabase.from("users").upsert(
          {
            id: data.user.id,
            email: data.user.email!,
            display_name: displayName,
            role: "player",
          },
          {
            onConflict: "id",
          }
        );

        if (profileError) {
          console.warn("Failed to create user profile:", profileError);
          // Don't return error here as auth was successful
        }
      }

      return { error: null };
    } catch (error) {
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
    signIn,
    signUp,
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
