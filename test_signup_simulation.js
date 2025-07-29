const { createClient } = require("@supabase/supabase-js");

// Your Supabase credentials
const supabaseUrl = "https://dajnapokhtsyrfobssut.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRham5hcG9raHRzeXJmb2Jzc3V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMDI1MDEsImV4cCI6MjA2ODg3ODUwMX0.xKlBioCt2dxXwYsGPb1qP1mkEoH0wdVibXspMMEqLIk";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSignupSimulation() {
  console.log("🔍 Testing Signup Simulation...\n");

  try {
    // Test 1: Check current user_points data
    console.log("=== TEST 1: Current user_points Data ===");
    const { data: currentPoints, error: pointsError } = await supabase
      .from("user_points")
      .select("*");

    if (pointsError) {
      console.log("❌ user_points query error:", pointsError.message);
    } else {
      console.log("✅ user_points query successful");
      console.log("   → Current records:", currentPoints.length);
      if (currentPoints.length > 0) {
        console.log("   → Sample record:", currentPoints[0]);
      }
    }
    console.log("");

    // Test 2: Check current users data
    console.log("=== TEST 2: Current users Data ===");
    const { data: currentUsers, error: usersError } = await supabase
      .from("users")
      .select("*");

    if (usersError) {
      console.log("❌ users query error:", usersError.message);
    } else {
      console.log("✅ users query successful");
      console.log("   → Current records:", currentUsers.length);
      if (currentUsers.length > 0) {
        console.log("   → Sample record:", currentUsers[0]);
      }
    }
    console.log("");

    // Test 3: Try to insert into user_points directly
    console.log("=== TEST 3: Direct user_points Insert Test ===");
    const testUserId = "11111111-1111-1111-1111-111111111111";

    const { data: insertData, error: insertError } = await supabase
      .from("user_points")
      .insert([
        {
          user_id: testUserId,
          betting_points: 50,
          stream_points: 0,
        },
      ])
      .select();

    if (insertError) {
      console.log("❌ Direct insert error:", insertError.message);

      if (insertError.message.includes("foreign key")) {
        console.log("   → Foreign key constraint - user does not exist");
      } else if (insertError.message.includes("does not exist")) {
        console.log("   → Table does not exist in this context");
      }
    } else {
      console.log("✅ Direct insert successful");
      console.log("   → Inserted data:", insertData);

      // Clean up
      await supabase.from("user_points").delete().eq("user_id", testUserId);
      console.log("   → Test data cleaned up");
    }
    console.log("");

    // Test 4: Check if there's a schema issue
    console.log("=== TEST 4: Schema Context Test ===");
    const { data: schemaTest, error: schemaError } = await supabase
      .from("user_points")
      .select("user_id, betting_points, stream_points")
      .limit(1);

    if (schemaError) {
      console.log("❌ Schema test error:", schemaError.message);
    } else {
      console.log("✅ Schema test successful");
      console.log("   → Columns accessible:", Object.keys(schemaTest[0] || {}));
    }
    console.log("");

    // Test 5: Try to simulate the exact signup error
    console.log("=== TEST 5: Simulate Signup Error ===");
    console.log("   → This would happen during auth.signUp()");
    console.log("   → The trigger function tries to access user_points");
    console.log("   → But the trigger runs in a different context");
    console.log("   → Let's check if the trigger function exists...");

    // Try to call the trigger function manually
    try {
      const { data: triggerTest, error: triggerError } = await supabase.rpc(
        "handle_new_user"
      );
      if (triggerError) {
        console.log("❌ Trigger function error:", triggerError.message);
      } else {
        console.log("✅ Trigger function accessible");
      }
    } catch (e) {
      console.log("❌ Cannot access trigger function:", e.message);
    }
  } catch (error) {
    console.error("❌ Unexpected error:", error.message);
  }
}

testSignupSimulation();
