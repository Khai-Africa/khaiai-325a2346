import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useSubscription } from "./useSubscription";

export const useCodexUsage = () => {
  const { user, session } = useAuth();
  const { isPremium } = useSubscription();
  const [usage, setUsage] = useState<{
    free_downloads_used: number;
    total_downloads: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUsage = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      let { data, error } = await supabase
        .from('user_codex_usage')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!data) {
        // No record exists, create one
        const { data: newUsage, error: insertError } = await supabase
          .from('user_codex_usage')
          .insert({ user_id: user.id })
          .select()
          .single();

        if (insertError) throw insertError;
        data = newUsage;
      } else if (error) {
        throw error;
      }

      setUsage(data);
    } catch (error) {
      console.error('Error fetching codex usage:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, [user]);

  const canDownload = isPremium || (usage?.free_downloads_used || 0) < 3;
  const freeDownloadsRemaining = Math.max(0, 3 - (usage?.free_downloads_used || 0));

  return {
    usage,
    loading,
    canDownload,
    freeDownloadsRemaining,
    isPremium,
    refetch: fetchUsage,
  };
};