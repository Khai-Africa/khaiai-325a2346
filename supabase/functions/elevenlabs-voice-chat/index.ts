import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0';
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// African voice options mapping
const VOICE_OPTIONS: Record<string, string> = {
  'african-female-1': 'Xb7hH8MSUJpSbSDYk0k2',
  'african-male-1': 'JBFqnCBsd6RMkjVDRZzb',
  'african-female-2': 'pFZP5JQG7iQjIQuC4Bku',
  'african-male-2': 'onwK4e9ZLuTAKqWW03F9',
  'nigerian-female': 'EXAVITQu4vr4xnSDxMaL',
  'nigerian-male': 'TX3LPaxmHKxFdv7VOQHJ',
  'south-african-female': 'XrExE9yKIg1WjnnlVkGX',
  'south-african-male': 'bIHbv24MWmeRgasZH58o',
  'pan-african': 'CwhRBWXzGAHq8TQ4Fs17',
  'default': 'JBFqnCBsd6RMkjVDRZzb',
};

// Process base64 in chunks
function processBase64Chunks(base64String: string, chunkSize = 32768): Uint8Array {
  const chunks: Uint8Array[] = [];
  let position = 0;
  
  while (position < base64String.length) {
    const chunk = base64String.slice(position, position + chunkSize);
    const binaryChunk = atob(chunk);
    const bytes = new Uint8Array(binaryChunk.length);
    for (let i = 0; i < binaryChunk.length; i++) {
      bytes[i] = binaryChunk.charCodeAt(i);
    }
    chunks.push(bytes);
    position += chunkSize;
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

interface VoiceChatRequest {
  audioData: string;
  conversationId?: string;
  sessionId?: string;
  voice?: string;
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

    const { audioData, conversationId, sessionId, voice = 'default', mode } = await req.json() as VoiceChatRequest;
    
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY is not configured');
    }
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    console.log('Processing voice chat for user:', user.id);
    console.log('Voice selection:', voice);

    // Step 1: Transcribe with ElevenLabs STT + Get conversation history in parallel
    console.log('Starting parallel: ElevenLabs STT + conversation history...');
    
    const binaryAudio = processBase64Chunks(audioData);
    const sttFormData = new FormData();
    const audioBlob = new Blob([new Uint8Array(binaryAudio)], { type: 'audio/webm' });
    sttFormData.append('file', audioBlob, 'audio.webm');
    sttFormData.append('model_id', 'scribe_v1');

    const sttPromise = fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: { 'xi-api-key': ELEVENLABS_API_KEY },
      body: sttFormData,
    });

    const messagesPromise = conversationId 
      ? supabase
          .from('messages')
          .select('role, content')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] });

    const [sttResponse, messagesResult] = await Promise.all([sttPromise, messagesPromise]);

    if (!sttResponse.ok) {
      const errorText = await sttResponse.text();
      throw new Error(`ElevenLabs STT failed: ${errorText}`);
    }

    const sttResult = await sttResponse.json();
    const transcribedText = sttResult.text;
    console.log('Transcribed text:', transcribedText);

    if (!transcribedText || transcribedText.trim() === '') {
      throw new Error('No speech detected in audio');
    }

    const messages: Array<{ role: string; content: string }> = 
      (messagesResult.data || []).reverse();

    // Step 2: Generate AI response with YOUR Gemini API
    console.log('Generating AI response with Gemini...');
    
    const geminiMessages = [
      ...messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      })),
      { role: 'user', parts: [{ text: transcribedText }] }
    ];

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: geminiMessages,
          systemInstruction: {
            parts: [{
              text: `You are Khai, a friendly and knowledgeable AI assistant focused on helping users across Africa. 
                     You understand African contexts, cultures, and needs. 
                     Keep responses conversational and concise for voice interactions.
                     Be warm, helpful, and culturally aware.`
            }]
          },
          generationConfig: {
            maxOutputTokens: 500,
            temperature: 0.7,
          }
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      throw new Error(`Gemini API failed: ${errorText}`);
    }

    const geminiResult = await geminiResponse.json();
    const aiResponse = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text || 'I apologize, I could not generate a response.';
    console.log('AI response generated');

    // Step 3: Convert to speech with ElevenLabs TTS
    console.log('Generating speech with ElevenLabs TTS...');
    
    const voiceId = VOICE_OPTIONS[voice] || VOICE_OPTIONS['default'];
    
    const ttsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: aiResponse,
          model_id: 'eleven_turbo_v2_5',
          output_format: 'mp3_44100_128',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.5,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      throw new Error(`ElevenLabs TTS failed: ${errorText}`);
    }

    const audioBuffer = await ttsResponse.arrayBuffer();
    const audioContent = base64Encode(audioBuffer);
    console.log('Speech generated successfully');

    // Step 4: Save messages and update session (fire-and-forget)
    Promise.resolve().then(async () => {
      try {
        // Create or get conversation
        let convId = conversationId;
        if (!convId) {
          const { data: newConv } = await supabase
            .from('conversations')
            .insert({ user_id: user.id, title: transcribedText.slice(0, 50) })
            .select('id')
            .single();
          convId = newConv?.id;
        }

        if (convId) {
          // Save messages
          await supabase.from('messages').insert([
            { conversation_id: convId, role: 'user', content: transcribedText },
            { conversation_id: convId, role: 'assistant', content: aiResponse }
          ]);

          // Update session
          if (sessionId) {
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
                  conversation_id: convId 
                })
                .eq('id', sessionId);
            }
          }
        }
      } catch (err) {
        console.error('Background save error:', err);
      }
    });

    return new Response(
      JSON.stringify({
        transcription: transcribedText,
        aiResponse,
        audioContent,
        conversationId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Voice chat error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
