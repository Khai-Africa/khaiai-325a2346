import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Test emails edge function - sends all email templates for testing
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const testEmail = 'umojami@gmail.com';
    const templateKeys = [
      'welcome',
      'payment_confirmed',
      'cancellation_notice',
      'payment_reminder_monthly',
      'payment_reminder_yearly',
      'feature_announcement',
      'account_deletion'
    ];

    const results = [];

    for (const templateKey of templateKeys) {
      console.log(`Sending test email for template: ${templateKey}`);
      
      // Prepare sample variables for each template
      const variables: Record<string, any> = {
        user_name: 'Test User',
        app_name: 'Kai AI',
        plan_name: 'Premium',
        amount: '29.99',
        currency: 'USD',
        renewal_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        ticket_id: 'TEST-12345',
        response_message: 'This is a test response to your support ticket.',
      };

      try {
        const { data, error } = await supabase.functions.invoke('send-email', {
          body: {
            templateKey,
            recipientEmail: testEmail,
            recipientName: 'Test User',
            variables,
          },
        });

        if (error) {
          console.error(`Error sending ${templateKey}:`, error);
          results.push({ template: templateKey, status: 'error', error: error.message });
        } else {
          console.log(`Successfully sent ${templateKey}`);
          results.push({ template: templateKey, status: 'success' });
        }
      } catch (error) {
        console.error(`Exception sending ${templateKey}:`, error);
        results.push({ 
          template: templateKey, 
          status: 'error', 
          error: error instanceof Error ? error.message : String(error) 
        });
      }

      // Small delay between emails
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sent ${results.filter(r => r.status === 'success').length} test emails to ${testEmail}`,
        results 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error: any) {
    console.error("ERROR in test-emails:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
