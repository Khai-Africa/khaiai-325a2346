import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[GOOGLE-CALENDAR] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const { action, ...params } = await req.json();
    logStep("Action requested", { action });

    // Get user's Google tokens
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from("user_tokens")
      .select("*")
      .eq("user_id", user.id)
      .eq("provider", "google_calendar")
      .single();

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ 
          error: "Google Calendar not connected",
          needsAuth: true 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    // Check if token is expired and refresh if needed
    let accessToken = tokenData.access_token;
    if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
      logStep("Token expired, refreshing...");
      
      if (!tokenData.refresh_token) {
        return new Response(
          JSON.stringify({ 
            error: "Token expired and no refresh token available",
            needsAuth: true 
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 401,
          }
        );
      }

      // Refresh the token
      const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: Deno.env.get("GOOGLE_CLIENT_ID") ?? "",
          client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "",
          refresh_token: tokenData.refresh_token,
          grant_type: "refresh_token",
        }),
      });

      const refreshData = await refreshResponse.json();
      if (refreshData.error) {
        return new Response(
          JSON.stringify({ 
            error: "Failed to refresh token",
            needsAuth: true 
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 401,
          }
        );
      }

      accessToken = refreshData.access_token;

      // Update the stored token
      await supabaseClient
        .from("user_tokens")
        .update({
          access_token: refreshData.access_token,
          expires_at: new Date(Date.now() + (refreshData.expires_in * 1000)).toISOString(),
        })
        .eq("user_id", user.id)
        .eq("provider", "google_calendar");
      
      logStep("Token refreshed successfully");
    }

    // Handle different actions
    let response;
    switch (action) {
      case "list_events":
        response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=${params.maxResults || 10}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
        break;

      case "create_event":
        response = await fetch(
          "https://www.googleapis.com/calendar/v3/calendars/primary/events",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              summary: params.title,
              description: params.description,
              start: {
                dateTime: params.startTime,
                timeZone: params.timeZone || "UTC",
              },
              end: {
                dateTime: params.endTime,
                timeZone: params.timeZone || "UTC",
              },
            }),
          }
        );
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    const data = await response.json();
    logStep("Google Calendar response received");

    return new Response(
      JSON.stringify(data),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
