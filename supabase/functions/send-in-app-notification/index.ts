import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import Pusher from "https://esm.sh/pusher@5.1.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  actionUrl?: string;
  metadata?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId, title, message, type, actionUrl, metadata = {} }: NotificationRequest = await req.json();

    if (!userId || !title || !message || !type) {
      return new Response(
        JSON.stringify({ error: 'User ID, title, message, and type are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create notification in database
    const { data: notification, error: dbError } = await supabase
      .from('in_app_notifications')
      .insert({
        user_id: userId,
        title,
        message,
        type,
        action_url: actionUrl,
        metadata,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Error creating notification:', dbError);
      return new Response(
        JSON.stringify({ error: 'Failed to create notification' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send real-time notification via Pusher
    try {
      const pusher = new Pusher({
        appId: Deno.env.get('PUSHER_APP_ID') ?? '',
        key: Deno.env.get('PUSHER_KEY') ?? '',
        secret: Deno.env.get('PUSHER_SECRET') ?? '',
        cluster: Deno.env.get('PUSHER_CLUSTER') ?? '',
        useTLS: true,
      });

      await pusher.trigger(`user-${userId}`, 'notification:new', {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        actionUrl: notification.action_url,
        createdAt: notification.created_at,
      });

      console.log('Pusher notification sent successfully');
    } catch (pusherError) {
      console.error('Error sending Pusher notification:', pusherError);
      // Don't fail the request if Pusher fails
    }

    return new Response(
      JSON.stringify({ success: true, notification }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in send-in-app-notification function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
