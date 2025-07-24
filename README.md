# Bolobey - Beyblade Tournament Management System

A modern, full-stack web application for managing Beyblade tournaments with user authentication, bracket generation, and player statistics tracking.

## 🚀 Features

### ✅ Implemented (v1)

- **User Authentication & Roles**
  - Email-based registration and login
  - Admin and player role management
  - Protected routes with middleware
- **Tournament Management**
  - Admin tournament creation with validation
  - Tournament listing with filtering
  - Participant management
  - Tournament status tracking (open, in_progress, completed)
- **Modern UI/UX**
  - Responsive design with Tailwind CSS
  - Beautiful gradient themes
  - Loading states and error handling
  - Beyblade-themed design elements

### 🚧 Coming Next (v2)

- Bracket generation and visualization
- Match result management
- Player statistics dashboard
- Tournament joining functionality
- Leaderboards and rankings

## 🛠 Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS 4.0
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Icons**: Lucide React
- **Deployment**: Vercel

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- A Supabase account
- Git

### 1. Clone and Install

```bash
git clone <your-repo>
cd bolobey
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings → API to get your project URL and anon key
3. Go to SQL Editor and run the complete schema from `supabase_schema.sql`
4. Run the admin user creation script from `scripts/create-admin.sql`

### 3. Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your application!

**Default Admin Credentials:**

- Email: `admin@bolobey.com`
- Password: `admin123456`

## 📊 Database Setup

The database schema is provided in `supabase_schema.sql`. It includes:

- **users**: User profiles with roles
- **tournaments**: Tournament information and settings
- **tournament_participants**: Player registrations
- **matches**: Match results and brackets
- **player_stats**: Statistics view for rankings

### Key Features:

- Row Level Security (RLS) policies
- Automatic user profile creation on signup
- Tournament registration validations
- Performance indexes

## 🏗 Project Structure

```
bolobey/
├── app/                    # Next.js app directory
│   ├── auth/              # Authentication pages
│   ├── tournaments/       # Tournament pages
│   ├── layout.tsx         # Root layout with AuthProvider
│   └── page.tsx           # Homepage
├── lib/                   # Utilities and configuration
│   ├── hooks/             # React hooks
│   ├── supabase.ts        # Client-side Supabase client
│   ├── supabase-server.ts # Server-side Supabase client
│   └── types.ts           # TypeScript definitions
├── middleware.ts          # Route protection
└── supabase_schema.sql    # Database schema
```

## 🔐 Authentication Flow

1. **Sign Up**: Creates user in Supabase Auth and profile in users table
2. **Sign In**: Authenticates and fetches user profile
3. **Route Protection**: Middleware checks authentication and roles
4. **Admin Access**: Only admins can create tournaments

## 🎯 User Roles

- **Admin**: Can create and manage tournaments
- **Player**: Can join tournaments and view stats (default role)

To make a user admin, update their role in the database:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy!

### Other Platforms

Works on any Node.js hosting platform that supports Next.js.

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Adding Features

1. Update database schema in Supabase
2. Update TypeScript types in `lib/types.ts`
3. Create new pages/components
4. Update middleware for route protection if needed

## 📱 Pages Overview

- **/** - Homepage with featured tournaments and top players
- **/auth/login** - User login
- **/auth/signup** - User registration
- **/tournaments** - Tournament listing with filters
- **/tournaments/create** - Tournament creation (admin only)
- **/tournaments/[id]** - Tournament details (coming soon)

## 🎨 Design System

- **Colors**: Blue/Purple/Red gradient theme
- **Typography**: Geist Sans font family
- **Components**: Glass morphism with backdrop blur
- **Icons**: Lucide React for consistent iconography

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the MIT License.

## 🆘 Support

If you encounter any issues:

1. Check the database schema is properly set up
2. Verify environment variables are correct
3. Ensure Supabase RLS policies are enabled
4. Check the browser console for errors

## 🎯 Roadmap

### Phase 2 (Next)

- [ ] Tournament bracket generation
- [ ] Match result input system
- [ ] Player statistics dashboard
- [ ] Tournament joining workflow
- [ ] Real-time updates

### Phase 3 (Future)

- [ ] Advanced bracket formats
- [ ] Mobile app
- [ ] Tournament streaming
- [ ] Team tournaments
- [ ] Advanced analytics

---

Built with ❤️ for the Beyblade community!
# bolobey
