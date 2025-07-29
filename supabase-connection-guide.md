# Connecting Cursor to Supabase Database

## Method 1: Using Supabase CLI (Recommended)

### Step 1: Install Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Or using Homebrew (macOS)
brew install supabase/tap/supabase
```

### Step 2: Login to Supabase

```bash
supabase login
```

### Step 3: Link Your Project

```bash
# Get your project reference from Supabase dashboard
supabase link --project-ref YOUR_PROJECT_REF
```

### Step 4: Connect to Database

```bash
# Start a local connection
supabase db remote commit
```

## Method 2: Direct PostgreSQL Connection

### Step 1: Get Connection Details

From your Supabase dashboard:

- Go to Settings > Database
- Copy the connection string

### Step 2: Install PostgreSQL Extension in Cursor

1. Open Cursor
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "PostgreSQL"
4. Install "PostgreSQL" extension

### Step 3: Connect

1. Press Ctrl+Shift+P
2. Type "PostgreSQL: Connect"
3. Enter your connection details:
   - Host: `db.YOUR_PROJECT_REF.supabase.co`
   - Port: `5432`
   - Database: `postgres`
   - Username: `postgres`
   - Password: `YOUR_DB_PASSWORD`

## Method 3: Using Environment Variables

Create a `.env` file in your project root:

```env
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
SUPABASE_DB_HOST=db.YOUR_PROJECT_REF.supabase.co
SUPABASE_DB_PASSWORD=YOUR_DB_PASSWORD
```

## Quick Test Script

Once connected, you can run this test:

```sql
-- Test connection
SELECT 'Connected to Supabase!' as status;

-- Check your tournament
SELECT
    id,
    name,
    created_at
FROM tournaments
WHERE id = '1775d146-c3eb-4500-8afe-c74aa5bdd205';
```
