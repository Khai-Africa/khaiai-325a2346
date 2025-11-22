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

    // First, check if transaction exists in our database
    const { data: localTx, error: localError } = await supabaseClient
      .from("payment_transactions")
      .select("*")
      .eq("reference", reference || transactionId)
      .eq("user_id", user.id)
      .single();

    if (localError || !localTx) {
      logStep("Transaction not found in database", { reference, transactionId });
      throw new Error("Transaction not found. Please try upgrading again.");
    }

    logStep("Local transaction found", { 
      status: localTx.status,
      reference: localTx.reference,
      created_at: localTx.created_at 
    });

    // If already completed, return success
    if (localTx.status === "completed") {
      logStep("Transaction already completed");
      return new Response(
        JSON.stringify({ 
          success: true,
          status: "successful",
          amount: localTx.amount,
          currency: localTx.currency,
          reference: localTx.reference,
          alreadyCompleted: true
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // If already failed, return failure without calling Flutterwave
    if (localTx.status === "failed") {
      logStep("Transaction already marked as failed");
      return new Response(
        JSON.stringify({ 
          success: false,
          status: "failed",
          message: "This payment was not completed. Please try upgrading again with a new payment.",
          reference: localTx.reference,
          alreadyFailed: true
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const verifyUrl = transactionId 
      ? `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`
      : `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${reference}`;

    logStep("Verifying transaction with Flutterwave", { reference, transactionId });

    const verifyResponse = await fetch(verifyUrl, {
      headers: {
        Authorization: `Bearer ${flutterwaveKey}`,
      },
    });

    const verifyData = await verifyResponse.json();
    
    if (verifyData.status !== "success") {
      logStep("Flutterwave verification failed", verifyData);
      
      // Check if it's because payment wasn't completed
      if (verifyData.message?.includes("No transaction was found")) {
        // Mark as failed in our database
        await supabaseClient
          .from("payment_transactions")
          .update({ status: "failed" })
          .eq("reference", reference || transactionId)
          .eq("user_id", user.id);
        
        throw new Error("Payment was not completed. Please try again and complete the payment on the Flutterwave page.");
      }
      
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
