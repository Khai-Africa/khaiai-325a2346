import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  templateKey: string;
  recipientEmail: string;
  recipientName?: string;
  userId?: string;
  variables?: Record<string, string>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { templateKey, recipientEmail, recipientName, userId, variables = {} }: EmailRequest = await req.json();

    if (!templateKey || !recipientEmail) {
      return new Response(
        JSON.stringify({ error: 'Template key and recipient email are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get email template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_key', templateKey)
      .eq('is_active', true)
      .single();

    if (templateError || !template) {
      console.error('Template not found:', templateError);
      return new Response(
        JSON.stringify({ error: 'Email template not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Replace template variables
    let htmlContent = template.html_content;
    let textContent = template.text_content || '';
    let subject = template.subject;

    // Add default variables
    const appUrl = Deno.env.get('APP_URL') || 'https://kmercoders.com';
    const allVariables = {
      username: recipientName || 'User',
      app_url: appUrl,
      help_url: `${appUrl}/help`,
      manage_subscription_url: `${appUrl}/premium`,
      ...variables,
    };

    // Replace all variables in HTML, text, and subject
    Object.entries(allVariables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      htmlContent = htmlContent.replace(new RegExp(placeholder, 'g'), value);
      textContent = textContent.replace(new RegExp(placeholder, 'g'), value);
      subject = subject.replace(new RegExp(placeholder, 'g'), value);
    });

    // Send email via Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Kmer AI <noreply@kmercoders.com>',
      to: [recipientEmail],
      subject: subject,
      html: htmlContent,
      text: textContent,
    });

    // Log email attempt
    await supabase.from('email_logs').insert({
      user_id: userId || null,
      template_key: templateKey,
      recipient_email: recipientEmail,
      subject: subject,
      status: emailError ? 'failed' : 'sent',
      provider_response: emailError ? { error: emailError } : emailData,
      sent_at: emailError ? null : new Date().toISOString(),
    });

    if (emailError) {
      console.error('Error sending email:', emailError);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: emailError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Email sent successfully:', emailData);
    return new Response(
      JSON.stringify({ success: true, data: emailData }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in send-email function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
