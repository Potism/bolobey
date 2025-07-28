"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Users,
  Euro,
  Gift,
  Video,
  Crown,
  Star,
  Zap,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface TournamentType {
  id: number;
  name: string;
  description: string;
  category: "real" | "stream_only";
  entry_fee_eur: number;
  has_physical_prizes: boolean;
  has_stream_points_prizes: boolean;
  max_participants: number;
  default_duration_hours: number;
  features: string[];
}

interface TournamentTypeSelectorProps {
  selectedType: number | null;
  onTypeSelect: (type: TournamentType) => void;
  className?: string;
}

export function TournamentTypeSelector({
  selectedType,
  onTypeSelect,
  className = "",
}: TournamentTypeSelectorProps) {
  const [tournamentTypes, setTournamentTypes] = useState<TournamentType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTournamentTypes();
  }, []);

  const fetchTournamentTypes = async () => {
    try {
      const { data, error } = await supabase
        .from("tournament_types")
        .select("*")
        .eq("is_active", true)
        .order("category", { ascending: false })
        .order("entry_fee_eur", { ascending: false });

      if (error) {
        console.error("Error fetching tournament types:", error);
        return;
      }

      setTournamentTypes(data || []);
    } catch (error) {
      console.error("Error fetching tournament types:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "real":
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case "stream_only":
        return <Video className="h-5 w-5 text-blue-500" />;
      default:
        return <Star className="h-5 w-5 text-gray-500" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "real":
        return "border-yellow-500/20 bg-yellow-500/5";
      case "stream_only":
        return "border-blue-500/20 bg-blue-500/5";
      default:
        return "border-gray-500/20 bg-gray-500/5";
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "real":
        return (
          <Badge className="bg-yellow-600 text-white">Real Tournament</Badge>
        );
      case "stream_only":
        return <Badge className="bg-blue-600 text-white">Stream Only</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-500 mt-2">Loading tournament types...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="text-center">
        <h3 className="text-xl font-semibold text-white mb-2">
          Choose Tournament Type
        </h3>
        <p className="text-gray-400">
          Select the type of tournament you want to create
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tournamentTypes.map((type, index) => (
          <motion.div
            key={type.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card
              className={`cursor-pointer transition-all duration-200 ${
                selectedType === type.id
                  ? "ring-2 ring-blue-500 bg-blue-500/10"
                  : "hover:bg-slate-800/50"
              } ${getCategoryColor(type.category)}`}
              onClick={() => onTypeSelect(type)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(type.category)}
                    <CardTitle className="text-white text-lg">
                      {type.name}
                    </CardTitle>
                  </div>
                  {getCategoryBadge(type.category)}
                </div>
                <p className="text-gray-400 text-sm">{type.description}</p>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Entry Fee */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Entry Fee:</span>
                  <div className="flex items-center gap-1">
                    {type.entry_fee_eur > 0 ? (
                      <>
                        <Euro className="h-4 w-4 text-green-500" />
                        <span className="text-white font-medium">
                          {type.entry_fee_eur}
                        </span>
                      </>
                    ) : (
                      <span className="text-green-500 font-medium">Free</span>
                    )}
                  </div>
                </div>

                {/* Participants */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">
                    Max Participants:
                  </span>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4 text-blue-500" />
                    <span className="text-white font-medium">
                      {type.max_participants}
                    </span>
                  </div>
                </div>

                {/* Duration */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Duration:</span>
                  <span className="text-white font-medium">
                    {type.default_duration_hours >= 24
                      ? `${Math.floor(type.default_duration_hours / 24)} days`
                      : `${type.default_duration_hours} hours`}
                  </span>
                </div>

                {/* Prizes */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Prizes:</span>
                  <div className="flex items-center gap-2">
                    {type.has_physical_prizes && (
                      <Badge
                        variant="outline"
                        className="text-yellow-500 border-yellow-500"
                      >
                        <Gift className="h-3 w-3 mr-1" />
                        Physical
                      </Badge>
                    )}
                    {type.has_stream_points_prizes && (
                      <Badge
                        variant="outline"
                        className="text-blue-500 border-blue-500"
                      >
                        <Zap className="h-3 w-3 mr-1" />
                        Stream Points
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Features */}
                <div>
                  <span className="text-gray-400 text-sm">Features:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {type.features.slice(0, 3).map((feature, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                    {type.features.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{type.features.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Select Button */}
                <Button
                  className={`w-full ${
                    selectedType === type.id
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-slate-700 hover:bg-slate-600"
                  }`}
                >
                  {selectedType === type.id ? (
                    <>
                      <Crown className="h-4 w-4 mr-2" />
                      Selected
                    </>
                  ) : (
                    <>
                      <Star className="h-4 w-4 mr-2" />
                      Select Type
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Revenue Explanation */}
      <Card className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 border-blue-700">
        <CardContent className="p-6">
          <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
            <Euro className="h-5 w-5" />
            Revenue Model
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h5 className="text-yellow-400 font-medium mb-2">
                Real Tournaments
              </h5>
              <p className="text-gray-300">
                Entry fees + Betting revenue + Physical prizes
              </p>
            </div>
            <div>
              <h5 className="text-blue-400 font-medium mb-2">
                Stream Tournaments
              </h5>
              <p className="text-gray-300">
                Betting revenue only (no entry fees)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
