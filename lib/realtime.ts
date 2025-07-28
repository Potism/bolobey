// import { io, Socket } from 'socket.io-client';

export interface MatchUpdate {
  matchId: string;
  tournamentId: string;
  player1Score: number;
  player2Score: number;
  winnerId?: string;
  status: 'pending' | 'in_progress' | 'completed';
  lastUpdated: Date;
}

export interface TournamentUpdate {
  tournamentId: string;
  type: 'match_started' | 'match_completed' | 'tournament_started' | 'tournament_completed';
  data: Record<string, unknown>;
}

class RealtimeService {
  // private socket: Socket | null = null;
  private listeners: Map<string, Set<(data: MatchUpdate | TournamentUpdate) => void>> = new Map();

  connect() {
    // Socket.IO connection disabled - using Supabase Realtime instead
    console.log('Socket.IO connection disabled - using Supabase Realtime');
    return;
  }

  disconnect() {
    // Socket.IO disabled - using Supabase Realtime
    return;
  }

  joinTournament(_tournamentId: string) {
    // Socket.IO disabled - using Supabase Realtime
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return;
  }

  leaveTournament(_tournamentId: string) {
    // Socket.IO disabled - using Supabase Realtime
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return;
  }

  updateMatchScore(_matchId: string, _player1Score: number, _player2Score: number, _winnerId?: string) {
    // Socket.IO disabled - using Supabase Realtime
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return;
  }

  subscribe(event: string, _callback: (data: MatchUpdate | TournamentUpdate) => void) {
    // Socket.IO disabled - using Supabase Realtime
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    console.log(`Socket.IO subscription disabled for ${event} - using Supabase Realtime`);
    return () => {};
  }

  private notifyListeners(event: string, data: MatchUpdate | TournamentUpdate) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in real-time listener:', error);
        }
      });
    }
  }

  isConnected() {
    // Socket.IO disabled - using Supabase Realtime
    return false;
  }

  sendChatMessage(_data: {
    tournamentId: string;
    userId: string;
    username: string;
    avatar?: string;
    message: string;
    timestamp: string;
  }) {
    // Socket.IO disabled - using Supabase Realtime
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return;
  }
}

export const realtimeService = new RealtimeService(); 