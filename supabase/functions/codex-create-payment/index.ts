import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const { fileIds, projectId, provider = "stripe" } = await req.json();

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    // Base price: 500 XAF = ~0.83 USD
    const amount = 0.83;
    const currency = "usd";

    if (provider === "stripe") {
      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
        apiVersion: "2025-08-27.basil",
      });

      // Check for existing customer
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      let customerId;
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      }

      // Create payment session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        line_items: [
          {
            price_data: {
              currency: currency,
              product_data: {
                name: "Codex File Download",
                description: `Download ${fileIds.length} file(s) from your project`,
              },
              unit_amount: Math.round(amount * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${req.headers.get("origin")}/codex?payment=success&fileIds=${fileIds.join(",")}&projectId=${projectId}`,
        cancel_url: `${req.headers.get("origin")}/codex?payment=canceled`,
        metadata: {
          fileIds: JSON.stringify(fileIds),
          projectId: projectId,
          userId: user.id,
        },
      });

      return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else if (provider === "flutterwave") {
      // Flutterwave implementation
      const convertedAmount = 500; // 500 XAF
      
      const { data: flutterwaveData, error: flutterwaveError } = await supabaseClient.functions.invoke("flutterwave-checkout", {
        body: {
          amount: convertedAmount,
          currency: "XAF",
          planName: "Codex File Download",
          metadata: {
            fileIds: JSON.stringify(fileIds),
            projectId: projectId,
            userId: user.id,
          },
        },
        headers: {
          Authorization: authHeader,
        },
      });

      if (flutterwaveError) throw flutterwaveError;

      return new Response(JSON.stringify({ url: flutterwaveData.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    throw new Error("Invalid payment provider");
  } catch (error: any) {
    console.error("Checkout error:", error);
    return new Response(JSON.stringify({ error: error.message || "Failed to create checkout session" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
