"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { Play } from "lucide-react";

interface OBSStreamPlayerProps {
  streamUrl?: string;
  streamKey?: string;
  tournamentId?: string;
  isLive?: boolean;
  title?: string;
}

export function OBSStreamPlayer({
  streamUrl,
  streamKey,
  tournamentId,
  isLive = false,
  title = "Live Stream",
}: OBSStreamPlayerProps) {
  const [currentStreamKey, setCurrentStreamKey] = useState<string | null>(
    streamKey || null
  );

  // Function to get or generate stream key
  const getOrGenerateStreamKey = useCallback(async () => {
    if (!tournamentId) return;

    try {
      const { data, error } = await supabase.rpc("get_or_generate_stream_key", {
        tournament_uuid: tournamentId,
      });

      if (error) {
        console.error("Error getting stream key:", error);
        return;
      }

      setCurrentStreamKey(data);
    } catch (err) {
      console.error("Error getting stream key:", err);
    }
  }, [tournamentId]);

  // Generate stream key if not provided
  useEffect(() => {
    if (!streamKey && tournamentId) {
      getOrGenerateStreamKey();
    }
  }, [streamKey, tournamentId, getOrGenerateStreamKey]);

  const getVideoUrl = () => {
    if (!streamUrl) return null;

    // For YouTube Live
    if (streamUrl.includes("youtube.com/embed/")) {
      return streamUrl;
    }

    return streamUrl;
  };

  const videoUrl = getVideoUrl();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            {title}
            {isLive && (
              <Badge variant="destructive" className="animate-pulse">
                LIVE
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {streamKey && (
              <Badge variant="outline" className="text-xs">
                Key: {streamKey.slice(0, 8)}...
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stream Player */}
        <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
          {videoUrl ? (
            <iframe
              src={videoUrl}
              width="100%"
              height="100%"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white">
              <div className="text-center">
                <Play className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">
                  {streamKey || currentStreamKey
                    ? "Live Stream Ready"
                    : "No Stream Available"}
                </p>
                <p className="text-sm opacity-75 mb-4">
                  {streamKey || currentStreamKey
                    ? "Stream is configured and ready to go live"
                    : "Configure stream settings to start"}
                </p>
                {streamKey || currentStreamKey ? (
                  <div className="space-y-2">
                    <Button
                      onClick={() =>
                        window.open("https://www.youtube.com/live", "_blank")
                      }
                      className="w-full"
                      variant="secondary"
                    >
                      Watch on YouTube Live
                    </Button>
                    <p className="text-xs opacity-75">
                      Click to watch the live stream on YouTube
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
