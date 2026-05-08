import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { identifier, password } = await req.json();

    if (!identifier || !password) {
      throw new Error("Missing required parameters");
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Look up user by email, username, or mobile number
    let profile: { id: string } | null = null;
    let resolvedEmail: string | null = null;

    const looksLikeEmail = typeof identifier === "string" && identifier.includes("@");

    if (looksLikeEmail) {
      // Resolve directly from auth.users by email (case-insensitive)
      const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
      if (!listErr) {
        const match = list?.users?.find(
          (u) => u.email?.toLowerCase() === identifier.toLowerCase()
        );
        if (match) {
          profile = { id: match.id };
          resolvedEmail = match.email ?? null;
        }
      }
    } else {
      // Try username first, then mobile number
      const { data: usernameProfile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("username", identifier)
        .maybeSingle();

      if (usernameProfile) {
        profile = usernameProfile;
      } else {
        const { data: mobileProfile } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("mobile_number", identifier)
          .maybeSingle();
        profile = mobileProfile;
      }
    }

    // Generic error function to normalize timing and prevent user enumeration
    const returnAuthError = async () => {
      // Add consistent delay to prevent timing attacks (500ms minimum)
      const minDelay = 500 + Math.random() * 200; // 500-700ms
      await new Promise(resolve => setTimeout(resolve, minDelay));
      
      return new Response(
        JSON.stringify({ error: "Invalid credentials" }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      );
    };

    if (!profile) {
      return await returnAuthError();
    }

    // Resolve email if not already known
    if (!resolvedEmail) {
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(profile.id);
      if (userError || !userData.user?.email) {
        return await returnAuthError();
      }
      resolvedEmail = userData.user.email;
    }

    // Verify password by attempting to sign in
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email: resolvedEmail,
      password: password,
    });

    if (authError) {
      return await returnAuthError();
    }

    // Return the session
    return new Response(
      JSON.stringify({ 
        session: authData.session,
        user: authData.user 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error("Error in auth-login function:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});