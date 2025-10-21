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

interface Message {
  role: string;
  content: string;
}

interface ChatRequest {
  messages: Message[];
  conversationId?: string;
  mode?: 'chat' | 'study' | 'search';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('Chat function invoked');

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      );
    }

    console.log('User authenticated:', user.id);

    // Check subscription status and enforce limits
    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-08-27.basil" });
    
    // Get Stripe customer
    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    let isPremium = false;
    
    if (customers.data.length > 0) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customers.data[0].id,
        status: "active",
        limit: 1,
      });
      isPremium = subscriptions.data.length > 0;
    }
    
    console.log(`User premium status: ${isPremium}`);

    // If not premium, check message limits
    if (!isPremium) {
      // Use service role for database operations
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      const today = new Date().toISOString().split('T')[0];
      
      // Get or create usage record for today
      const { data: usageData, error: usageError } = await supabaseAdmin
        .from('user_usage')
        .select('*')
        .eq('user_id', user.id)
        .eq('usage_date', today)
        .single();
      
      let currentCount = 0;
      
      if (usageError && usageError.code !== 'PGRST116') {
        console.error('Error fetching usage:', usageError);
      } else if (usageData) {
        currentCount = usageData.message_count;
      }
      
      console.log(`Current message count for today: ${currentCount}`);
      
      // Free tier limit: 10 messages per day
      const FREE_TIER_LIMIT = 10;
      
      if (currentCount >= FREE_TIER_LIMIT) {
        console.log('Message limit exceeded for free user');
        return new Response(
          JSON.stringify({ 
            error: 'Daily message limit reached. Upgrade to Premium for unlimited messages.',
            errorCode: 'PAYMENT_REQUIRED',
            currentUsage: currentCount,
            limit: FREE_TIER_LIMIT
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 402 
          }
        );
      }
      
      // Increment usage count
      if (usageData) {
        await supabaseAdmin
          .from('user_usage')
          .update({ message_count: currentCount + 1 })
          .eq('id', usageData.id);
      } else {
        await supabaseAdmin
          .from('user_usage')
          .insert({ 
            user_id: user.id, 
            usage_date: today, 
            message_count: 1 
          });
      }
      
      console.log(`Usage count updated to: ${currentCount + 1}`);
    }

    // Parse request body
    const { messages, conversationId, mode = 'chat' } = await req.json() as ChatRequest;

    if (!messages || !Array.isArray(messages)) {
      console.error('Invalid messages array');
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    console.log(`Processing ${messages.length} messages in ${mode} mode`);

    // Build system prompt based on mode
    let systemPrompt = 'You are Khai, an intelligent AI assistant designed for Africa. You are helpful, knowledgeable, and culturally aware. You can assist with coding, learning, creative tasks, translations, and general questions. Be friendly, concise, and provide accurate information tailored to African contexts when relevant.';
    
    if (mode === 'study') {
      systemPrompt += ' Focus on educational content, explanations, and helping users learn. Break down complex topics into understandable parts and provide examples.';
    } else if (mode === 'search') {
      systemPrompt += ' Provide informative and factual responses based on your knowledge. When relevant, suggest topics for further exploration.';
    }

    // Call Lovable AI Gateway
    console.log('Calling AI Gateway...');
    const aiResponse = await fetch(AI_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      
      // Handle specific error codes
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
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: 'Message limit reached. Please upgrade to continue.',
            errorCode: 'PAYMENT_REQUIRED'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 402 
          }
        );
      }
      
      throw new Error(`AI Gateway returned ${aiResponse.status}: ${errorText}`);
    }

    const data = await aiResponse.json();
    const aiMessage = data.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response.';

    console.log('AI response generated successfully');

    return new Response(
      JSON.stringify({ 
        message: aiMessage,
        conversationId: conversationId
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in chat function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred processing your request';
    
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
