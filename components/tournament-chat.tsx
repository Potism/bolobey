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
  Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ChatMessage } from "@/lib/types";

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
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [onlineUsersCount, setOnlineUsersCount] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debug logging
  console.log("TournamentChat props:", {
    tournamentId,
    currentUserId,
    currentUsername,
    currentUserAvatar,
  });

  // Validate user data
  const isValidUser =
    currentUserId &&
    currentUsername &&
    currentUsername !== "Anonymous" &&
    currentUsername !== "User" &&
    currentUsername.trim().length > 0;

  console.log("User validation:", {
    hasUserId: !!currentUserId,
    hasUsername: !!currentUsername,
    username: currentUsername,
    isValidUser,
  });

  // Fetch existing messages
  const fetchMessages = async () => {
    try {
      console.log("Fetching messages for tournament:", tournamentId);

      const { data, error } = await supabase
        .from("chat_messages")
        .select(
          `
          *,
          user:users(id, display_name, avatar_url)
        `
        )
        .eq("tournament_id", tournamentId)
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) {
        console.error("Error fetching messages:", error);
        return;
      }

      console.log("Fetched messages:", data);
      setMessages(data || []);

      // Add welcome message if no messages exist and this is the first time
      if (!data || data.length === 0) {
        // Check if we already added a welcome message for this session
        const welcomeKey = `welcome-${tournamentId}`;
        if (!sessionStorage.getItem(welcomeKey)) {
          await addSystemMessage(
            `Welcome to the tournament chat! ${currentUsername} joined the conversation.`
          );
          sessionStorage.setItem(welcomeKey, "true");
        }
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Add system message
  const addSystemMessage = async (message: string) => {
    try {
      console.log("Adding system message:", message);
      console.log("System message data:", {
        tournament_id: tournamentId,
        user_id: currentUserId,
        message,
        message_type: "system",
      });

      const { data, error } = await supabase
        .from("chat_messages")
        .insert({
          tournament_id: tournamentId,
          user_id: currentUserId,
          message,
          message_type: "system",
        })
        .select();

      if (error) {
        console.error("Error adding system message:", error);
        console.error("System message error details:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        // Don't show alert for system messages, just log the error
      } else {
        console.log("System message added successfully:", data);
      }
    } catch (error) {
      console.error("Error adding system message:", error);
    }
  };

  // Subscribe to real-time updates
  useEffect(() => {
    if (!isValidUser) {
      console.log("User data not valid, skipping chat initialization");
      return;
    }

    console.log("Initializing real-time chat for tournament:", tournamentId);

    // Fetch existing messages
    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`chat:${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        (payload) => {
          console.log("New message received:", payload);
          const newMessage = payload.new as ChatMessage;

          // Fetch the user data for the new message
          supabase
            .from("users")
            .select("id, display_name, avatar_url")
            .eq("id", newMessage.user_id)
            .single()
            .then(({ data: userData }) => {
              if (userData) {
                const messageWithUser: ChatMessage = {
                  ...newMessage,
                  user: {
                    id: userData.id,
                    display_name: userData.display_name,
                    email: "", // We don't have this from the select
                    role: "player" as const, // Default role
                    avatar_url: userData.avatar_url,
                    created_at: "", // We don't have this from the select
                    updated_at: "", // We don't have this from the select
                  },
                };
                setMessages((prev) => [...prev, messageWithUser]);
              } else {
                // If no user data, just add the message without user info
                setMessages((prev) => [...prev, newMessage]);
              }
            });
        }
      )
      .subscribe((status) => {
        console.log("Subscription status:", status);
        setIsConnected(status === "SUBSCRIBED");
      });

    // Simulate online users count
    const userInterval = setInterval(() => {
      const randomChange = Math.floor(Math.random() * 3) - 1;
      setOnlineUsersCount((prev) => Math.max(1, prev + randomChange));
    }, 15000);

    return () => {
      console.log("Cleaning up chat subscription");
      supabase.removeChannel(channel);
      clearInterval(userInterval);
    };
  }, [tournamentId, currentUserId, currentUsername, isValidUser]);

  // Test database connectivity and table existence
  const testDatabaseConnection = async () => {
    try {
      console.log("Testing database connection...");

      // Test 1: Check if table exists
      const { data: tableExists, error: tableError } = await supabase
        .from("information_schema.tables")
        .select("table_name")
        .eq("table_schema", "public")
        .eq("table_name", "chat_messages")
        .single();

      console.log("Table exists check:", { tableExists, tableError });

      // Test 2: Try to select from table
      const { data: testSelect, error: selectError } = await supabase
        .from("chat_messages")
        .select("id")
        .limit(1);

      console.log("Test select:", { testSelect, selectError });

      // Test 3: Check user permissions
      const { data: user, error: userError } = await supabase.auth.getUser();
      console.log("Current user:", { user, userError });

      return { tableExists, selectError, userError };
    } catch (error) {
      console.error("Database connection test failed:", error);
      return { error };
    }
  };

  // Test user permissions and tournament participation
  const testUserPermissions = async () => {
    try {
      console.log("Testing user permissions...");

      // Check current user
      const { data: user, error: userError } = await supabase.auth.getUser();
      console.log("Current user:", { user, userError });

      // Check if user is a tournament participant
      const { data: participant, error: participantError } = await supabase
        .from("tournament_participants")
        .select("*")
        .eq("tournament_id", tournamentId)
        .eq("user_id", currentUserId)
        .single();

      console.log("Tournament participant check:", {
        participant,
        participantError,
      });

      // Test direct insert without RLS
      const { data: testInsert, error: insertError } = await supabase
        .from("chat_messages")
        .insert({
          tournament_id: tournamentId,
          user_id: currentUserId,
          message: "Test message",
          message_type: "message",
        })
        .select();

      console.log("Test insert result:", { testInsert, insertError });

      return { user, participant, insertError };
    } catch (error) {
      console.error("Permission test failed:", error);
      return { error };
    }
  };

  // Add test button in development
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      // Only test database connection, don't auto-insert test messages
      testDatabaseConnection();
      testUserPermissions();
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !isConnected || !isValidUser || isSending) return;

    setIsSending(true);

    try {
      console.log("Sending message:", newMessage);
      console.log("Message data:", {
        tournament_id: tournamentId,
        user_id: currentUserId,
        message: newMessage.trim(),
        message_type: "message",
      });

      // First, check if user is authenticated
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      console.log("Auth check:", { user, authError });

      if (authError || !user) {
        console.error("User not authenticated:", authError);
        alert("You must be logged in to send messages.");
        return;
      }

      const { data, error } = await supabase
        .from("chat_messages")
        .insert({
          tournament_id: tournamentId,
          user_id: currentUserId,
          message: newMessage.trim(),
          message_type: "message",
        })
        .select();

      if (error) {
        console.error("Error sending message:", error);
        console.error("Error details:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        alert(`Error sending message: ${error.message} (Code: ${error.code})`);
      } else {
        console.log("Message sent successfully:", data);
        setNewMessage("");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      alert(
        `Error sending message: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getDisplayName = (message: ChatMessage) => {
    if (message.message_type === "system") {
      return "System";
    }
    return message.user?.display_name || "Unknown User";
  };

  const getAvatar = (message: ChatMessage) => {
    if (message.message_type === "system") {
      return undefined;
    }
    return message.user?.avatar_url || currentUserAvatar;
  };

  return (
    <Card className="h-[600px] flex flex-col bg-background overflow-hidden">
      <CardHeader className="pb-3 border-b flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageCircle className="h-5 w-5" />
            Tournament Chat
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              variant={isConnected ? "default" : "secondary"}
              className="text-xs"
            >
              <div
                className={`w-2 h-2 rounded-full mr-1 ${
                  isConnected ? "bg-green-500" : "bg-red-500"
                }`}
              />
              {isConnected ? "Live" : "Offline"}
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              {onlineUsersCount}
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

      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        {/* Loading state */}
        {isLoading && (
          <div className="flex-1 flex items-center justify-center flex-shrink-0">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading chat...</p>
            </div>
          </div>
        )}

        {/* User data validation message */}
        {!isLoading && !isValidUser && (
          <div className="flex-1 flex items-center justify-center flex-shrink-0">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                User data not loaded properly
              </p>
              <p className="text-xs text-muted-foreground">
                Please refresh the page or check your login status
              </p>
            </div>
          </div>
        )}

        {/* Messages */}
        {!isLoading && isValidUser && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`flex gap-3 ${
                    message.user_id === currentUserId ? "flex-row-reverse" : ""
                  }`}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={getAvatar(message)} />
                    <AvatarFallback className="text-xs">
                      {getInitials(getDisplayName(message))}
                    </AvatarFallback>
                  </Avatar>

                  <div
                    className={`flex-1 max-w-[70%] ${
                      message.user_id === currentUserId ? "text-right" : ""
                    }`}
                  >
                    <div
                      className={`inline-block p-3 rounded-lg break-words ${
                        message.message_type === "system"
                          ? "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200"
                          : message.user_id === currentUserId
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {message.message_type !== "system" && (
                        <div className="text-xs font-medium mb-1 opacity-80">
                          {getDisplayName(message)}
                        </div>
                      )}
                      <div className="text-sm whitespace-pre-wrap">
                        {message.message}
                      </div>
                      <div className="text-xs opacity-60 mt-1">
                        {formatTime(message.created_at)}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t bg-background flex-shrink-0">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                isLoading
                  ? "Loading..."
                  : !isValidUser
                  ? "User data not loaded"
                  : !isConnected
                  ? "Connecting..."
                  : "Type a message..."
              }
              disabled={!isConnected || isLoading || !isValidUser || isSending}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={
                !newMessage.trim() ||
                !isConnected ||
                isLoading ||
                !isValidUser ||
                isSending
              }
              size="icon"
              className="h-10 w-10"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10"
              disabled={isLoading || !isValidUser}
            >
              <Smile className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
