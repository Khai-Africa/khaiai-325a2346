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

    // Look up user by username or mobile number - use safe query builder to prevent SQL injection
    let profile = null;
    
    // Try username first
    const { data: usernameProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("username", identifier)
      .maybeSingle();
    
    if (usernameProfile) {
      profile = usernameProfile;
    } else {
      // Try mobile number
      const { data: mobileProfile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("mobile_number", identifier)
        .maybeSingle();
      
      profile = mobileProfile;
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

    // Get the user's email from auth.users
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(profile.id);
    
    if (userError || !userData.user?.email) {
      return await returnAuthError();
    }

    // Verify password by attempting to sign in
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email: userData.user.email,
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