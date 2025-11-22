import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[FLUTTERWAVE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const flutterwaveKey = Deno.env.get("FLUTTERWAVE_SECRET_KEY");
    if (!flutterwaveKey) throw new Error("FLUTTERWAVE_SECRET_KEY is not set");
    logStep("Flutterwave key verified");

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
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { amount, currency, planName } = await req.json();
    if (!amount || !currency) throw new Error("Amount and currency are required");
    logStep("Payment request", { amount, currency, planName });

    // Create transaction reference
    const txRef = `KAI-${user.id.slice(0, 8)}-${Date.now()}`;

    // Record transaction in database
    const { error: txError } = await supabaseClient
      .from("payment_transactions")
      .insert({
        user_id: user.id,
        amount,
        currency,
        provider: "flutterwave",
        status: "pending",
        reference: txRef,
        metadata: { planName }
      });

    if (txError) {
      logStep("Transaction insert error", txError);
      throw new Error(`Failed to record transaction: ${txError.message}`);
    }

    // Create Flutterwave payment
    const origin = req.headers.get("origin") || "http://localhost:3000";
    const flutterwaveResponse = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${flutterwaveKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tx_ref: txRef,
        amount: amount,
        currency: currency,
        redirect_url: `${origin}/premium?payment=success&ref=${txRef}`,
        cancel_url: `${origin}/premium?payment=canceled&ref=${txRef}`,
        customer: {
          email: user.email,
          name: user.user_metadata?.full_name || user.email.split("@")[0],
        },
        customizations: {
          title: "Khai AI Premium",
          description: `${planName || "Premium"} Subscription`,
          logo: `${origin}/kai-ai-logo.png`,
        },
        payment_options: currency === "XAF" ? "mobilemoneyghana,mobilemoneyuganda,mobilemoneyfranco" : "card,mobilemoney",
      }),
    });

    const flutterwaveData = await flutterwaveResponse.json();
    
    if (flutterwaveData.status !== "success") {
      logStep("Flutterwave error", flutterwaveData);
      throw new Error(flutterwaveData.message || "Failed to create payment");
    }

    logStep("Payment created successfully", { link: flutterwaveData.data.link });

    return new Response(
      JSON.stringify({ 
        url: flutterwaveData.data.link,
        reference: txRef 
      }),
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
