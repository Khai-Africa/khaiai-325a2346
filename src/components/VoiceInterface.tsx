import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { X, Mic, Volume2, VolumeX, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { VoiceWaveform } from '@/components/VoiceWaveform';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface VoiceInterfaceProps {
  onClose: () => void;
  conversationId?: string;
}

// African voice options
const VOICE_OPTIONS = [
  { id: 'nigerian-female', label: '🇳🇬 Nigerian Female', flag: '🇳🇬' },
  { id: 'nigerian-male', label: '🇳🇬 Nigerian Male', flag: '🇳🇬' },
  { id: 'south-african-female', label: '🇿🇦 South African Female', flag: '🇿🇦' },
  { id: 'south-african-male', label: '🇿🇦 South African Male', flag: '🇿🇦' },
  { id: 'african-female-1', label: '🌍 African Female 1', flag: '🌍' },
  { id: 'african-female-2', label: '🌍 African Female 2', flag: '🌍' },
  { id: 'african-male-1', label: '🌍 African Male 1', flag: '🌍' },
  { id: 'african-male-2', label: '🌍 African Male 2', flag: '🌍' },
  { id: 'pan-african', label: '🌍 Pan-African (Neutral)', flag: '🌍' },
];

export const VoiceInterface = ({ onClose, conversationId }: VoiceInterfaceProps) => {
  const { user } = useAuth();
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>(conversationId);
  const [selectedVoice, setSelectedVoice] = useState(() => {
    return localStorage.getItem('preferred-voice') || 'nigerian-female';
  });
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize session on mount
  useEffect(() => {
    initializeSession();
    
    // Pre-initialize AudioContext for lower latency
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    return () => {
      endSession();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Save voice preference when changed
  useEffect(() => {
    localStorage.setItem('preferred-voice', selectedVoice);
  }, [selectedVoice]);

  const initializeSession = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('voice_sessions')
        .insert({
          user_id: user.id,
          conversation_id: conversationId,
          session_title: 'Voice Chat',
        })
        .select()
        .single();

      if (!error && data) {
        setSessionId(data.id);
        console.log('Voice session initialized:', data.id);
      }
    } catch (error) {
      console.error('Failed to initialize session:', error);
    }
  };

  const endSession = async () => {
    if (!sessionId) return;

    try {
      await supabase
        .from('voice_sessions')
        .update({
          ended_at: new Date().toISOString(),
        })
        .eq('id', sessionId);
      
      console.log('Voice session ended');
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  };

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      setMediaStream(stream);

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];
        setMediaStream(null);
        await processAudio(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsListening(true);
      toast.success('Listening...');
    } catch (error) {
      console.error('Microphone error:', error);
      toast.error('Microphone access denied');
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsListening(false);
      setIsProcessing(true);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];

        // Call ElevenLabs-powered voice-chat edge function
        const { data, error } = await supabase.functions.invoke('elevenlabs-voice-chat', {
          body: {
            audioData: base64Audio,
            conversationId: currentConversationId,
            sessionId,
            voice: selectedVoice,
            mode: 'chat',
          },
        });

        setIsProcessing(false);

        if (error) {
          console.error('Voice chat error:', error);
          toast.error('Failed to process voice input');
          return;
        }

        setTranscript(data.transcription);
        setAiResponse(data.aiResponse);
        
        if (data.conversationId && !currentConversationId) {
          setCurrentConversationId(data.conversationId);
        }

        if (audioEnabled && data.audioContent) {
          playAudio(data.audioContent);
        }
      };
    } catch (error) {
      console.error('Audio processing error:', error);
      setIsProcessing(false);
      toast.error('Failed to process audio');
    }
  };

  const playAudio = (base64Audio: string) => {
    setIsSpeaking(true);

    // Use data URI for proper base64 audio playback
    const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;

    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }

    audioElementRef.current = new Audio(audioUrl);
    audioElementRef.current.play();

    audioElementRef.current.onended = () => {
      setIsSpeaking(false);
    };

    audioElementRef.current.onerror = () => {
      setIsSpeaking(false);
      toast.error('Failed to play audio');
    };
  };

  const toggleAudio = () => {
    setAudioEnabled(!audioEnabled);
    if (audioElementRef.current && !audioEnabled) {
      audioElementRef.current.pause();
      setIsSpeaking(false);
    }
  };

  const selectedVoiceLabel = VOICE_OPTIONS.find(v => v.id === selectedVoice)?.label || 'Select Voice';

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-background via-primary/5 to-background z-50 flex flex-col items-center justify-center">
      {/* Voice Selection Dropdown */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 bg-background/50 backdrop-blur-sm">
              <span>{selectedVoiceLabel}</span>
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-56">
            {VOICE_OPTIONS.map((voice) => (
              <DropdownMenuItem
                key={voice.id}
                onClick={() => setSelectedVoice(voice.id)}
                className={selectedVoice === voice.id ? 'bg-accent' : ''}
              >
                {voice.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Animated Orb - Multi-layered */}
      <div className="relative w-80 h-80 flex items-center justify-center">
        {/* Outer glow ring */}
        <div 
          className={`absolute w-80 h-80 rounded-full transition-all duration-700 ease-in-out
            ${isListening ? 'scale-125 opacity-40 bg-gradient-to-br from-red-500/30 via-red-400/20 to-transparent blur-3xl animate-pulse' : ''} 
            ${isProcessing ? 'scale-110 opacity-30 bg-gradient-to-br from-yellow-500/30 via-yellow-400/20 to-transparent blur-3xl animate-pulse' : ''}
            ${isSpeaking ? 'scale-150 opacity-50 bg-gradient-to-br from-blue-500/40 via-cyan-400/30 to-purple-400/20 blur-3xl animate-ping' : ''}
            ${!isListening && !isProcessing && !isSpeaking ? 'scale-100 opacity-20 bg-gradient-to-br from-primary/20 via-accent/15 to-transparent blur-2xl' : ''}`}
          style={{ animation: isListening || isProcessing || isSpeaking ? 'pulse 2s ease-in-out infinite' : '' }}
        />

        {/* Rotating gradient ring */}
        <div 
          className={`absolute w-72 h-72 rounded-full transition-all duration-500
            ${isListening ? 'from-red-500/60 via-red-400/40 to-red-300/20' : ''} 
            ${isProcessing ? 'from-yellow-500/60 via-yellow-400/40 to-yellow-300/20' : ''}
            ${isSpeaking ? 'from-blue-500/70 via-cyan-400/50 to-purple-400/30' : ''}
            ${!isListening && !isProcessing && !isSpeaking ? 'from-primary/50 via-accent/30 to-primary/10' : ''}
            bg-gradient-to-br blur-2xl opacity-60`}
          style={{ 
            animation: 'spin 8s linear infinite',
            filter: 'blur(40px)'
          }}
        />

        {/* Middle breathing layer */}
        <div 
          className={`absolute w-64 h-64 rounded-full transition-all duration-700
            ${isListening ? 'from-red-600/80 via-red-500/60 to-red-400/40 scale-110' : ''} 
            ${isProcessing ? 'from-yellow-600/80 via-yellow-500/60 to-yellow-400/40 scale-105' : ''}
            ${isSpeaking ? 'from-blue-600/90 via-cyan-500/70 to-blue-400/50 scale-115' : ''}
            ${!isListening && !isProcessing && !isSpeaking ? 'from-primary/70 via-accent/50 to-primary/30 scale-100' : ''}
            bg-gradient-to-br blur-xl`}
          style={{ 
            animation: isListening || isProcessing || isSpeaking ? 'pulse 1.5s ease-in-out infinite' : 'pulse 3s ease-in-out infinite'
          }}
        />

        {/* Core orb with sharp edges */}
        <div 
          className={`absolute w-56 h-56 rounded-full transition-all duration-500 shadow-2xl
            ${isListening ? 'from-red-600 via-red-500 to-red-400 shadow-red-500/50' : ''} 
            ${isProcessing ? 'from-yellow-600 via-yellow-500 to-yellow-400 shadow-yellow-500/50' : ''}
            ${isSpeaking ? 'from-blue-600 via-cyan-500 to-blue-400 shadow-blue-500/60' : ''}
            ${!isListening && !isProcessing && !isSpeaking ? 'from-primary via-accent to-primary shadow-primary/40' : ''}
            bg-gradient-to-br backdrop-blur-sm`}
          style={{ 
            filter: 'blur(1px)',
            animation: isListening ? 'pulse 0.8s ease-in-out infinite' : isSpeaking ? 'pulse 0.6s ease-in-out infinite' : ''
          }}
        />

        {/* Inner shimmer */}
        <div 
          className={`absolute w-48 h-48 rounded-full transition-all duration-500
            ${isListening ? 'from-red-400/40 via-white/30 to-red-500/40' : ''} 
            ${isProcessing ? 'from-yellow-400/40 via-white/30 to-yellow-500/40' : ''}
            ${isSpeaking ? 'from-blue-400/50 via-white/40 to-cyan-500/50' : ''}
            ${!isListening && !isProcessing && !isSpeaking ? 'from-primary/30 via-white/20 to-accent/30' : ''}
            bg-gradient-to-tr blur-sm opacity-80`}
          style={{ 
            animation: 'spin 6s linear infinite reverse'
          }}
        />

        {/* Center highlight */}
        <div 
          className={`absolute w-32 h-32 rounded-full transition-all duration-300
            ${isListening ? 'bg-white/40' : ''} 
            ${isProcessing ? 'bg-white/30' : ''}
            ${isSpeaking ? 'bg-white/50' : ''}
            ${!isListening && !isProcessing && !isSpeaking ? 'bg-white/20' : ''}
            blur-md`}
          style={{ 
            animation: isListening || isSpeaking ? 'pulse 1s ease-in-out infinite' : 'pulse 2s ease-in-out infinite'
          }}
        />
      </div>

      {/* Voice Waveform Visualization */}
      <div className="mt-6 w-full max-w-xs">
        <VoiceWaveform
          isActive={isListening || isSpeaking}
          type={isListening ? 'recording' : isSpeaking ? 'playback' : 'idle'}
          audioContext={audioContextRef.current}
          audioSource={isListening ? mediaStream : audioElementRef.current}
        />
      </div>

      {/* Transcript Display */}
      {(transcript || aiResponse) && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 max-w-md w-full px-4">
          <div className="bg-background/80 backdrop-blur-sm rounded-lg p-4 space-y-2">
            {transcript && (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">You:</span> {transcript}
              </p>
            )}
            {aiResponse && (
              <p className="text-sm">
                <span className="font-medium text-primary">Khai:</span> {aiResponse}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Bottom Controls */}
      <div className="absolute bottom-8 w-full px-6 flex items-center justify-between max-w-md mx-auto">
        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="w-12 h-12 rounded-full bg-background/50 backdrop-blur-sm"
        >
          <X className="w-6 h-6" />
        </Button>

        {/* Microphone Button */}
        <Button
          size="icon"
          onClick={isListening ? stopListening : startListening}
          disabled={isProcessing}
          className={`w-16 h-16 rounded-full ${
            isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-primary/90'
          } transition-all duration-300 shadow-lg`}
        >
          <Mic className={`w-8 h-8 ${isListening ? 'animate-pulse' : ''}`} />
        </Button>

        {/* Audio Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleAudio}
          className="w-12 h-12 rounded-full bg-background/50 backdrop-blur-sm"
        >
          {audioEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
        </Button>
      </div>

      {/* Status Indicator */}
      <div className="absolute bottom-32 flex items-center gap-2">
        {isListening && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/20 backdrop-blur-sm animate-fade-in">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-medium">Listening...</span>
          </div>
        )}
        {isProcessing && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/20 backdrop-blur-sm animate-fade-in">
            <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
            <span className="text-sm font-medium">Processing with ElevenLabs...</span>
          </div>
        )}
        {isSpeaking && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/20 backdrop-blur-sm animate-fade-in">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-sm font-medium">Speaking...</span>
          </div>
        )}
      </div>
    </div>
  );
};
