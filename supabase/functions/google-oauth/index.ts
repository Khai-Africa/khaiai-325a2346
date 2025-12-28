import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { encode as base64Encode, decode as base64Decode } from "https://deno.land/std@0.190.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Encryption utilities using AES-GCM
async function getEncryptionKey(): Promise<CryptoKey> {
  const keyString = Deno.env.get("ENCRYPTION_KEY");
  if (!keyString) {
    throw new Error("ENCRYPTION_KEY is not configured");
  }
  
  // Derive a 256-bit key from the secret using SHA-256
  const keyData = new TextEncoder().encode(keyString);
  const hashBuffer = await crypto.subtle.digest("SHA-256", keyData);
  
  return crypto.subtle.importKey(
    "raw",
    hashBuffer,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptToken(plaintext: string): Promise<string> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM
  const plaintextBytes = new TextEncoder().encode(plaintext);
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintextBytes
  );
  
  // Combine IV + ciphertext and encode as base64
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  
  return base64Encode(combined.buffer);
}

async function decryptToken(encryptedData: string): Promise<string> {
  const key = await getEncryptionKey();
  const combinedArray = base64Decode(encryptedData);
  
  // Extract IV (first 12 bytes) and ciphertext
  const iv = combinedArray.slice(0, 12);
  const ciphertext = combinedArray.slice(12);
  
  const plaintextBytes = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );
  
  return new TextDecoder().decode(plaintextBytes);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Authentication failed");

    const { action, code, service } = await req.json();

    if (action === "initiate") {
      // Generate OAuth URL
      const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
      const redirectUri = `${Deno.env.get("APP_URL")}/google-auth`;
      
      const scopes = service === "drive" 
        ? ["https://www.googleapis.com/auth/drive.file", "https://www.googleapis.com/auth/drive.readonly"]
        : ["https://www.googleapis.com/auth/calendar", "https://www.googleapis.com/auth/calendar.events"];

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent(scopes.join(" "))}&` +
        `access_type=offline&` +
        `prompt=consent&` +
        `state=${service}`;

      return new Response(
        JSON.stringify({ authUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "exchange") {
      // Exchange code for tokens
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: Deno.env.get("GOOGLE_CLIENT_ID") ?? "",
          client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "",
          redirect_uri: `${Deno.env.get("APP_URL")}/google-auth`,
          grant_type: "authorization_code",
        }),
      });

      const tokens = await tokenResponse.json();
      
      if (tokens.error) {
        throw new Error(`Token exchange failed: ${tokens.error}`);
      }

      // Encrypt tokens before storing
      const encryptedAccessToken = await encryptToken(tokens.access_token);
      const encryptedRefreshToken = tokens.refresh_token 
        ? await encryptToken(tokens.refresh_token) 
        : null;

      // Store encrypted tokens in database
      const provider = service === "drive" ? "google_drive" : "google_calendar";
      const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000));

      const { error: upsertError } = await supabaseClient
        .from("user_tokens")
        .upsert({
          user_id: userData.user.id,
          provider,
          access_token: encryptedAccessToken,
          refresh_token: encryptedRefreshToken,
          expires_at: expiresAt.toISOString(),
        }, {
          onConflict: "user_id,provider"
        });

      if (upsertError) throw upsertError;

      console.log(`OAuth tokens encrypted and stored for user: ${userData.user.id}, provider: ${provider}`);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "get_token") {
      // Retrieve and decrypt token for use
      const provider = service === "drive" ? "google_drive" : "google_calendar";
      
      const { data: tokenData, error: tokenError } = await supabaseClient
        .from("user_tokens")
        .select("access_token, refresh_token, expires_at")
        .eq("user_id", userData.user.id)
        .eq("provider", provider)
        .single();

      if (tokenError || !tokenData) {
        throw new Error("No token found for this service");
      }

      // Decrypt the access token
      const decryptedAccessToken = await decryptToken(tokenData.access_token);
      
      // Check if token is expired and needs refresh
      const expiresAt = new Date(tokenData.expires_at);
      if (expiresAt < new Date()) {
        if (!tokenData.refresh_token) {
          throw new Error("Token expired and no refresh token available");
        }
        
        // Decrypt refresh token and get new access token
        const decryptedRefreshToken = await decryptToken(tokenData.refresh_token);
        
        const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: Deno.env.get("GOOGLE_CLIENT_ID") ?? "",
            client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "",
            refresh_token: decryptedRefreshToken,
            grant_type: "refresh_token",
          }),
        });

        const refreshData = await refreshResponse.json();
        
        if (refreshData.error) {
          throw new Error(`Token refresh failed: ${refreshData.error}`);
        }

        // Encrypt and store new access token
        const newEncryptedAccessToken = await encryptToken(refreshData.access_token);
        const newExpiresAt = new Date(Date.now() + (refreshData.expires_in * 1000));

        await supabaseClient
          .from("user_tokens")
          .update({
            access_token: newEncryptedAccessToken,
            expires_at: newExpiresAt.toISOString(),
          })
          .eq("user_id", userData.user.id)
          .eq("provider", provider);

        return new Response(
          JSON.stringify({ access_token: refreshData.access_token }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ access_token: decryptedAccessToken }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Invalid action");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in google-oauth:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
