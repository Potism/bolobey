const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

// Read .env file
const envContent = fs.readFileSync(".env", "utf8");
const envVars = {};
envContent.split("\n").forEach((line) => {
  const [key, value] = line.split("=");
  if (key && value) {
    envVars[key] = value;
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase environment variables");
  console.log("Available vars:", Object.keys(envVars));
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testParticipants() {
  try {
    // First, check if there are any users at all
    const { data: allUsers, error: allUsersError } = await supabase
      .from("users")
      .select("id, display_name, email")
      .limit(5);

    if (allUsersError) {
      console.error("Error fetching all users:", allUsersError);
      return;
    }

    console.log("Total users in users table:", allUsers?.length || 0);
    console.log("Sample users:", allUsers);

    // Get a tournament ID
    const { data: tournaments, error: tournamentError } = await supabase
      .from("tournaments")
      .select("id, name")
      .limit(1);

    if (tournamentError) {
      console.error("Error fetching tournaments:", tournamentError);
      return;
    }

    if (!tournaments || tournaments.length === 0) {
      console.log("No tournaments found");
      return;
    }

    const tournamentId = tournaments[0].id;
    console.log(
      "Testing tournament:",
      tournaments[0].name,
      "ID:",
      tournamentId
    );

    // Check participants
    const { data: participants, error: participantsError } = await supabase
      .from("tournament_participants")
      .select("*")
      .eq("tournament_id", tournamentId);

    if (participantsError) {
      console.error("Error fetching participants:", participantsError);
      return;
    }

    console.log("Participants found:", participants?.length || 0);
    console.log("Participants data:", participants);

    if (participants && participants.length > 0) {
      const userIds = participants.map((p) => p.user_id);
      console.log("User IDs:", userIds);

      // Check if users exist
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, display_name, email")
        .in("id", userIds);

      if (usersError) {
        console.error("Error fetching users:", usersError);
        return;
      }

      console.log("Users found:", users?.length || 0);
      console.log("Users data:", users);

      // Check which user IDs are missing
      const foundUserIds = users?.map((u) => u.id) || [];
      const missingUserIds = userIds.filter((id) => !foundUserIds.includes(id));

      if (missingUserIds.length > 0) {
        console.log("Missing user IDs:", missingUserIds);
      } else {
        console.log("All user IDs found in users table");
      }
    }
  } catch (error) {
    console.error("Unexpected error:", error);
  }
}

testParticipants();
