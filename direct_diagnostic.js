const { createClient } = require("@supabase/supabase-js");

// Your Supabase credentials
const supabaseUrl = "https://dajnapokhtsyrfobssut.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRham5hcG9raHRzeXJmb2Jzc3V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMDI1MDEsImV4cCI6MjA2ODg3ODUwMX0.xKlBioCt2dxXwYsGPb1qP1mkEoH0wdVibXspMMEqLIk";

const supabase = createClient(supabaseUrl, supabaseKey);

async function runDiagnostic() {
  console.log("🔍 Running Direct Database Diagnostic...\n");

  try {
    // Test 1: Check if we can run raw SQL
    console.log("=== TEST 1: Raw SQL Access ===");
    const { data: sqlTest, error: sqlError } = await supabase.rpc("sql", {
      query:
        "SELECT current_database() as db_name, current_user as current_user",
    });

    if (sqlError) {
      console.log("❌ Cannot run raw SQL:", sqlError.message);
      console.log("   → Trying alternative approach...\n");
    } else {
      console.log("✅ Can run raw SQL:", sqlTest);
    }

    // Test 2: Check user_points table structure
    console.log("=== TEST 2: user_points Table Structure ===");
    const { data: userPointsData, error: userPointsError } = await supabase
      .from("user_points")
      .select("*")
      .limit(1);

    if (userPointsError) {
      console.log("❌ user_points table error:", userPointsError.message);

      if (userPointsError.message.includes("does not exist")) {
        console.log("   → user_points table DOES NOT EXIST");
        console.log("   → This is the root cause of the signup error!");
      }
    } else {
      console.log("✅ user_points table EXISTS and accessible");
      console.log(
        "   → Sample data structure:",
        Object.keys(userPointsData[0] || {})
      );
    }
    console.log("");

    // Test 3: Check users table structure
    console.log("=== TEST 3: users Table Structure ===");
    const { data: usersData, error: usersError } = await supabase
      .from("users")
      .select("*")
      .limit(1);

    if (usersError) {
      console.log("❌ users table error:", usersError.message);
    } else {
      console.log("✅ users table EXISTS and accessible");
      console.log(
        "   → Sample data structure:",
        Object.keys(usersData[0] || {})
      );
    }
    console.log("");

    // Test 4: Check if handle_new_user function exists
    console.log("=== TEST 4: Check Functions ===");
    try {
      const { data: funcTest, error: funcError } = await supabase.rpc("sql", {
        query: "SELECT proname FROM pg_proc WHERE proname = 'handle_new_user'",
      });

      if (funcError) {
        console.log("❌ Cannot check functions:", funcError.message);
      } else {
        console.log("✅ handle_new_user function check:", funcTest);
      }
    } catch (e) {
      console.log("❌ Function check failed:", e.message);
    }
    console.log("");

    // Test 5: Try to create user_points table if it doesn't exist
    console.log("=== TEST 5: Attempt to Create user_points Table ===");
    try {
      const { data: createResult, error: createError } = await supabase.rpc(
        "sql",
        {
          query: `
          CREATE TABLE IF NOT EXISTS public.user_points (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
            betting_points INTEGER DEFAULT 0,
            stream_points INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id)
          );
        `,
        }
      );

      if (createError) {
        console.log("❌ Cannot create user_points table:", createError.message);
      } else {
        console.log("✅ user_points table created or already exists");
      }
    } catch (e) {
      console.log("❌ Table creation failed:", e.message);
    }
  } catch (error) {
    console.error("❌ Unexpected error:", error.message);
  }
}

runDiagnostic();
