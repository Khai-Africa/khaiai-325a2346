import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileIds, projectId, currency, paymentProvider } = await req.json();

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check subscription status
    const { data: subscriptionData } = await supabase.functions.invoke('check-subscription', {
      headers: { Authorization: authHeader },
    });

    const isPremium = subscriptionData?.subscribed || false;

    // Get or create usage record
    let { data: usage, error: usageError } = await supabase
      .from('user_codex_usage')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (usageError || !usage) {
      const { data: newUsage } = await supabase
        .from('user_codex_usage')
        .insert({ user_id: user.id })
        .select()
        .single();
      usage = newUsage;
    }

    // Premium users get unlimited downloads
    if (isPremium) {
      await supabase
        .from('user_codex_usage')
        .update({ total_downloads: (usage.total_downloads || 0) + 1 })
        .eq('user_id', user.id);

      await supabase
        .from('codex_downloads')
        .insert({
          user_id: user.id,
          project_id: projectId,
          file_ids: fileIds,
          download_type: fileIds.length > 1 ? 'multiple' : 'single',
          amount_charged: 0,
          currency: currency,
          payment_provider: 'free',
        });

      return new Response(JSON.stringify({ authorized: true, isPremium: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Free users - check download limit
    const freeDownloadsUsed = usage.free_downloads_used || 0;
    
    if (freeDownloadsUsed < 3) {
      // User still has free downloads
      await supabase
        .from('user_codex_usage')
        .update({ 
          free_downloads_used: freeDownloadsUsed + 1,
          total_downloads: (usage.total_downloads || 0) + 1
        })
        .eq('user_id', user.id);

      await supabase
        .from('codex_downloads')
        .insert({
          user_id: user.id,
          project_id: projectId,
          file_ids: fileIds,
          download_type: fileIds.length > 1 ? 'multiple' : 'single',
          amount_charged: 0,
          currency: currency,
          payment_provider: 'free',
        });

      return new Response(JSON.stringify({ 
        authorized: true, 
        isPremium: false,
        freeDownloadsRemaining: 3 - (freeDownloadsUsed + 1)
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // User needs to pay - initiate payment
    // Base price is 500 XAF
    const basePrice = 500;
    
    // For Flutterwave, use XAF directly; for Stripe, convert to USD
    const amount = currency === 'XAF' ? basePrice : Math.round(basePrice / 600); // ~0.83 USD
    
    return new Response(JSON.stringify({ 
      authorized: false,
      requiresPayment: true,
      amount: amount,
      currency: currency,
      message: 'Payment required for download'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in codex-download-payment:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});