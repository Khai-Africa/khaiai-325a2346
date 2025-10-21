import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0';
import Stripe from 'https://esm.sh/stripe@18.5.0';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;
const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GENERATE-IMAGE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  logStep('Function invoked');

  try {
    // Get authorization header - now optional for anonymous users
    const authHeader = req.headers.get('Authorization');
    let user = null;
    let isAnonymous = false;

    if (authHeader) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
          headers: { Authorization: authHeader },
        },
      });

      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (!authError && userData.user) {
        user = userData.user;
        logStep('User authenticated', { userId: user.id });
      } else {
        logStep('Invalid auth token, treating as anonymous');
        isAnonymous = true;
      }
    } else {
      logStep('No auth header, treating as anonymous');
      isAnonymous = true;
    }

    // Anonymous users must sign up to generate images
    if (isAnonymous || !user) {
      logStep('Anonymous user attempted image generation');
      return new Response(
        JSON.stringify({ 
          error: 'Image generation requires a free account. Please sign up to continue.',
          errorCode: 'AUTH_REQUIRED',
          requiresAuth: true
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      );
    }

    // At this point, user is guaranteed to be non-null
    const authenticatedUser = user;

    // Check subscription status
    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: authenticatedUser.email!, limit: 1 });
    let isPremium = false;
    
    if (customers.data.length > 0) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customers.data[0].id,
        status: "active",
        limit: 1,
      });
      isPremium = subscriptions.data.length > 0;
    }
    
    logStep(`Premium status: ${isPremium}`);

    // If not premium, check image generation limits
    if (!isPremium) {
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const today = new Date().toISOString().split('T')[0];
      
      const { data: usageData, error: usageError } = await supabaseAdmin
        .from('user_usage')
        .select('*')
        .eq('user_id', authenticatedUser.id)
        .eq('usage_date', today)
        .single();
      
      let currentImageCount = 0;
      
      if (usageError && usageError.code !== 'PGRST116') {
        logStep('ERROR: Fetching usage failed', usageError);
      } else if (usageData) {
        currentImageCount = usageData.image_count || 0;
      }
      
      logStep(`Current image count: ${currentImageCount}`);
      
      const FREE_IMAGE_LIMIT = 3; // 3 images per day for free users
      
      if (currentImageCount >= FREE_IMAGE_LIMIT) {
        logStep('Image limit exceeded');
        return new Response(
          JSON.stringify({ 
            error: 'Daily image generation limit reached. Upgrade to Premium for unlimited images.',
            errorCode: 'PAYMENT_REQUIRED',
            currentUsage: currentImageCount,
            limit: FREE_IMAGE_LIMIT
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 402 
          }
        );
      }
      
      // Update usage count
      if (usageData) {
        await supabaseAdmin
          .from('user_usage')
          .update({ image_count: currentImageCount + 1 })
          .eq('id', usageData.id);
      } else {
        await supabaseAdmin
          .from('user_usage')
          .insert({ 
            user_id: authenticatedUser.id, 
            usage_date: today, 
            image_count: 1,
            message_count: 0
          });
      }
      
      logStep(`Image count updated to: ${currentImageCount + 1}`);
    }

    const { prompt, conversationId } = await req.json();
    
    if (!prompt || typeof prompt !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    logStep('Calling AI Gateway for image generation', { promptLength: prompt.length });

    const aiResponse = await fetch(AI_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      logStep('ERROR: AI Gateway failed', { status: aiResponse.status, error: errorText });
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: 'Rate limit exceeded. Please try again in a moment.',
            errorCode: 'RATE_LIMIT'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 429 
          }
        );
      }
      
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const data = await aiResponse.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageUrl) {
      logStep('ERROR: No image in response');
      throw new Error('No image generated');
    }

    logStep('Image generated successfully');

    // Store in database
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: insertData, error: insertError } = await supabaseAdmin
      .from('generated_images')
      .insert({
        user_id: authenticatedUser.id,
        conversation_id: conversationId || null,
        prompt: prompt,
        image_data: imageUrl
      })
      .select()
      .single();

    if (insertError) {
      logStep('ERROR: Failed to store image', insertError);
    } else {
      logStep('Image stored in database', { imageId: insertData.id });
    }

    return new Response(
      JSON.stringify({ 
        imageUrl,
        imageId: insertData?.id
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    logStep('ERROR: Unexpected error', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        errorCode: 'INTERNAL_ERROR'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
