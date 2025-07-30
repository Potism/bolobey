// Test Supabase connection and leaderboard views
const { createClient } = require("@supabase/supabase-js");

// Use the same environment variables as the frontend
const supabaseUrl = "https://dajnapokhtsyrfobssut.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRham5hcG9raHRzeXJmb2Jzc3V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMDI1MDEsImV4cCI6MjA2ODg3ODUwMX0.xKlBioCt2dxXwYsGPb1qP1mkEoH0wdVibXspMMEqLIk";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log("🔍 Testing Supabase connection...");

  try {
    // Test 1: Basic connection
    console.log("\n1. Testing basic connection...");
    const { data: testData, error: testError } = await supabase
      .from("users")
      .select("id, display_name")
      .limit(1);

    if (testError) {
      console.error("❌ Basic connection failed:", testError);
      return;
    }
    console.log("✅ Basic connection successful:", testData);

    // Test 2: Tournaments with joins
    console.log("\n2. Testing tournaments with joins...");
    const { data: tournaments, error: tournamentsError } = await supabase
      .from("tournaments")
      .select(
        `
        *,
        created_by_user:users!tournaments_created_by_fkey(id, display_name),
        winner:users!tournaments_winner_id_fkey(id, display_name)
      `
      )
      .limit(3);

    if (tournamentsError) {
      console.error("❌ Tournaments join failed:", tournamentsError);
    } else {
      console.log("✅ Tournaments join successful:", tournaments);
    }

    // Test 3: Player stats view
    console.log("\n3. Testing player_stats view...");
    const { data: playerStats, error: playerStatsError } = await supabase
      .from("player_stats")
      .select("*")
      .limit(5);

    if (playerStatsError) {
      console.error("❌ Player stats view failed:", playerStatsError);
    } else {
      console.log("✅ Player stats view successful:", playerStats);
    }

    // Test 4: Simple player stats view
    console.log("\n4. Testing simple_player_stats view...");
    const { data: simpleStats, error: simpleStatsError } = await supabase
      .from("simple_player_stats")
      .select("*")
      .limit(5);

    if (simpleStatsError) {
      console.error("❌ Simple player stats view failed:", simpleStatsError);
    } else {
      console.log("✅ Simple player stats view successful:", simpleStats);
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testConnection();
