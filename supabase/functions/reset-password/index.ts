import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// In-memory rate limiting store (resets on function cold start)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limit configuration
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS_PER_WINDOW = 5; // 5 attempts per 15 minutes per IP
const MAX_ATTEMPTS_PER_EMAIL = 3; // 3 attempts per email per 15 minutes

function getRateLimitKey(ip: string, email?: string): string {
  return email ? `email:${email.toLowerCase()}` : `ip:${ip}`;
}

function checkRateLimit(key: string, maxAttempts: number): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  // Clean up expired entries
  if (record && now > record.resetTime) {
    rateLimitStore.delete(key);
  }

  const currentRecord = rateLimitStore.get(key);

  if (!currentRecord) {
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }

  if (currentRecord.count >= maxAttempts) {
    const retryAfter = Math.ceil((currentRecord.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }

  currentRecord.count++;
  return { allowed: true };
}

function getClientIP(req: Request): string {
  // Check various headers for the real IP (behind proxies/load balancers)
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  // Fallback to a default (in edge functions, we may not have direct IP access)
  return 'unknown';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIP = getClientIP(req);

  // Check IP-based rate limit first (before parsing body)
  const ipRateLimit = checkRateLimit(getRateLimitKey(clientIP), MAX_ATTEMPTS_PER_WINDOW);
  if (!ipRateLimit.allowed) {
    console.warn(`Rate limit exceeded for IP: ${clientIP}`);
    return new Response(
      JSON.stringify({ 
        error: "Too many password reset attempts. Please try again later.",
        retryAfter: ipRateLimit.retryAfter 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Retry-After': String(ipRateLimit.retryAfter)
        },
        status: 429 
      }
    );
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

    // Check email-based rate limit
    const emailRateLimit = checkRateLimit(getRateLimitKey(clientIP, email), MAX_ATTEMPTS_PER_EMAIL);
    if (!emailRateLimit.allowed) {
      console.warn(`Rate limit exceeded for email: ${email}`);
      return new Response(
        JSON.stringify({ 
          error: "Too many password reset attempts for this email. Please try again later.",
          retryAfter: emailRateLimit.retryAfter 
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': String(emailRateLimit.retryAfter)
          },
          status: 429 
        }
      );
    }

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

    // Verify secret word using secure database function (compares against hashed value)
    const { data: verifyResult, error: verifyError } = await supabaseAdmin
      .rpc('verify_secret_word', {
        user_id: user.id,
        provided_secret: secretWord
      });

    if (verifyError) {
      console.error("Error verifying secret word:", verifyError);
      return await returnAuthError();
    }

    if (!verifyResult) {
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
