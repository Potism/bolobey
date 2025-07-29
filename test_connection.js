const { createClient } = require("@supabase/supabase-js");

// Your Supabase credentials from .env
const supabaseUrl = "https://dajnapokhtsyrfobssut.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRham5hcG9raHRzeXJmb2Jzc3V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMDI1MDEsImV4cCI6MjA2ODg3ODUwMX0.xKlBioCt2dxXwYsGPb1qP1mkEoH0wdVibXspMMEqLIk";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log("🔍 Testing Supabase Connection...\n");

  try {
    // Test 1: Basic connection
    console.log("=== TEST 1: Basic Connection ===");
    const { error: testError } = await supabase
      .from("users")
      .select("count")
      .limit(1);

    if (testError) {
      console.log("❌ Connection failed:", testError.message);
      return;
    }
    console.log("✅ Connection successful!\n");

    // Test 2: Check if user_points table exists
    console.log("=== TEST 2: Check user_points table ===");
    const { error: userPointsError } = await supabase
      .from("user_points")
      .select("count")
      .limit(1);

    if (userPointsError) {
      console.log("❌ user_points table error:", userPointsError.message);
      if (userPointsError.message.includes("does not exist")) {
        console.log("   → user_points table DOES NOT EXIST");
      }
    } else {
      console.log("✅ user_points table EXISTS");
    }
    console.log("");

    // Test 3: Check users table
    console.log("=== TEST 3: Check users table ===");
    const { error: usersError } = await supabase
      .from("users")
      .select("count")
      .limit(1);

    if (usersError) {
      console.log("❌ users table error:", usersError.message);
    } else {
      console.log("✅ users table EXISTS");
    }
    console.log("");

    // Test 4: Try to create a test user_points entry
    console.log("=== TEST 4: Test user_points creation ===");
    const testUserId = "00000000-0000-0000-0000-000000000000";
    const { error: insertError } = await supabase
      .from("user_points")
      .insert([
        {
          user_id: testUserId,
          betting_points: 0,
          stream_points: 0,
        },
      ])
      .select();

    if (insertError) {
      console.log("❌ Cannot insert into user_points:", insertError.message);
    } else {
      console.log("✅ Can insert into user_points");
      // Clean up test data
      await supabase.from("user_points").delete().eq("user_id", testUserId);
    }
  } catch (error) {
    console.error("❌ Unexpected error:", error.message);
  }
}

testConnection();
