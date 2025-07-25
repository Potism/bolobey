const { createServer } = require("http");
const { Server } = require("socket.io");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server(server, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
    },
  });

  // Socket.IO event handlers
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // Join tournament room
    socket.on("join_tournament", (data) => {
      const { tournamentId } = data;
      socket.join(`tournament:${tournamentId}`);
      console.log(`Client ${socket.id} joined tournament ${tournamentId}`);
    });

    // Leave tournament room
    socket.on("leave_tournament", (data) => {
      const { tournamentId } = data;
      socket.leave(`tournament:${tournamentId}`);
      console.log(`Client ${socket.id} left tournament ${tournamentId}`);
    });

    // Handle match score updates
    socket.on("update_match_score", (data) => {
      const {
        matchId,
        tournamentId,
        player1Score,
        player2Score,
        winnerId,
        timestamp,
      } = data;

      // Broadcast to all clients in the tournament room
      socket.to(`tournament:${tournamentId}`).emit("match_update", {
        matchId,
        tournamentId,
        player1Score,
        player2Score,
        winnerId,
        status: winnerId ? "completed" : "in_progress",
        lastUpdated: new Date(timestamp),
      });

      // Emit tournament update
      socket.to(`tournament:${tournamentId}`).emit("tournament_update", {
        tournamentId,
        type: winnerId ? "match_completed" : "match_started",
        data: { matchId, winnerId },
      });

      console.log(
        `Match ${matchId} score updated: ${player1Score}-${player2Score}`
      );
    });

    // Handle match start
    socket.on("start_match", (data) => {
      const { matchId, tournamentId } = data;

      socket.to(`tournament:${tournamentId}`).emit("tournament_update", {
        tournamentId,
        type: "match_started",
        data: { matchId },
      });

      console.log(`Match ${matchId} started`);
    });

    // Handle match completion
    socket.on("complete_match", (data) => {
      const { matchId, tournamentId, winnerId } = data;

      socket.to(`tournament:${tournamentId}`).emit("tournament_update", {
        tournamentId,
        type: "match_completed",
        data: { matchId, winnerId },
      });

      console.log(`Match ${matchId} completed, winner: ${winnerId}`);
    });

    // Handle tournament start
    socket.on("start_tournament", (data) => {
      const { tournamentId } = data;

      socket.to(`tournament:${tournamentId}`).emit("tournament_update", {
        tournamentId,
        type: "tournament_started",
        data: { tournamentId },
      });

      console.log(`Tournament ${tournamentId} started`);
    });

    // Handle tournament completion
    socket.on("complete_tournament", (data) => {
      const { tournamentId, winnerId } = data;

      socket.to(`tournament:${tournamentId}`).emit("tournament_update", {
        tournamentId,
        type: "tournament_completed",
        data: { tournamentId, winnerId },
      });

      console.log(`Tournament ${tournamentId} completed, winner: ${winnerId}`);
    });

    // Handle chat messages
    socket.on("chat_message", (data) => {
      const { tournamentId, userId, username, avatar, message, timestamp } =
        data;

      socket.to(`tournament:${tournamentId}`).emit("chat_message", {
        tournamentId,
        type: "message",
        data: { userId, username, avatar, message, timestamp },
      });

      console.log(
        `Chat message from ${username} in tournament ${tournamentId}`
      );
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  const PORT = process.env.PORT || 3001;
  server.listen(PORT, () => {
    console.log(`> Ready on http://localhost:${PORT}`);
    console.log(`> WebSocket server running on port ${PORT}`);
  });
});
