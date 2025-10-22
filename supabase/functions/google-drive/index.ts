import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[GOOGLE-DRIVE] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
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
      .eq("provider", "google_drive")
      .single();

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ 
          error: "Google Drive not connected",
          needsAuth: true 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    let accessToken = tokenData.access_token;

    // Handle different actions
    let response;
    switch (action) {
      case "list_files":
        response = await fetch(
          `https://www.googleapis.com/drive/v3/files?pageSize=${params.pageSize || 10}&fields=files(id,name,mimeType,modifiedTime,size)`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
        break;

      case "upload_file":
        // Upload would require multipart form data handling
        throw new Error("Upload not yet implemented");

      case "download_file":
        response = await fetch(
          `https://www.googleapis.com/drive/v3/files/${params.fileId}?alt=media`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    const data = await response.json();
    logStep("Google Drive response received");

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
