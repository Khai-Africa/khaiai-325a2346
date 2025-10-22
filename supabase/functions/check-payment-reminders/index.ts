import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PAYMENT-REMINDERS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Cron job started");

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2025-08-27.basil',
    });

    // Get date 3 days from now
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const threeDaysTimestamp = Math.floor(threeDaysFromNow.getTime() / 1000);

    // Get date 4 days from now (to get subscriptions renewing in exactly 3 days)
    const fourDaysFromNow = new Date();
    fourDaysFromNow.setDate(fourDaysFromNow.getDate() + 4);
    const fourDaysTimestamp = Math.floor(fourDaysFromNow.getTime() / 1000);

    logStep("Checking subscriptions", { 
      threeDays: threeDaysFromNow.toISOString(),
      fourDays: fourDaysFromNow.toISOString() 
    });

    // Get all active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      status: 'active',
      limit: 100,
    });

    let remindersSent = 0;

    for (const subscription of subscriptions.data) {
      const renewalDate = subscription.current_period_end;
      
      // Check if renewal is between 3 and 4 days from now
      if (renewalDate >= threeDaysTimestamp && renewalDate < fourDaysTimestamp) {
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        
        if ('email' in customer && customer.email) {
          // Determine if monthly or yearly
          const interval = subscription.items.data[0]?.price?.recurring?.interval;
          const templateKey = interval === 'year' ? 'payment_reminder_yearly' : 'payment_reminder_monthly';
          
          const amount = subscription.items.data[0]?.price?.unit_amount || 0;
          const currency = subscription.items.data[0]?.price?.currency || 'usd';
          const planName = interval === 'year' ? 'Premium Yearly' : 'Premium Monthly';

          logStep("Sending reminder", { 
            email: customer.email, 
            template: templateKey,
            renewalDate: new Date(renewalDate * 1000).toISOString() 
          });

          try {
            // Send email reminder
            await supabase.functions.invoke('send-email', {
              body: {
                templateKey,
                recipientEmail: customer.email,
                variables: {
                  plan_name: planName,
                  renewal_date: new Date(renewalDate * 1000).toLocaleDateString(),
                  amount: (amount / 100).toFixed(2),
                  currency: currency.toUpperCase(),
                },
              },
            });

            // Get user ID from customer email
            const { data: userData } = await supabase.auth.admin.listUsers();
            const user = userData.users.find(u => u.email === customer.email);

            if (user) {
              // Send in-app notification
              await supabase.functions.invoke('send-in-app-notification', {
                body: {
                  userId: user.id,
                  title: 'Subscription Renewal Reminder',
                  message: `Your ${planName} subscription renews in 3 days.`,
                  type: 'info',
                  actionUrl: '/premium',
                },
              });
            }

            remindersSent++;
            logStep("Reminder sent successfully", { email: customer.email });
          } catch (error) {
            logStep("Error sending reminder", { 
              email: customer.email, 
              error: error instanceof Error ? error.message : String(error) 
            });
          }
        }
      }
    }

    logStep("Cron job completed", { remindersSent });

    return new Response(
      JSON.stringify({ 
        success: true, 
        remindersSent,
        message: `Sent ${remindersSent} payment reminders` 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error: any) {
    logStep("ERROR in check-payment-reminders", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
