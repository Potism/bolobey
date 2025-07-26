"use client";

import { useState, useEffect } from "react";
import { Heart, HeartOff } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/hooks/useAuth";

interface WishlistItem {
  id: string;
  prize_id: string;
  user_id: string;
  created_at: string;
  prize: {
    id: string;
    name: string;
    description: string;
    points_cost: number;
    category: string;
    image_url?: string;
    stock_quantity: number;
    is_featured: boolean;
  };
}

export default function PrizeWishlist() {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchWishlist();
    }
  }, [user]);

  const fetchWishlist = async () => {
    try {
      const { data, error } = await supabase
        .from("prize_wishlist")
        .select(
          `
          id,
          prize_id,
          user_id,
          created_at,
          prize:prizes(*)
        `
        )
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setWishlist((data as WishlistItem[]) || []);
    } catch (error) {
      console.error("Error fetching wishlist:", error);
    } finally {
      setLoading(false);
    }
  };

  const addToWishlist = async (prizeId: string) => {
    try {
      const { error } = await supabase.from("prize_wishlist").insert({
        user_id: user?.id,
        prize_id: prizeId,
      });

      if (error) throw error;

      // Refresh wishlist
      fetchWishlist();
    } catch (error) {
      console.error("Error adding to wishlist:", error);
    }
  };

  const removeFromWishlist = async (wishlistItemId: string) => {
    try {
      const { error } = await supabase
        .from("prize_wishlist")
        .delete()
        .eq("id", wishlistItemId);

      if (error) throw error;

      setWishlist((prev) => prev.filter((item) => item.id !== wishlistItemId));
    } catch (error) {
      console.error("Error removing from wishlist:", error);
    }
  };

  const isInWishlist = (prizeId: string) => {
    return wishlist.some((item) => item.prize_id === prizeId);
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      gaming: "bg-blue-100 text-blue-800",
      electronics: "bg-purple-100 text-purple-800",
      clothing: "bg-green-100 text-green-800",
      accessories: "bg-orange-100 text-orange-800",
      collectibles: "bg-red-100 text-red-800",
      other: "bg-gray-100 text-gray-800",
    };
    return colors[category] || colors.other;
  };

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Wishlist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Please log in to view your wishlist.</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Wishlist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5" />
          Wishlist ({wishlist.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {wishlist.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Heart className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Your wishlist is empty</p>
            <p className="text-sm">Add prizes you want to save for later!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {wishlist.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                {item.prize.image_url && (
                  <img
                    src={item.prize.image_url}
                    alt={item.prize.name}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium truncate">{item.prize.name}</h3>
                    {item.prize.is_featured && (
                      <Badge variant="secondary" className="text-xs">
                        Featured
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                    {item.prize.description}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge className={getCategoryColor(item.prize.category)}>
                      {item.prize.category}
                    </Badge>
                    <span className="text-sm font-medium text-blue-600">
                      {item.prize.points_cost} points
                    </span>
                    <span className="text-sm text-gray-500">
                      Stock: {item.prize.stock_quantity}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeFromWishlist(item.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <HeartOff className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
