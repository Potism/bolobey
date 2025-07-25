import { io, Socket } from 'socket.io-client';

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
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(data: MatchUpdate | TournamentUpdate) => void>> = new Map();

  connect() {
    if (this.socket?.connected) return;

    this.socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log('Connected to real-time server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from real-time server');
    });

    this.socket.on('match_update', (data: MatchUpdate) => {
      this.notifyListeners('match_update', data);
    });

    this.socket.on('tournament_update', (data: TournamentUpdate) => {
      this.notifyListeners('tournament_update', data);
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinTournament(tournamentId: string) {
    if (this.socket?.connected) {
      this.socket.emit('join_tournament', { tournamentId });
    }
  }

  leaveTournament(tournamentId: string) {
    if (this.socket?.connected) {
      this.socket.emit('leave_tournament', { tournamentId });
    }
  }

  updateMatchScore(matchId: string, player1Score: number, player2Score: number, winnerId?: string) {
    if (this.socket?.connected) {
      this.socket.emit('update_match_score', {
        matchId,
        player1Score,
        player2Score,
        winnerId,
        timestamp: new Date().toISOString(),
      });
    }
  }

  subscribe(event: string, callback: (data: MatchUpdate | TournamentUpdate) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        eventListeners.delete(callback);
      }
    };
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
    return this.socket?.connected || false;
  }

  sendChatMessage(data: {
    tournamentId: string;
    userId: string;
    username: string;
    avatar?: string;
    message: string;
    timestamp: string;
  }) {
    if (this.socket?.connected) {
      this.socket.emit('chat_message', data);
    }
  }
}

export const realtimeService = new RealtimeService(); 