// Test script to debug signup issues
// Run this with: node test_signup_debug.js

import { createClient } from "@supabase/supabase-js";

// Check environment variables
console.log("=== ENVIRONMENT CHECK ===");
console.log(
  "NEXT_PUBLIC_SUPABASE_URL:",
  process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ Set" : "❌ Missing"
);
console.log(
  "NEXT_PUBLIC_SUPABASE_ANON_KEY:",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✅ Set" : "❌ Missing"
);

if (
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
) {
  console.log("❌ Missing Supabase environment variables");
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testSignup() {
  console.log("\n=== TESTING SIGNUP ===");

  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = "testpassword123";
  const testDisplayName = "Test User";

  console.log("Test email:", testEmail);
  console.log("Test display name:", testDisplayName);

  try {
    // Test 1: Basic signup
    console.log("\n--- Test 1: Basic Signup ---");
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          display_name: testDisplayName,
        },
      },
    });

    if (error) {
      console.log("❌ Signup error:", error);
      console.log("Error code:", error.code);
      console.log("Error message:", error.message);
      return;
    }

    console.log("✅ Signup successful");
    console.log("User ID:", data.user?.id);
    console.log("User email:", data.user?.email);
    console.log("User metadata:", data.user?.user_metadata);

    // Test 2: Check if user profile was created
    console.log("\n--- Test 2: Check User Profile ---");
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("*")
      .eq("id", data.user.id)
      .single();

    if (profileError) {
      console.log("❌ Profile fetch error:", profileError);
    } else {
      console.log("✅ User profile found:", profile);
    }

    // Test 3: Check if user_points was created
    console.log("\n--- Test 3: Check User Points ---");
    const { data: points, error: pointsError } = await supabase
      .from("user_points")
      .select("*")
      .eq("user_id", data.user.id)
      .single();

    if (pointsError) {
      console.log("❌ Points fetch error:", pointsError);
    } else {
      console.log("✅ User points found:", points);
    }

    // Test 4: Clean up (delete test user)
    console.log("\n--- Test 4: Cleanup ---");
    try {
      // Delete from user_points first
      await supabase.from("user_points").delete().eq("user_id", data.user.id);

      // Delete from users
      await supabase.from("users").delete().eq("id", data.user.id);

      console.log("✅ Test user cleaned up");
    } catch (cleanupError) {
      console.log("⚠️ Cleanup warning:", cleanupError.message);
    }
  } catch (error) {
    console.log("❌ Unexpected error:", error);
  }
}

// Run the test
testSignup()
  .then(() => {
    console.log("\n=== TEST COMPLETED ===");
    process.exit(0);
  })
  .catch((error) => {
    console.log("❌ Test failed:", error);
    process.exit(1);
  });
