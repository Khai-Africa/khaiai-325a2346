import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0';
import Stripe from 'https://esm.sh/stripe@18.5.0';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Interfaces for type checking
interface MessagePart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
  };
}

interface Message {
  role: string;
  content: string | MessagePart[];
}

interface ChatRequest {
  messages: Message[];
  conversationId?: string;
  mode?: 'chat' | 'study' | 'search' | 'thinking' | 'deep-research' | 'canvas';
}

// Convert OpenAI message format to Gemini format (with multimodal support)
function convertToGeminiFormat(messages: Message[], systemPrompt: string) {
  const geminiContents = [];
  
  // Add system prompt as first user message (Gemini doesn't have system role)
  geminiContents.push({
    role: 'user',
    parts: [{ text: systemPrompt }]
  });
  geminiContents.push({
    role: 'model',
    parts: [{ text: 'I understand. I am Khai, ready to assist you.' }]
  });
  
  // Convert messages with potential multimodal content
  for (const msg of messages) {
    const parts = [];
    
    if (typeof msg.content === 'string') {
      // Simple text message
      parts.push({ text: msg.content });
    } else {
      // Multimodal message with images
      for (const part of msg.content) {
        if (part.type === 'text' && part.text) {
          parts.push({ text: part.text });
        } else if (part.type === 'image_url' && part.image_url?.url) {
          // Extract base64 data and mime type
          const matches = part.image_url.url.match(/data:(.*?);base64,(.+)/);
          if (matches) {
            const mimeType = matches[1];
            const base64Data = matches[2];
            parts.push({
              inline_data: {
                mime_type: mimeType,
                data: base64Data
              }
            });
          }
        }
      }
    }
    
    geminiContents.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: parts
    });
  }
  
  return geminiContents;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('Chat function invoked');

  try {
    // Get authorization header - now optional for anonymous users
    const authHeader = req.headers.get('Authorization');
    let user = null;
    let isAnonymous = false;

    if (authHeader) {
      // Initialize Supabase client with auth
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
          headers: { Authorization: authHeader },
        },
      });

      // Try to verify user authentication
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (!authError && userData.user) {
        user = userData.user;
        console.log('User authenticated:', user.id);
      } else {
        console.log('Invalid auth token, treating as anonymous');
        isAnonymous = true;
      }
    } else {
      console.log('No auth header, treating as anonymous');
      isAnonymous = true;
    }

    // For authenticated users, check subscription status and enforce limits
    let isPremium = false;
    
    if (user && !isAnonymous) {
      const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-08-27.basil" });
      
      // Get Stripe customer
      const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
      
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
        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const today = new Date().toISOString().split('T')[0];
        
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
        
        const FREE_TIER_LIMIT = 10;
        
        if (currentCount >= FREE_TIER_LIMIT) {
          console.log('Message limit exceeded for free user');
          return new Response(
            JSON.stringify({ 
              error: 'Daily message limit reached. Sign up for a free account to get more messages, or upgrade to Premium for unlimited access.',
              errorCode: 'PAYMENT_REQUIRED',
              currentUsage: currentCount,
              limit: FREE_TIER_LIMIT,
              requiresAuth: false
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
    } else if (isAnonymous) {
      // Anonymous users: limits are enforced client-side via localStorage
      // The frontend tracks usage and shows signup prompts
      console.log('Processing request from anonymous user');
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

    // Validate input
    const messagePartSchema = z.object({
      type: z.enum(['text', 'image_url']),
      text: z.string().optional(),
      image_url: z.object({
        url: z.string()
      }).optional()
    });

    const messageSchema = z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.union([
        z.string().trim().min(1).max(10000),
        z.array(messagePartSchema)
      ]),
    });

    const chatSchema = z.object({
      messages: z.array(messageSchema).min(1).max(100),
      mode: z.string().max(50).optional(),
      conversationId: z.string().uuid().nullable().optional(),
    });

    const validated = chatSchema.parse({ messages, mode, conversationId });
    console.log(`Validated ${validated.messages.length} messages in ${validated.mode} mode`);

    // Build system prompt based on mode
    let systemPrompt = 'You are Khai, an intelligent AI assistant designed for Africa. You are helpful, knowledgeable, and culturally aware. You can assist with coding, learning, creative tasks, translations, and general questions. Be friendly, concise, and provide accurate information tailored to African contexts when relevant.';
    
    if (mode === 'study') {
      systemPrompt += ' Focus on educational content, explanations, and helping users learn. Break down complex topics into understandable parts and provide examples.';
    } else if (mode === 'search') {
      systemPrompt += ' Provide informative and factual responses based on your knowledge. Cite sources when possible and suggest topics for further exploration.';
    } else if (mode === 'thinking') {
      systemPrompt += ' Show your reasoning process step-by-step. Break down complex problems, analyze different perspectives, and explain your thought process clearly before reaching conclusions.';
    } else if (mode === 'deep-research') {
      systemPrompt += ' Provide comprehensive, in-depth research-quality responses. Cover multiple angles, include relevant context, analyze implications, and provide detailed explanations with structured reasoning.';
    } else if (mode === 'canvas') {
      systemPrompt += ' Help users with visual and creative tasks. Provide detailed descriptions for visual concepts, assist with design thinking, and guide creative processes.';
    }

    // Try Gemini 3.0 first
    let aiMessage = '';
    let provider = 'gemini';
    
    try {
      console.log('Attempting Gemini 3.0 API call...');
      const geminiContents = convertToGeminiFormat(validated.messages, systemPrompt);
      
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: geminiContents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2000,
              topP: 0.95,
              topK: 40
            }
          })
        }
      );
      
      if (geminiResponse.ok) {
        const geminiData = await geminiResponse.json();
        aiMessage = geminiData.candidates?.[0]?.content?.parts?.[0]?.text 
          || 'I apologize, but I was unable to generate a response.';
        
        console.log('✓ Gemini 3.0 response generated successfully');
      } else {
        const errorText = await geminiResponse.text();
        console.warn(`Gemini API failed (${geminiResponse.status}), falling back to OpenAI:`, errorText);
        throw new Error('Gemini failed, fallback to OpenAI');
      }
    } catch (geminiError) {
      console.warn('Gemini API error, falling back to OpenAI:', geminiError);
      
      // Fallback to OpenAI
      try {
        console.log('Using OpenAI fallback...');
        provider = 'openai';
        
        const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-5-mini',
            messages: [
              {
                role: 'system',
                content: systemPrompt
              },
              ...validated.messages.map(msg => ({
                role: msg.role,
                content: msg.content // Supports both string and MessagePart[] for vision
              }))
            ],
            // GPT-5 models only support default temperature and use max_completion_tokens
            max_completion_tokens: 2000,
          }),
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          console.error('OpenAI API error:', aiResponse.status, errorText);
          
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
          
          throw new Error(`OpenAI API returned ${aiResponse.status}: ${errorText}`);
        }

        const data = await aiResponse.json();
        aiMessage = data.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response.';
        
        console.log('✓ OpenAI fallback response generated successfully');
      } catch (openaiError) {
        console.error('Both Gemini and OpenAI failed:', openaiError);
        throw new Error('All AI providers failed. Please try again later.');
      }
    }

    console.log(`AI response generated successfully via ${provider}`);

    return new Response(
      JSON.stringify({ 
        message: aiMessage,
        conversationId: conversationId,
        provider: provider
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
