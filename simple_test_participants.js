const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Read .env file manually
function loadEnv() {
  const envPath = path.join(__dirname, ".env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    const lines = envContent.split("\n");
    lines.forEach((line) => {
      const [key, value] = line.split("=");
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    });
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase environment variables");
  console.log(
    "Available env vars:",
    Object.keys(process.env).filter((k) => k.includes("SUPABASE"))
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTournamentParticipants() {
  const tournamentId = "eff49c0e-7e49-435d-b0da-f3a6fdb10ffa";

  console.log("🔍 Testing tournament participants for:", tournamentId);

  try {
    // 1. Check the tournament exists
    const { data: tournament, error: tournamentError } = await supabase
      .from("tournaments")
      .select("*")
      .eq("id", tournamentId)
      .single();

    if (tournamentError) {
      console.error("❌ Tournament not found:", tournamentError);
      return;
    }

    console.log("✅ Tournament found:", tournament.name);

    // 2. Check participants
    const { data: participants, error: participantsError } = await supabase
      .from("tournament_participants")
      .select("*")
      .eq("tournament_id", tournamentId);

    if (participantsError) {
      console.error("❌ Error fetching participants:", participantsError);
      return;
    }

    console.log("👥 Participants found:", participants.length);
    participants.forEach((p) => {
      console.log(
        `  - Participant ID: ${p.id}, User ID: ${p.user_id}, Seed: ${p.seed}`
      );
    });

    // 3. Check if users exist for these participants
    if (participants.length > 0) {
      const userIds = participants.map((p) => p.user_id);
      console.log("🔍 Checking users for IDs:", userIds);

      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, display_name, email, created_at")
        .in("id", userIds);

      if (usersError) {
        console.error("❌ Error fetching users:", usersError);
        return;
      }

      console.log("👤 Users found:", users.length);
      users.forEach((u) => {
        console.log(
          `  - User ID: ${u.id}, Name: ${u.display_name}, Email: ${u.email}`
        );
      });

      // 4. Check which participants don't have users
      const foundUserIds = users.map((u) => u.id);
      const missingUserIds = userIds.filter((id) => !foundUserIds.includes(id));

      if (missingUserIds.length > 0) {
        console.log("❌ Missing users for participant IDs:", missingUserIds);
        console.log(
          '💡 This is why you see "Unknown Player" - run fix_unknown_players.sql'
        );
      } else {
        console.log("✅ All participants have corresponding users");
      }
    }

    // 5. Check all users in the database
    const { data: allUsers, error: allUsersError } = await supabase
      .from("users")
      .select("id, display_name, email")
      .limit(10);

    if (!allUsersError && allUsers) {
      console.log("📊 Sample of all users in database:", allUsers.length);
      allUsers.forEach((u) => {
        console.log(`  - ${u.display_name} (${u.email})`);
      });
    }
  } catch (error) {
    console.error("❌ Unexpected error:", error);
  }
}

testTournamentParticipants();
