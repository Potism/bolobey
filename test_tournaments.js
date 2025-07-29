const { createClient } = require("@supabase/supabase-js");

// Load environment variables
require("dotenv").config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTournaments() {
  console.log("🔍 Testing tournaments access...\n");

  try {
    // Test 1: Check if we can connect to tournaments table
    console.log("1️⃣ Testing basic connection...");
    const { data: tournaments, error } = await supabase
      .from("tournaments")
      .select("*")
      .limit(5);

    if (error) {
      console.error("❌ Error fetching tournaments:", error);
      return;
    }

    console.log(`✅ Found ${tournaments.length} tournaments`);

    if (tournaments.length > 0) {
      console.log("\n📋 Tournaments found:");
      tournaments.forEach((tournament, index) => {
        console.log(
          `   ${index + 1}. ${tournament.name} (${tournament.status})`
        );
      });
    } else {
      console.log("\n📭 No tournaments found in database");
    }

    // Test 2: Check if we can insert a test tournament
    console.log("\n2️⃣ Testing tournament creation...");
    const testTournament = {
      name: "Test Tournament",
      description: "This is a test tournament",
      format: "single_elimination",
      max_participants: 8,
      start_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      registration_deadline: new Date(
        Date.now() + 12 * 60 * 60 * 1000
      ).toISOString(), // 12 hours from now
      status: "open",
      created_by: "00000000-0000-0000-0000-000000000000", // Dummy user ID
    };

    const { data: newTournament, error: insertError } = await supabase
      .from("tournaments")
      .insert(testTournament)
      .select()
      .single();

    if (insertError) {
      console.error("❌ Error creating test tournament:", insertError);
    } else {
      console.log("✅ Test tournament created successfully");
      console.log(`   ID: ${newTournament.id}`);
      console.log(`   Name: ${newTournament.name}`);

      // Clean up - delete the test tournament
      const { error: deleteError } = await supabase
        .from("tournaments")
        .delete()
        .eq("id", newTournament.id);

      if (deleteError) {
        console.error(
          "⚠️ Warning: Could not delete test tournament:",
          deleteError
        );
      } else {
        console.log("🧹 Test tournament cleaned up");
      }
    }

    // Test 3: Check RLS policies
    console.log("\n3️⃣ Checking RLS policies...");
    const { data: policies, error: policiesError } = await supabase
      .rpc("get_rls_policies", { table_name: "tournaments" })
      .catch(() => ({ data: null, error: "Function not available" }));

    if (policiesError) {
      console.log("ℹ️ Could not check RLS policies (function not available)");
    } else {
      console.log("✅ RLS policies check completed");
    }
  } catch (error) {
    console.error("❌ Unexpected error:", error);
  }
}

testTournaments()
  .then(() => {
    console.log("\n🏁 Test completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });
