import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useSubscription } from "./useSubscription";

interface UsageData {
  messageCount: number;
  imageCount: number;
  limit: number;
  imageLimit: number;
  remaining: number;
  imageRemaining: number;
  resetDate: Date;
}

export const useUsage = () => {
  const { user } = useAuth();
  const { isPremium, loading: subLoading } = useSubscription();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUsage = async () => {
    if (!user) {
      setUsage(null);
      setLoading(false);
      return;
    }

    // Premium users have unlimited messages and images
    if (isPremium) {
      setUsage({
        messageCount: 0,
        imageCount: 0,
        limit: -1, // -1 indicates unlimited
        imageLimit: -1,
        remaining: -1,
        imageRemaining: -1,
        resetDate: new Date(),
      });
      setLoading(false);
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from("user_usage")
        .select("*")
        .eq("user_id", user.id)
        .eq("usage_date", today)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching usage:", error);
        throw error;
      }

      const messageCount = data?.message_count || 0;
      const imageCount = data?.image_count || 0;
      const limit = 10; // Free tier message limit
      const imageLimit = 3; // Free tier image limit
      const remaining = Math.max(0, limit - messageCount);
      const imageRemaining = Math.max(0, imageLimit - imageCount);

      // Calculate reset date (tomorrow at midnight)
      const resetDate = new Date();
      resetDate.setDate(resetDate.getDate() + 1);
      resetDate.setHours(0, 0, 0, 0);

      setUsage({
        messageCount,
        imageCount,
        limit,
        imageLimit,
        remaining,
        imageRemaining,
        resetDate,
      });
    } catch (error) {
      console.error("Error in useUsage:", error);
      setUsage({
        messageCount: 0,
        imageCount: 0,
        limit: 10,
        imageLimit: 3,
        remaining: 10,
        imageRemaining: 3,
        resetDate: new Date(),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!subLoading) {
      fetchUsage();
    }
  }, [user, isPremium, subLoading]);

  return {
    usage,
    loading: loading || subLoading,
    refetch: fetchUsage,
  };
};
