import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2025-08-27.basil',
    });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const signature = req.headers.get('stripe-signature');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!webhookSecret) {
      logStep("WARNING: No webhook secret configured");
    }

    const body = await req.text();
    let event: Stripe.Event;

    // Verify webhook signature if secret is configured
    if (webhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
        logStep("Signature verified");
      } catch (err) {
        logStep("Signature verification failed", { error: err instanceof Error ? err.message : String(err) });
        return new Response(
          JSON.stringify({ error: 'Webhook signature verification failed' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      event = JSON.parse(body);
      logStep("Processing unverified webhook (no secret configured)");
    }

    logStep("Event type", { type: event.type });

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout completed", { 
          customerId: session.customer, 
          mode: session.mode 
        });

        if (session.mode === 'subscription' && session.customer) {
          const customer = await stripe.customers.retrieve(session.customer as string);
          
          if ('email' in customer && customer.email) {
            // Get subscription details
            const subscriptions = await stripe.subscriptions.list({
              customer: session.customer as string,
              status: 'active',
              limit: 1,
            });

            if (subscriptions.data.length > 0) {
              const subscription = subscriptions.data[0];
              const amount = subscription.items.data[0]?.price?.unit_amount || 0;
              const currency = subscription.items.data[0]?.price?.currency || 'usd';
              const interval = subscription.items.data[0]?.price?.recurring?.interval;
              const planName = interval === 'year' ? 'Premium Yearly' : 'Premium Monthly';

              // Send payment confirmation email
              try {
                await supabase.functions.invoke('send-email', {
                  body: {
                    templateKey: 'payment_confirmed',
                    recipientEmail: customer.email,
                    variables: {
                      plan_name: planName,
                      amount: (amount / 100).toFixed(2),
                      currency: currency.toUpperCase(),
                      subscription_end: new Date(subscription.current_period_end * 1000).toLocaleDateString(),
                    },
                  },
                });
                logStep("Payment confirmation email sent");
              } catch (emailError) {
                logStep("Email error", emailError);
              }

              // Get user and send notification
              const { data: userData } = await supabase.auth.admin.listUsers();
              const user = userData.users.find(u => u.email === customer.email);

              if (user) {
                try {
                  await supabase.functions.invoke('send-in-app-notification', {
                    body: {
                      userId: user.id,
                      title: 'Payment Confirmed! ✅',
                      message: `Thank you for upgrading to ${planName}!`,
                      type: 'success',
                      actionUrl: '/premium',
                    },
                  });
                  logStep("In-app notification sent");
                } catch (notifError) {
                  logStep("Notification error", notifError);
                }
              }
            }
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription cancelled", { subscriptionId: subscription.id });

        const customer = await stripe.customers.retrieve(subscription.customer as string);
        
        if ('email' in customer && customer.email) {
          const interval = subscription.items.data[0]?.price?.recurring?.interval;
          const planName = interval === 'year' ? 'Premium Yearly' : 'Premium Monthly';
          const endDate = new Date(subscription.current_period_end * 1000).toLocaleDateString();

          // Send cancellation email
          try {
            await supabase.functions.invoke('send-email', {
              body: {
                templateKey: 'cancellation_notice',
                recipientEmail: customer.email,
                variables: {
                  plan_name: planName,
                  end_date: endDate,
                },
              },
            });
            logStep("Cancellation email sent");
          } catch (emailError) {
            logStep("Email error", emailError);
          }

          // Get user and send notification
          const { data: userData } = await supabase.auth.admin.listUsers();
          const user = userData.users.find(u => u.email === customer.email);

          if (user) {
            try {
              await supabase.functions.invoke('send-in-app-notification', {
                body: {
                  userId: user.id,
                  title: 'Subscription Cancelled',
                  message: `Your ${planName} subscription has been cancelled. Access continues until ${endDate}.`,
                  type: 'warning',
                  actionUrl: '/premium',
                },
              });
              logStep("In-app notification sent");
            } catch (notifError) {
              logStep("Notification error", notifError);
            }
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription updated", { 
          subscriptionId: subscription.id, 
          status: subscription.status 
        });
        
        // You can add additional handling here if needed
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(
      JSON.stringify({ received: true }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
