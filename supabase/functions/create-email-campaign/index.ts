import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CampaignRequest {
  campaignName: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  targetAudience: 'all' | 'free' | 'premium_monthly' | 'premium_yearly' | 'specific_users';
  targetUserIds?: string[];
  scheduledAt?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify admin user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate input
    const campaignSchema = z.object({
      campaignName: z.string().trim().min(1).max(200),
      subject: z.string().trim().min(1).max(500),
      htmlContent: z.string().trim().min(1).max(50000),
      textContent: z.string().max(50000).optional(),
      targetAudience: z.enum(['all', 'free', 'premium_monthly', 'premium_yearly', 'specific_users']),
      targetUserIds: z.array(z.string().uuid()).max(1000).optional().default([]),
      scheduledAt: z.string().datetime().optional(),
    });

    const body = await req.json();
    const {
      campaignName,
      subject,
      htmlContent,
      textContent,
      targetAudience,
      targetUserIds = [],
      scheduledAt,
    } = campaignSchema.parse(body);

    // Create campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .insert({
        admin_id: user.id,
        campaign_name: campaignName,
        subject,
        html_content: htmlContent,
        text_content: textContent,
        target_audience: targetAudience,
        target_user_ids: targetUserIds,
        scheduled_at: scheduledAt || null,
        status: scheduledAt ? 'scheduled' : 'draft',
      })
      .select()
      .single();

    if (campaignError) {
      console.error('Error creating campaign:', campaignError);
      return new Response(
        JSON.stringify({ error: 'Failed to create campaign' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, campaign }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in create-email-campaign function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
