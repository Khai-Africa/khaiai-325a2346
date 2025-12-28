import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { encode as base64Encode } from "https://deno.land/std@0.190.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, verif-hash",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[FLUTTERWAVE-WEBHOOK] ${step}${detailsStr}`);
};

// Encryption utility for sensitive metadata
async function encryptMetadata(data: object): Promise<string> {
  const keyString = Deno.env.get("ENCRYPTION_KEY");
  if (!keyString) {
    // If no encryption key, store as regular JSON (backward compatibility)
    logStep("Warning: ENCRYPTION_KEY not set, storing metadata unencrypted");
    return JSON.stringify({ unencrypted: true, data });
  }
  
  // Derive a 256-bit key from the secret using SHA-256
  const keyData = new TextEncoder().encode(keyString);
  const hashBuffer = await crypto.subtle.digest("SHA-256", keyData);
  
  const key = await crypto.subtle.importKey(
    "raw",
    hashBuffer,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintextBytes = new TextEncoder().encode(JSON.stringify(data));
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintextBytes
  );
  
  // Combine IV + ciphertext and encode as base64
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  
  return JSON.stringify({ encrypted: true, data: base64Encode(combined.buffer) });
}

// Filter sensitive fields from payment metadata
function sanitizePaymentMetadata(data: any): object {
  // Remove potentially sensitive fields before storage
  const sanitized = { ...data };
  
  // Remove sensitive payment details that shouldn't be stored
  delete sanitized.card;
  delete sanitized.authorization;
  delete sanitized.customer?.phone;
  
  return {
    tx_id: sanitized.id,
    tx_ref: sanitized.tx_ref,
    flw_ref: sanitized.flw_ref,
    amount: sanitized.amount,
    currency: sanitized.currency,
    status: sanitized.status,
    payment_type: sanitized.payment_type,
    created_at: sanitized.created_at,
    customer_email: sanitized.customer?.email,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const flutterwaveKey = Deno.env.get("FLUTTERWAVE_SECRET_KEY");
    if (!flutterwaveKey) throw new Error("FLUTTERWAVE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify webhook signature
    const signature = req.headers.get("verif-hash");
    const secretHash = Deno.env.get("FLUTTERWAVE_WEBHOOK_SECRET") || flutterwaveKey;
    
    if (!signature) {
      logStep("Missing signature header");
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    
    if (signature !== secretHash) {
      logStep("Invalid signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const payload = await req.json();
    logStep("Webhook payload", { event: payload.event, txRef: payload.data?.tx_ref });

    if (payload.event === "charge.completed" && payload.data.status === "successful") {
      const { tx_ref, amount, currency } = payload.data;

      // Sanitize and encrypt metadata before storing
      const sanitizedMetadata = sanitizePaymentMetadata(payload.data);
      const encryptedMetadata = await encryptMetadata(sanitizedMetadata);

      // Update transaction status with encrypted metadata
      const { data: transaction, error: txError } = await supabaseClient
        .from("payment_transactions")
        .update({ 
          status: "completed",
          metadata: JSON.parse(encryptedMetadata)
        })
        .eq("reference", tx_ref)
        .select()
        .single();

      if (txError) {
        logStep("Transaction update error", txError);
        throw new Error(`Failed to update transaction: ${txError.message}`);
      }

      logStep("Transaction updated with encrypted metadata", { userId: transaction.user_id });

      // Get user email for notification
      const { data: userData } = await supabaseClient.auth.admin.getUserById(transaction.user_id);
      
      if (userData?.user?.email) {
        // Send payment confirmation email
        try {
          await supabaseClient.functions.invoke('send-email', {
            body: {
              templateKey: 'payment_confirmed',
              recipientEmail: userData.user.email,
              userId: transaction.user_id,
              variables: {
                plan_name: 'Premium',
                amount: amount.toString(),
                currency: currency,
                subscription_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              },
            },
          });
          logStep("Payment confirmation email sent");
        } catch (emailError) {
          logStep("Email send error", emailError);
        }

        // Send in-app notification
        try {
          await supabaseClient.functions.invoke('send-in-app-notification', {
            body: {
              userId: transaction.user_id,
              title: 'Payment Confirmed! ✅',
              message: `Your payment of ${amount} ${currency} was successful. Welcome to Premium!`,
              type: 'success',
              actionUrl: '/premium',
            },
          });
          logStep("In-app notification sent");
        } catch (notifError) {
          logStep("Notification error", notifError);
        }
      }

      logStep("Payment successful", { 
        userId: transaction.user_id, 
        amount, 
        currency 
      });
    }

    return new Response(
      JSON.stringify({ received: true }),
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
