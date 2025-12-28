import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Mic, Play, Square, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// African voice options
const VOICE_OPTIONS = [
  { id: 'nigerian-female', label: 'Nigerian Female', flag: '🇳🇬', description: 'Clear, professional Nigerian voice' },
  { id: 'nigerian-male', label: 'Nigerian Male', flag: '🇳🇬', description: 'Warm, friendly Nigerian voice' },
  { id: 'south-african-female', label: 'South African Female', flag: '🇿🇦', description: 'Warm South African voice' },
  { id: 'south-african-male', label: 'South African Male', flag: '🇿🇦', description: 'Friendly South African voice' },
  { id: 'african-female-1', label: 'African Female 1', flag: '🌍', description: 'Versatile African voice' },
  { id: 'african-female-2', label: 'African Female 2', flag: '🌍', description: 'Friendly African voice' },
  { id: 'african-male-1', label: 'African Male 1', flag: '🌍', description: 'Distinguished African voice' },
  { id: 'african-male-2', label: 'African Male 2', flag: '🌍', description: 'Conversational African voice' },
  { id: 'pan-african', label: 'Pan-African (Neutral)', flag: '🌍', description: 'Professional neutral voice' },
];

const PREVIEW_TEXT = "Hello! I'm Khai, your AI assistant. How can I help you today?";

interface VoiceSettingsCardProps {
  onVoiceChange?: (voice: string) => void;
}

export const VoiceSettingsCard = ({ onVoiceChange }: VoiceSettingsCardProps) => {
  const [selectedVoice, setSelectedVoice] = useState(() => {
    return localStorage.getItem('preferred-voice') || 'nigerian-female';
  });
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
      }
    };
  }, [audioElement]);

  const handleVoiceChange = useCallback((voice: string) => {
    setSelectedVoice(voice);
    localStorage.setItem('preferred-voice', voice);
    onVoiceChange?.(voice);
    toast.success('Voice preference saved');
  }, [onVoiceChange]);

  const stopPreview = useCallback(() => {
    if (audioElement) {
      audioElement.pause();
      audioElement.src = '';
    }
    setPreviewingVoice(null);
  }, [audioElement]);

  const previewVoice = useCallback(async (voiceId: string) => {
    // Stop any current preview
    stopPreview();
    
    setPreviewingVoice(voiceId);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            text: PREVIEW_TEXT,
            voice: voiceId,
            returnBase64: true,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate voice preview');
      }

      const data = await response.json();
      
      if (data.audioContent) {
        const audioUrl = `data:audio/mpeg;base64,${data.audioContent}`;
        const audio = new Audio(audioUrl);
        
        audio.onended = () => {
          setPreviewingVoice(null);
        };
        
        audio.onerror = () => {
          setPreviewingVoice(null);
          toast.error('Failed to play preview');
        };
        
        setAudioElement(audio);
        await audio.play();
      }
    } catch (error) {
      console.error('Preview error:', error);
      toast.error('Failed to preview voice');
      setPreviewingVoice(null);
    }
  }, [stopPreview]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Mic className="w-5 h-5" />
          <CardTitle>Voice Settings</CardTitle>
        </div>
        <CardDescription>
          Choose your preferred voice for AI responses. Click preview to hear each voice.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup value={selectedVoice} onValueChange={handleVoiceChange} className="space-y-3">
          {VOICE_OPTIONS.map((voice) => (
            <div
              key={voice.id}
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                selectedVoice === voice.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <RadioGroupItem value={voice.id} id={voice.id} />
                <Label htmlFor={voice.id} className="cursor-pointer flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{voice.flag}</span>
                    <span className="font-medium">{voice.label}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{voice.description}</p>
                </Label>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  if (previewingVoice === voice.id) {
                    stopPreview();
                  } else {
                    previewVoice(voice.id);
                  }
                }}
                disabled={previewingVoice !== null && previewingVoice !== voice.id}
                className="shrink-0"
              >
                {previewingVoice === voice.id ? (
                  <>
                    <Square className="w-4 h-4 mr-1" />
                    Stop
                  </>
                ) : previewingVoice !== null ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-1" />
                    Preview
                  </>
                )}
              </Button>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  );
};
