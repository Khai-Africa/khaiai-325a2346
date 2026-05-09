import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VoiceChatRequest {
  audioData: string; // base64 encoded audio
  conversationId?: string;
  sessionId?: string;
  voice?: string; // TTS voice preference
  mode?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization required');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { audioData, conversationId, sessionId, voice, mode } = await req.json() as VoiceChatRequest;

    console.log('Processing voice chat request for user:', user.id);

    // Step 1: Transcribe audio (Speech-to-Text) + Get conversation history in PARALLEL
    console.log('Starting parallel processing: STT + conversation history...');
    
    const transcribePromise = fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/transcribe-audio`,
      {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ audio: audioData }),
      }
    );

    const messagesPromise = conversationId 
      ? supabase
          .from('messages')
          .select('role, content')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: false })
          .limit(10) // Only get last 10 messages for faster processing
      : Promise.resolve({ data: [] });

    // Wait for both to complete in parallel
    const [transcribeResponse, messagesResult] = await Promise.all([
      transcribePromise,
      messagesPromise
    ]);

    if (!transcribeResponse.ok) {
      const error = await transcribeResponse.json();
      throw new Error(`Transcription failed: ${error.error || 'Unknown error'}`);
    }

    const { text: transcribedText } = await transcribeResponse.json();
    console.log('Transcribed text:', transcribedText);

    if (!transcribedText || transcribedText.trim() === '') {
      throw new Error('No speech detected in audio');
    }

    // Reverse messages to get chronological order
    const messages: Array<{ role: string; content: string }> = 
      (messagesResult.data || []).reverse();

    // Step 2: Send to Chat AI (using faster model)
    console.log('Generating AI response with optimized model...');
    const chatResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/chat`,
      {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: transcribedText }],
          conversationId,
          mode: mode || 'chat',
          model: 'gpt-5-mini' // Latest mini model for voice conversations
        }),
      }
    );

    if (!chatResponse.ok) {
      const error = await chatResponse.json();
      throw new Error(`Chat AI failed: ${error.error || 'Unknown error'}`);
    }

    const { message: aiResponse, conversationId: newConvId } = await chatResponse.json();
    console.log('AI response generated');

    // Step 3: Convert AI response to speech (Text-to-Speech) - using faster model
    console.log('Generating speech with optimized voice...');
    const ttsResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/text-to-speech`,
      {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text: aiResponse,
          voice: voice || 'alloy',
          model: 'gpt-4o-mini-tts' // Latest mini TTS model
        }),
      }
    );

    if (!ttsResponse.ok) {
      const error = await ttsResponse.json();
      throw new Error(`TTS failed: ${error.error || 'Unknown error'}`);
    }

    const { audioContent } = await ttsResponse.json();
    console.log('Speech generated successfully');

    // Step 4: Update session tracking (fire-and-forget for faster response)
    if (sessionId) {
      // Don't await - let it run in background
      Promise.resolve().then(async () => {
        try {
          const { data: sessionData } = await supabase
            .from('voice_sessions')
            .select('total_turns')
            .eq('id', sessionId)
            .single();

          if (sessionData) {
            await supabase
              .from('voice_sessions')
              .update({ 
                total_turns: (sessionData.total_turns || 0) + 1,
                conversation_id: newConvId || conversationId 
              })
              .eq('id', sessionId);
          }
        } catch (err) {
          console.error('Background session update error:', err);
        }
      });
    }

    return new Response(
      JSON.stringify({
        transcription: transcribedText,
        aiResponse,
        audioContent,
        conversationId: newConvId || conversationId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Voice chat error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
