import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useSubscription } from "./useSubscription";

interface UsageData {
  messageCount: number;
  limit: number;
  remaining: number;
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

    // Premium users have unlimited messages
    if (isPremium) {
      setUsage({
        messageCount: 0,
        limit: -1, // -1 indicates unlimited
        remaining: -1,
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
      const limit = 10; // Free tier limit
      const remaining = Math.max(0, limit - messageCount);

      // Calculate reset date (tomorrow at midnight)
      const resetDate = new Date();
      resetDate.setDate(resetDate.getDate() + 1);
      resetDate.setHours(0, 0, 0, 0);

      setUsage({
        messageCount,
        limit,
        remaining,
        resetDate,
      });
    } catch (error) {
      console.error("Error in useUsage:", error);
      setUsage({
        messageCount: 0,
        limit: 10,
        remaining: 10,
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
