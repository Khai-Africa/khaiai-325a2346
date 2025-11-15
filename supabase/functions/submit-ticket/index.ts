import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const pusherSecret = Deno.env.get('PUSHER_SECRET')!;
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Validate input
    const ticketSchema = z.object({
      subject: z.string().trim().min(1).max(200),
      message: z.string().trim().min(1).max(5000),
      priority: z.enum(['low', 'medium', 'high']).optional(),
    });

    const { subject, message, priority } = ticketSchema.parse(await req.json());

    // Create ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .insert({
        user_id: user.id,
        subject,
        message,
        priority: priority || 'medium',
        status: 'open',
      })
      .select()
      .single();

    if (ticketError) {
      console.error('Error creating ticket:', ticketError);
      throw ticketError;
    }

    console.log('Ticket created:', ticket.id);

    // Send Pusher notification to admins
    try {
      // Note: Pusher API integration would go here
      // For now, we'll just log it
      console.log('Would send Pusher notification for ticket:', ticket.id);
      
      // In production, you would use Pusher's REST API:
      // await fetch('https://api.pusher.com/apps/YOUR_APP_ID/events', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': pusherAuth,
      //   },
      //   body: JSON.stringify({
      //     name: 'new-ticket',
      //     channel: 'admin-notifications',
      //     data: {
      //       ticket_id: ticket.id,
      //       subject: ticket.subject,
      //       user_id: user.id,
      //     }
      //   })
      // });
    } catch (pusherError) {
      console.error('Error sending Pusher notification:', pusherError);
      // Don't fail the request if Pusher fails
    }

    return new Response(
      JSON.stringify({ success: true, ticket }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in submit-ticket:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});