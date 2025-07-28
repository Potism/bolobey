export interface User {
  id: string;
  email: string;
  display_name: string;
  role: "player" | "admin";
  avatar_url: string | null;
  shipping_address?: string;
  phone_number?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country?: string;
  created_at: string;
  updated_at: string;
}

export interface Tournament {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  start_date: string;
  registration_deadline: string;
  max_participants: number;
  status: "open" | "closed" | "in_progress" | "completed";
  format: "single_elimination" | "double_elimination" | "beyblade_x";
  current_phase: "registration" | "round_robin" | "elimination" | "completed";
  winner_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TournamentParticipant {
  id: string;
  tournament_id: string;
  user_id: string;
  seed: number | null;
  total_points: number;
  burst_points: number;
  ringout_points: number;
  spinout_points: number;
  matches_played: number;
  matches_won: number;
  joined_at: string;
}

export interface TournamentPhase {
  id: string;
  tournament_id: string;
  phase_type: "round_robin" | "elimination";
  phase_order: number;
  status: "pending" | "in_progress" | "completed";
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface RoundRobinMatch {
  id: string;
  tournament_id: string;
  player1_id: string | null;
  player2_id: string | null;
  winner_id: string | null;
  player1_score: number;
  player2_score: number;
  status: "pending" | "in_progress" | "completed";
  scheduled_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface Match {
  id: string;
  tournament_id: string;
  phase_id: string;
  round: number;
  match_number: number;
  bracket_type: "upper" | "lower" | "final";
  player1_id: string | null;
  player2_id: string | null;
  winner_id: string | null;
  player1_score: number;
  player2_score: number;
  status: "pending" | "in_progress" | "completed";
  scheduled_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface Battle {
  id: string;
  match_id: string | null;
  round_robin_match_id: string | null;
  battle_number: number;
  winner_id: string;
  finish_type: "burst" | "ringout" | "spinout";
  player1_points: number;
  player2_points: number;
  created_at: string;
}

export interface BattleResult {
  winner_id: string;
  finish_type: "burst" | "ringout" | "spinout";
  player1_points: number;
  player2_points: number;
}

export interface ChatMessage {
  id: string;
  tournament_id: string;
  user_id: string;
  message: string;
  message_type: "message" | "system" | "match_update";
  created_at: string;
  updated_at: string;
  user?: User;
}

export interface BracketMatch {
  id: string;
  round: number;
  match_number: number;
  bracket_type: "upper" | "lower" | "final";
  player1?: User;
  player2?: User;
  winner?: User;
  player1_score: number;
  player2_score: number;
  status: "pending" | "in_progress" | "completed";
}

export interface RoundRobinMatchWithPlayers extends RoundRobinMatch {
  player1?: User;
  player2?: User;
  winner?: User;
  battles?: Battle[];
}

export interface MatchWithPlayers extends Match {
  player1?: User;
  player2?: User;
  winner?: User;
  battles?: Battle[];
}

export interface BattleWithPlayers extends Battle {
  winner?: User;
}

export interface TournamentBracket {
  upper_bracket: BracketMatch[];
  lower_bracket: BracketMatch[];
  final_matches: BracketMatch[];
  total_rounds: number;
}

export interface RoundRobinStandings {
  user_id: string;
  display_name: string;
  total_points: number;
  burst_points: number;
  ringout_points: number;
  spinout_points: number;
  matches_played: number;
  matches_won: number;
  win_percentage: number;
  rank: number;
}

export interface TournamentWithDetails extends Tournament {
  created_by_user?: User;
  winner?: User;
  participants?: TournamentParticipant[];
  tournament_participants?: (TournamentParticipant & { user?: User })[];
  phases?: TournamentPhase[];
  participant_count?: number;
}

export interface PlayerStats {
  id: string;
  display_name: string;
  tournaments_played: number;
  tournaments_won: number;
  matches_won: number;
  total_matches: number;
  total_points: number;
  total_burst_points: number;
  total_ringout_points: number;
  total_spinout_points: number;
  win_percentage: number;
}

export interface TournamentStats {
  total_matches: number;
  completed_matches: number;
  total_participants: number;
  progress: number;
  champion?: User;
}

export interface CreateMatch {
  tournament_id: string;
  phase_id: string;
  round: number;
  match_number: number;
  bracket_type: "upper" | "lower" | "final";
  player1_id?: string;
  player2_id?: string;
}

export interface CreateRoundRobinMatch {
  tournament_id: string;
  player1_id: string;
  player2_id: string;
}

export interface CreateBattle {
  match_id?: string;
  round_robin_match_id?: string;
  battle_number: number;
  winner_id: string;
  finish_type: "burst" | "ringout" | "spinout";
  player1_points: number;
  player2_points: number;
}

export interface UserNotification {
  id: string;
  user_id: string;
  type: "bet_won" | "bet_lost" | "bet_placed" | "prize_redemption" | "prize_approved" | "prize_shipped" | "prize_delivered" | "tournament_start" | "tournament_end" | "match_start" | "match_result" | "points_awarded" | "achievement_unlocked" | "system_announcement";
  title: string;
  message: string;
  read: boolean;
  data?: Record<string, unknown>;
  priority: "low" | "normal" | "high" | "urgent";
  created_at: string;
}

export interface UnreadNotificationCount {
  user_id: string;
  unread_count: number;
  urgent_count: number;
  high_priority_count: number;
}

// Point System Types
export interface UserPoints {
  betting_points: number;
  stream_points: number;
  total_earned_stream_points: number;
  total_spent_stream_points: number;
}

export interface PointTransaction {
  id: string;
  user_id: string;
  type: 'betting_points' | 'stream_points';
  amount: number;
  transaction_type: 'purchase' | 'bet' | 'win' | 'redemption' | 'bonus' | 'refund';
  description: string;
  tournament_id?: string;
  match_id?: string;
  created_at: string;
}

export interface PointPackage {
  id: string;
  name: string;
  betting_points: number;
  bonus_points: number;
  price_eur: number;
  is_popular?: boolean;
  is_featured?: boolean;
}

// Tournament Types
export interface TournamentType {
  id: string;
  name: string;
  description: string;
  has_entry_fee: boolean;
  entry_fee_eur?: number;
  has_physical_prizes: boolean;
  has_stream_prizes: boolean;
  betting_enabled: boolean;
  stream_enabled: boolean;
  max_participants?: number;
  icon: string;
}

// Achievement System
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  stream_points_reward: number;
  requirement_type: 'first_bet' | 'win_streak' | 'total_wins' | 'total_bets' | 'tournament_wins';
  requirement_value: number;
  is_hidden?: boolean;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  earned_at: string;
  progress: number;
  is_completed: boolean;
}

// Challenge System
export interface Challenge {
  id: string;
  name: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly';
  stream_points_reward: number;
  requirement_type: 'place_bets' | 'win_bets' | 'earn_stream_points' | 'participate_tournaments';
  requirement_value: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export interface UserChallenge {
  id: string;
  user_id: string;
  challenge_id: string;
  progress: number;
  is_completed: boolean;
  completed_at?: string;
}
