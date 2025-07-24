import { createClient } from "@supabase/supabase-js";

// Replace with your Supabase URL and anon key
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://dajnapokhtsyrfobssut.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error(
    "Please set NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAdminUser() {
  try {
    // First, create the auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: "admin@bolobey.com",
      password: "admin123456",
      options: {
        data: {
          display_name: "Admin User",
        },
      },
    });

    if (authError) {
      console.error("Error creating auth user:", authError);
      return;
    }

    console.log("Auth user created:", authData.user?.id);

    // Then create the user profile with admin role
    if (authData.user) {
      const { error: profileError } = await supabase.from("users").upsert(
        {
          id: authData.user.id,
          email: authData.user.email,
          display_name: "Admin User",
          role: "admin",
        },
        {
          onConflict: "id",
        }
      );

      if (profileError) {
        console.error("Error creating user profile:", profileError);
      } else {
        console.log("Admin user profile created successfully!");
        console.log("Email: admin@bolobey.com");
        console.log("Password: admin123456");
        console.log("User ID:", authData.user.id);
      }
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

createAdminUser();
