import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[FLUTTERWAVE-VERIFY] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const flutterwaveKey = Deno.env.get("FLUTTERWAVE_SECRET_KEY");
    if (!flutterwaveKey) throw new Error("FLUTTERWAVE_SECRET_KEY is not set");

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

    const { reference, transactionId } = await req.json();
    if (!reference && !transactionId) {
      throw new Error("Reference or transaction ID is required");
    }

    const verifyUrl = transactionId 
      ? `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`
      : `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${reference}`;

    logStep("Verifying transaction", { reference, transactionId });

    const verifyResponse = await fetch(verifyUrl, {
      headers: {
        Authorization: `Bearer ${flutterwaveKey}`,
      },
    });

    const verifyData = await verifyResponse.json();
    
    if (verifyData.status !== "success") {
      logStep("Verification failed", verifyData);
      throw new Error(verifyData.message || "Payment verification failed");
    }

    const { status, amount, currency, tx_ref } = verifyData.data;
    logStep("Transaction verified", { status, amount, currency, tx_ref });

    // Update transaction in database
    if (status === "successful") {
      const { error: updateError } = await supabaseClient
        .from("payment_transactions")
        .update({ 
          status: "completed",
          metadata: verifyData.data 
        })
        .eq("reference", tx_ref)
        .eq("user_id", user.id);

      if (updateError) {
        logStep("Database update error", updateError);
      } else {
        logStep("Transaction updated successfully");
      }
    }

    return new Response(
      JSON.stringify({ 
        success: status === "successful",
        status,
        amount,
        currency,
        reference: tx_ref
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
