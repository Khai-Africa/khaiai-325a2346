import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, verif-hash",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[FLUTTERWAVE-WEBHOOK] ${step}${detailsStr}`);
};

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

      // Update transaction status
      const { data: transaction, error: txError } = await supabaseClient
        .from("payment_transactions")
        .update({ 
          status: "completed",
          metadata: payload.data 
        })
        .eq("reference", tx_ref)
        .select()
        .single();

      if (txError) {
        logStep("Transaction update error", txError);
        throw new Error(`Failed to update transaction: ${txError.message}`);
      }

      logStep("Transaction updated", { userId: transaction.user_id });

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
