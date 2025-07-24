export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          display_name: string;
          role: "admin" | "player";
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          display_name: string;
          role?: "admin" | "player";
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string;
          role?: "admin" | "player";
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      tournaments: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_by: string;
          start_date: string;
          registration_deadline: string;
          max_participants: number;
          status: "open" | "closed" | "in_progress" | "completed";
          format: "single_elimination" | "double_elimination";
          winner_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          created_by: string;
          start_date: string;
          registration_deadline: string;
          max_participants?: number;
          status?: "open" | "closed" | "in_progress" | "completed";
          format?: "single_elimination" | "double_elimination";
          winner_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          created_by?: string;
          start_date?: string;
          registration_deadline?: string;
          max_participants?: number;
          status?: "open" | "closed" | "in_progress" | "completed";
          format?: "single_elimination" | "double_elimination";
          winner_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      tournament_participants: {
        Row: {
          id: string;
          tournament_id: string;
          user_id: string;
          seed: number | null;
          joined_at: string;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          user_id: string;
          seed?: number | null;
          joined_at?: string;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          user_id?: string;
          seed?: number | null;
          joined_at?: string;
        };
      };
      matches: {
        Row: {
          id: string;
          tournament_id: string;
          round: number;
          match_number: number;
          player1_id: string | null;
          player2_id: string | null;
          winner_id: string | null;
          player1_score: number;
          player2_score: number;
          status: "pending" | "in_progress" | "completed";
          scheduled_at: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          round: number;
          match_number: number;
          player1_id?: string | null;
          player2_id?: string | null;
          winner_id?: string | null;
          player1_score?: number;
          player2_score?: number;
          status?: "pending" | "in_progress" | "completed";
          scheduled_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          round?: number;
          match_number?: number;
          player1_id?: string | null;
          player2_id?: string | null;
          winner_id?: string | null;
          player1_score?: number;
          player2_score?: number;
          status?: "pending" | "in_progress" | "completed";
          scheduled_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {
      player_stats: {
        Row: {
          id: string;
          display_name: string;
          tournaments_played: number;
          tournaments_won: number;
          matches_won: number;
          total_matches: number;
          win_percentage: number;
        };
      };
    };
  };
}

// Application types
export type User = Database["public"]["Tables"]["users"]["Row"];
export type Tournament = Database["public"]["Tables"]["tournaments"]["Row"];
export type TournamentParticipant =
  Database["public"]["Tables"]["tournament_participants"]["Row"];
export type Match = Database["public"]["Tables"]["matches"]["Row"];
export type PlayerStats = Database["public"]["Views"]["player_stats"]["Row"];

export type CreateTournament =
  Database["public"]["Tables"]["tournaments"]["Insert"];
export type UpdateTournament =
  Database["public"]["Tables"]["tournaments"]["Update"];
export type CreateMatch = Database["public"]["Tables"]["matches"]["Insert"];
export type UpdateMatch = Database["public"]["Tables"]["matches"]["Update"];

// Extended types with relationships
export interface TournamentWithDetails extends Tournament {
  created_by_user?: User;
  winner?: User;
  participants?: TournamentParticipant[];
  tournament_participants?: Array<TournamentParticipant & { user?: User }>;
  participant_count?: number;
}

export interface MatchWithPlayers extends Match {
  player1?: User;
  player2?: User;
  winner?: User;
}

export interface BracketMatch {
  id: string;
  round: number;
  match_number: number;
  player1?: User;
  player2?: User;
  winner?: User;
  player1_score: number;
  player2_score: number;
  status: "pending" | "in_progress" | "completed";
}
