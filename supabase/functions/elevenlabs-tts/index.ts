import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// African and diverse voice options
const VOICE_OPTIONS: Record<string, string> = {
  // African Voices
  'african-female-1': 'Xb7hH8MSUJpSbSDYk0k2', // Alice - warm, versatile
  'african-male-1': 'JBFqnCBsd6RMkjVDRZzb', // George - distinguished
  'african-female-2': 'pFZP5JQG7iQjIQuC4Bku', // Lily - friendly
  'african-male-2': 'onwK4e9ZLuTAKqWW03F9', // Daniel - conversational
  // Nigerian-style voices
  'nigerian-female': 'EXAVITQu4vr4xnSDxMaL', // Sarah - clear, professional
  'nigerian-male': 'TX3LPaxmHKxFdv7VOQHJ', // Liam - warm male
  // South African-style voices
  'south-african-female': 'XrExE9yKIg1WjnnlVkGX', // Matilda - warm
  'south-african-male': 'bIHbv24MWmeRgasZH58o', // Will - friendly
  // Pan-African (neutral)
  'pan-african': 'CwhRBWXzGAHq8TQ4Fs17', // Roger - professional
  // Default
  'default': 'JBFqnCBsd6RMkjVDRZzb', // George
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voice = 'default', returnBase64 = true } = await req.json();
    
    if (!text) {
      throw new Error('Text is required');
    }

    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY is not configured');
    }

    const voiceId = VOICE_OPTIONS[voice] || VOICE_OPTIONS['default'];
    
    console.log(`Generating speech with ElevenLabs TTS - voice: ${voice} (${voiceId})`);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2_5', // Low-latency model
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs TTS error:', response.status, errorText);
      throw new Error(`ElevenLabs TTS failed: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    console.log('TTS audio generated successfully, size:', audioBuffer.byteLength);

    if (returnBase64) {
      const base64Audio = base64Encode(audioBuffer);
      return new Response(
        JSON.stringify({ audioContent: base64Audio }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
      },
    });

  } catch (error) {
    console.error('ElevenLabs TTS error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
