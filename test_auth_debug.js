const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAuth() {
  console.log("🔍 Testing Supabase connection...");

  try {
    // Test basic connection
    const { data, error } = await supabase
      .from("users")
      .select("count")
      .limit(1);
    if (error) {
      console.error("❌ Database connection error:", error);
      return;
    }
    console.log("✅ Database connection successful");

    // Test auth session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    if (sessionError) {
      console.error("❌ Session error:", sessionError);
      return;
    }

    console.log("📊 Current session:", session ? "Active" : "None");
    if (session) {
      console.log("👤 User ID:", session.user.id);
      console.log("📧 Email:", session.user.email);
    }

    // Test users table
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, display_name, email")
      .limit(5);

    if (usersError) {
      console.error("❌ Users table error:", usersError);
      return;
    }

    console.log("👥 Users in database:", users.length);
    users.forEach((user) => {
      console.log(`  - ${user.display_name} (${user.email})`);
    });

    // Test user_points table
    const { data: userPoints, error: pointsError } = await supabase
      .from("user_points")
      .select("user_id, betting_points, stream_points")
      .limit(5);

    if (pointsError) {
      console.error("❌ User points table error:", pointsError);
    } else {
      console.log("💰 User points entries:", userPoints.length);
    }
  } catch (error) {
    console.error("❌ Unexpected error:", error);
  }
}

testAuth();
