"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { CheckCircle, Save, Play, Youtube, ExternalLink } from "lucide-react";

interface YouTubeStreamPlayerProps {
  tournamentId?: string;
  isLive?: boolean;
  title?: string;
  youtubeVideoId?: string;
  isAdmin?: boolean;
}

export function YouTubeStreamPlayer({
  tournamentId,
  isLive = false,
  title = "YouTube Live Stream",
  youtubeVideoId: initialYoutubeVideoId,
  isAdmin = false,
}: YouTubeStreamPlayerProps) {
  const [youtubeVideoId, setYoutubeVideoId] = useState<string>(
    initialYoutubeVideoId || ""
  );
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Save YouTube video ID (admin only)
  const saveYoutubeVideoId = async () => {
    if (!tournamentId || !youtubeVideoId || !isAdmin) return;

    try {
      setIsSaving(true);
      const { data, error } = await supabase.rpc(
        "update_youtube_stream_settings",
        {
          tournament_uuid: tournamentId,
          youtube_video_id: youtubeVideoId,
        }
      );

      if (error) {
        console.error("Error saving YouTube video ID:", error);
        alert("Error saving YouTube video ID: " + error.message);
        return;
      }

      if (data && data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        // Refresh the page to show the embedded stream
        window.location.reload();
      } else {
        alert(
          "Error saving YouTube video ID: " + (data?.message || "Unknown error")
        );
      }
    } catch (err) {
      console.error("Error saving YouTube video ID:", err);
      alert(
        "Error saving YouTube video ID: " +
          (err instanceof Error ? err.message : "Unknown error")
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Get YouTube embed URL
  const getYouTubeEmbedUrl = () => {
    if (youtubeVideoId) {
      return `https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&rel=0`;
    }
    return null;
  };

  const embedUrl = getYouTubeEmbedUrl();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Youtube className="h-5 w-5 text-red-600" />
            {title}
            {isLive && (
              <Badge variant="destructive" className="animate-pulse">
                LIVE
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {embedUrl && (
              <Badge variant="default" className="text-xs bg-green-600">
                <Play className="h-3 w-3 mr-1" />
                Live Stream
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* YouTube Live Stream Player */}
        <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
          {embedUrl ? (
            <iframe
              src={embedUrl}
              width="100%"
              height="100%"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              title="YouTube Live Stream"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white">
              <div className="text-center">
                <Youtube className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">
                  {isAdmin
                    ? "Configure YouTube Stream"
                    : "No Live Stream Available"}
                </p>
                <p className="text-sm opacity-75 mb-4">
                  {isAdmin
                    ? "Add your YouTube video ID to embed the live stream"
                    : "Check back later for live tournament coverage"}
                </p>
                {!isAdmin && (
                  <div className="space-y-2">
                    <Button
                      onClick={() =>
                        window.open("https://www.youtube.com/live", "_blank")
                      }
                      className="w-full"
                      variant="secondary"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Watch on YouTube Live
                    </Button>
                    <p className="text-xs opacity-75">
                      Click to watch live streams on YouTube
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Admin Configuration (Only for Admins) */}
        {isAdmin && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">
                YouTube Stream Configuration
              </span>
            </div>

            {/* YouTube Video ID Input */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="youtube-video-id"
                  className="text-sm font-medium"
                >
                  YouTube Video ID
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={saveYoutubeVideoId}
                  disabled={!youtubeVideoId || isSaving}
                >
                  <Save className="h-4 w-4 mr-1" />
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </div>
              <Input
                id="youtube-video-id"
                value={youtubeVideoId}
                onChange={(e) => setYoutubeVideoId(e.target.value)}
                placeholder="Enter YouTube video ID (e.g., rx4Nx7rSWOc)"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Get this from your live stream URL: youtube.com/watch?v=VIDEO_ID
              </p>
              {saveSuccess && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    YouTube video ID saved successfully! The live stream should
                    now appear above.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        )}

        {/* YouTube Live Benefits */}
        <Alert>
          <Youtube className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">YouTube Live Features:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>
                  High-quality streaming with automatic quality adjustment
                </li>
                <li>Built-in chat system for audience interaction</li>
                <li>Automatic recording and VOD creation</li>
                <li>Mobile app support for viewers</li>
                <li>Analytics and viewer insights</li>
                <li>Monetization options (Super Chat, Memberships)</li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
