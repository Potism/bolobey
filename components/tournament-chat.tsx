"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MessageCircle,
  Send,
  Users,
  Smile,
  Volume2,
  VolumeX,
} from "lucide-react";
import { realtimeService } from "@/lib/realtime";

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  avatar?: string;
  message: string;
  timestamp: Date;
  type: "message" | "system" | "match_update";
}

interface TournamentChatProps {
  tournamentId: string;
  currentUserId: string;
  currentUsername: string;
  currentUserAvatar?: string;
}

export function TournamentChat({
  tournamentId,
  currentUserId,
  currentUsername,
  currentUserAvatar,
}: TournamentChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Connect to chat
    realtimeService.connect();
    realtimeService.joinTournament(tournamentId);

    // Subscribe to chat messages
    const unsubscribe = realtimeService.subscribe("chat_message", (data) => {
      if (
        "tournamentId" in data &&
        data.tournamentId === tournamentId &&
        "data" in data
      ) {
        const chatData = data.data as Record<string, unknown>;
        if (chatData.type === "message" && chatData.userId !== currentUserId) {
          addMessage({
            id: Date.now().toString(),
            userId: chatData.userId as string,
            username: chatData.username as string,
            avatar: chatData.avatar as string,
            message: chatData.message as string,
            timestamp: new Date(),
            type: "message",
          });
        }
      }
    });

    // Subscribe to system messages
    const systemUnsubscribe = realtimeService.subscribe(
      "tournament_update",
      (data) => {
        if (
          "tournamentId" in data &&
          data.tournamentId === tournamentId &&
          "data" in data
        ) {
          const updateData = data.data as Record<string, unknown>;
          if (
            updateData.type === "match_started" ||
            updateData.type === "match_completed"
          ) {
            addMessage({
              id: Date.now().toString(),
              userId: "system",
              username: "System",
              message: getSystemMessage(updateData),
              timestamp: new Date(),
              type: "system",
            });
          }
        }
      }
    );

    // Add welcome message
    addMessage({
      id: "welcome",
      userId: "system",
      username: "System",
      message: `Welcome to the tournament chat! ${currentUsername} joined the conversation.`,
      timestamp: new Date(),
      type: "system",
    });

    // Simulate online users
    const userInterval = setInterval(() => {
      setOnlineUsers((prev) =>
        Math.max(5, prev + Math.floor(Math.random() * 3) - 1)
      );
    }, 10000);

    const connectionCheck = setInterval(() => {
      setIsConnected(realtimeService.isConnected());
    }, 3000);

    return () => {
      unsubscribe();
      systemUnsubscribe();
      realtimeService.leaveTournament(tournamentId);
      clearInterval(userInterval);
      clearInterval(connectionCheck);
    };
  }, [tournamentId, currentUserId, currentUsername]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !isConnected) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      userId: currentUserId,
      username: currentUsername,
      avatar: currentUserAvatar,
      message: newMessage.trim(),
      timestamp: new Date(),
      type: "message",
    };

    // Add to local messages
    addMessage(message);

    // Send to server
    realtimeService.sendChatMessage({
      tournamentId,
      userId: currentUserId,
      username: currentUsername,
      avatar: currentUserAvatar,
      message: newMessage.trim(),
      timestamp: new Date().toISOString(),
    });

    setNewMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getSystemMessage = (data: Record<string, unknown>): string => {
    if (data.type === "match_started") {
      return `🎮 Match ${data.matchNumber} has started!`;
    } else if (data.type === "match_completed") {
      return `🏆 Match ${data.matchNumber} completed! ${data.winner} wins!`;
    }
    return "Tournament update";
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Tournament Chat
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              variant={isConnected ? "default" : "secondary"}
              className="text-xs"
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  isConnected ? "bg-green-500" : "bg-red-500"
                }`}
              />
              {isConnected ? "Live" : "Offline"}
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              {onlineUsers}
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsMuted(!isMuted)}
              className="h-8 w-8 p-0"
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`flex gap-3 ${
                  message.userId === currentUserId ? "flex-row-reverse" : ""
                }`}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={message.avatar} />
                  <AvatarFallback className="text-xs">
                    {getInitials(message.username)}
                  </AvatarFallback>
                </Avatar>

                <div
                  className={`flex-1 max-w-[70%] ${
                    message.userId === currentUserId ? "text-right" : ""
                  }`}
                >
                  <div
                    className={`inline-block p-3 rounded-lg ${
                      message.type === "system"
                        ? "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200"
                        : message.userId === currentUserId
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {message.type !== "system" && (
                      <div className="text-xs font-medium mb-1 opacity-80">
                        {message.username}
                      </div>
                    )}
                    <div className="text-sm">{message.message}</div>
                    <div className="text-xs opacity-60 mt-1">
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isConnected ? "Type a message..." : "Connecting..."}
              disabled={!isConnected}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={!newMessage.trim() || !isConnected}
              size="icon"
              className="h-10 w-10"
            >
              <Send className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-10 w-10">
              <Smile className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
