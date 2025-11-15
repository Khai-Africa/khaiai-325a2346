import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
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
    // Validate input with enhanced password requirements
    const resetSchema = z.object({
      email: z.string().trim().email().max(255),
      secretWord: z.string().trim().min(1).max(100),
      newPassword: z.string()
        .min(8, "Password must be at least 8 characters")
        .max(128, "Password must not exceed 128 characters")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[0-9]/, "Password must contain at least one number"),
    });

    const { email, secretWord, newPassword } = resetSchema.parse(await req.json());

    // Use service role key to access auth.users and profiles
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Find user by email
    const { data: { users }, error: getUserError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (getUserError) {
      console.error("Error fetching users:", getUserError);
      throw new Error("Failed to verify credentials");
    }

    // Generic error function to normalize timing and prevent user enumeration
    const returnAuthError = async () => {
      // Add consistent delay to prevent timing attacks (500ms minimum)
      const minDelay = 500 + Math.random() * 200; // 500-700ms
      await new Promise(resolve => setTimeout(resolve, minDelay));
      
      return new Response(
        JSON.stringify({ error: "Unable to reset password. Please verify your information." }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      );
    };

    const user = users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      return await returnAuthError();
    }

    // Verify secret word
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('secret_word')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error("Error fetching profile:", profileError);
      return await returnAuthError();
    }

    // Compare secret words (case-insensitive)
    if (profile.secret_word?.toLowerCase() !== secretWord.toLowerCase()) {
      return await returnAuthError();
    }

    // Update password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Error updating password:", updateError);
      throw new Error("Failed to update password");
    }

    console.log(`Password reset successful for user: ${user.id}`);

    return new Response(
      JSON.stringify({ success: true, message: "Password reset successfully" }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error("Error in reset-password function:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
