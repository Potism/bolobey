"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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

// User cache to reduce database calls
const userCache = new Map<
  string,
  { id: string; display_name: string; avatar_url?: string }
>();

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
  const debounceTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const userIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Validate user data
  const isValidUser = useMemo(() => {
    return (
      currentUserId &&
      currentUsername &&
      currentUsername !== "Anonymous" &&
      currentUsername !== "User" &&
      currentUsername.trim().length > 0
    );
  }, [currentUserId, currentUsername]);

  // Add system message
  const addSystemMessage = useCallback(
    async (message: string) => {
      try {
        const { error } = await supabase
          .from("chat_messages")
          .insert({
            tournament_id: tournamentId,
            user_id: currentUserId,
            message,
            message_type: "system",
          })
          .select();

        if (error) {
          // Silent error handling for system messages
        }
      } catch {
        // Silent error handling
      }
    },
    [tournamentId, currentUserId]
  );

  // Fetch user data with caching
  const fetchUserData = useCallback(async (userId: string) => {
    // Check cache first
    if (userCache.has(userId)) {
      return userCache.get(userId);
    }

    try {
      const { data: userData, error } = await supabase
        .from("users")
        .select("id, display_name, avatar_url")
        .eq("id", userId)
        .single();

      if (error || !userData) {
        return null;
      }

      // Cache the user data
      userCache.set(userId, userData);
      return userData;
    } catch {
      return null;
    }
  }, []);

  // Fetch existing messages
  const fetchMessages = useCallback(async () => {
    try {
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
        return;
      }

      setMessages(data || []);

      // Cache user data for all messages
      if (data) {
        data.forEach((message) => {
          if (message.user && !userCache.has(message.user.id)) {
            userCache.set(message.user.id, message.user);
          }
        });
      }

      // Add welcome message if no messages exist and this is the first time
      if (!data || data.length === 0) {
        const welcomeKey = `welcome-${tournamentId}`;
        if (!sessionStorage.getItem(welcomeKey)) {
          await addSystemMessage(
            `Welcome to the tournament chat! ${currentUsername} joined the conversation.`
          );
          sessionStorage.setItem(welcomeKey, "true");
        }
      }
    } catch {
      // Silent error handling
    } finally {
      setIsLoading(false);
    }
  }, [tournamentId, currentUsername, addSystemMessage]);

  // Send message function
  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !isConnected || !isValidUser || isSending) return;

    setIsSending(true);

    try {
      // Check if user is authenticated
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        alert("You must be logged in to send messages.");
        return;
      }

      const { error } = await supabase
        .from("chat_messages")
        .insert({
          tournament_id: tournamentId,
          user_id: currentUserId,
          message: newMessage.trim(),
          message_type: "message",
        })
        .select();

      if (error) {
        alert(`Error sending message: ${error.message} (Code: ${error.code})`);
      } else {
        setNewMessage("");
      }
    } catch (error) {
      alert(
        `Error sending message: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsSending(false);
    }
  }, [
    newMessage,
    isConnected,
    isValidUser,
    isSending,
    tournamentId,
    currentUserId,
  ]);

  // Debounced message sending for Enter key
  const debouncedSendMessage = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      sendMessage();
    }, 300);
  }, [sendMessage]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!isValidUser) {
      return;
    }

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
        async (payload) => {
          const newMessage = payload.new as ChatMessage;

          // Use cached user data if available, otherwise fetch
          let userData: {
            id: string;
            display_name: string;
            avatar_url?: string;
          } | null = userCache.get(newMessage.user_id) || null;
          if (!userData) {
            userData = await fetchUserData(newMessage.user_id);
          }

          if (userData) {
            const messageWithUser: ChatMessage = {
              ...newMessage,
              user: {
                id: userData.id,
                display_name: userData.display_name,
                email: "",
                role: "player" as const,
                avatar_url: userData.avatar_url || null,
                created_at: "",
                updated_at: "",
              },
            };
            setMessages((prev) => [...prev, messageWithUser]);
          } else {
            setMessages((prev) => [...prev, newMessage]);
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    // Store channel reference for cleanup
    channelRef.current = channel;

    // Simulate online users count
    userIntervalRef.current = setInterval(() => {
      const randomChange = Math.floor(Math.random() * 3) - 1;
      setOnlineUsersCount((prev) => Math.max(1, prev + randomChange));
    }, 15000);

    // Cleanup function
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (userIntervalRef.current) {
        clearInterval(userIntervalRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [
    tournamentId,
    currentUserId,
    currentUsername,
    isValidUser,
    fetchMessages,
    fetchUserData,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (userIntervalRef.current) {
        clearInterval(userIntervalRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        debouncedSendMessage();
      }
    },
    [debouncedSendMessage]
  );

  const formatTime = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  const getInitials = useCallback((name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, []);

  const getDisplayName = useCallback((message: ChatMessage) => {
    if (message.message_type === "system") {
      return "System";
    }
    return message.user?.display_name || "Unknown User";
  }, []);

  const getAvatar = useCallback(
    (message: ChatMessage) => {
      if (message.message_type === "system") {
        return undefined;
      }
      return message.user?.avatar_url || currentUserAvatar;
    },
    [currentUserAvatar]
  );

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
