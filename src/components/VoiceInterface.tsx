import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { X, Mic, Volume2, VolumeX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface VoiceInterfaceProps {
  onClose: () => void;
  conversationId?: string;
}

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
      setIsProcessing(true); // Show processing state immediately
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];

        // Call voice-chat edge function
        const { data, error } = await supabase.functions.invoke('voice-chat', {
          body: {
            audioData: base64Audio,
            conversationId: currentConversationId,
            sessionId,
            voice: 'alloy',
            mode: 'chat',
          },
        });

        setIsProcessing(false); // Done processing

        if (error) {
          console.error('Voice chat error:', error);
          toast.error('Failed to process voice input');
          return;
        }

        setTranscript(data.transcription);
        setAiResponse(data.aiResponse);
        
        // Update conversation ID if it's a new conversation
        if (data.conversationId && !currentConversationId) {
          setCurrentConversationId(data.conversationId);
        }

        // Play AI response audio
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

    const audioBlob = base64ToBlob(base64Audio, 'audio/mpeg');
    const audioUrl = URL.createObjectURL(audioBlob);

    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }

    audioElementRef.current = new Audio(audioUrl);
    audioElementRef.current.play();

    audioElementRef.current.onended = () => {
      setIsSpeaking(false);
      URL.revokeObjectURL(audioUrl);
    };

    audioElementRef.current.onerror = () => {
      setIsSpeaking(false);
      toast.error('Failed to play audio');
      URL.revokeObjectURL(audioUrl);
    };
  };

  const base64ToBlob = (base64: string, type: string): Blob => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type });
  };

  const toggleAudio = () => {
    setAudioEnabled(!audioEnabled);
    if (audioElementRef.current && !audioEnabled) {
      audioElementRef.current.pause();
      setIsSpeaking(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-background via-primary/5 to-background z-50 flex flex-col items-center justify-center">
      {/* Animated Orb */}
      <div className="relative">
        <div 
          className={`w-64 h-64 rounded-full bg-gradient-to-br 
            ${isListening ? 'from-red-400 via-red-300 to-red-200 animate-pulse scale-110' : ''} 
            ${isProcessing ? 'from-yellow-400 via-yellow-300 to-yellow-200 animate-pulse scale-105' : ''}
            ${isSpeaking ? 'from-blue-400 via-cyan-300 to-blue-200 animate-ping scale-125' : ''}
            ${!isListening && !isProcessing && !isSpeaking ? 'from-blue-400 via-cyan-300 to-blue-200' : ''}
            transition-all duration-500 blur-xl opacity-70`}
        />
        <div 
          className={`absolute inset-0 w-64 h-64 rounded-full bg-gradient-to-br 
            ${isListening ? 'from-red-500 via-red-400 to-red-300' : ''}
            ${isProcessing ? 'from-yellow-500 via-yellow-400 to-yellow-300' : ''}
            ${isSpeaking ? 'from-blue-500 via-cyan-400 to-blue-300' : ''}
            ${!isListening && !isProcessing && !isSpeaking ? 'from-blue-500 via-cyan-400 to-blue-300' : ''}
            opacity-90 animate-spin-slow`}
        />
      </div>


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
            <span className="text-sm font-medium">Processing...</span>
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
