import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { X, Mic, Volume2, VolumeX, ChevronDown, RotateCcw, Square, Gauge, MessageSquare, Download, Trash2, MoreVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { VoiceWaveform } from '@/components/VoiceWaveform';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface VoiceInterfaceProps {
  onClose: () => void;
  conversationId?: string;
}

interface ConversationExchange {
  id: string;
  userMessage: string;
  aiResponse: string;
  timestamp: Date;
}

// Voice commands for playback control
const VOICE_COMMANDS: Record<string, { phrases: string[]; icon: string; color: string }> = {
  stop: { phrases: ['stop', 'pause', 'quiet', 'silence', 'shut up', 'be quiet'], icon: '⏹️', color: 'bg-red-500' },
  repeat: { phrases: ['repeat', 'again', 'say again', 'what did you say', 'pardon'], icon: '🔄', color: 'bg-blue-500' },
  slower: { phrases: ['slower', 'slow down', 'speak slower', 'more slowly'], icon: '🐢', color: 'bg-yellow-500' },
  faster: { phrases: ['faster', 'speed up', 'speak faster', 'quicker'], icon: '🐇', color: 'bg-green-500' },
};

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
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [showHistory, setShowHistory] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationExchange[]>([]);
  const [lastAudioContent, setLastAudioContent] = useState<string | null>(null);
  const [recognizedCommand, setRecognizedCommand] = useState<{ command: string; matchedPhrase: string } | null>(null);
  const [showClearDialog, setShowClearDialog] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const commandTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (commandTimeoutRef.current) {
        clearTimeout(commandTimeoutRef.current);
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

  // Check for voice commands in transcript
  const detectVoiceCommand = (text: string): { command: string | null; matchedPhrase: string | null; handled: boolean } => {
    const lowerText = text.toLowerCase().trim();
    
    for (const [command, config] of Object.entries(VOICE_COMMANDS)) {
      for (const phrase of config.phrases) {
        if (lowerText.includes(phrase)) {
          return { command, matchedPhrase: phrase, handled: true };
        }
      }
    }
    
    return { command: null, matchedPhrase: null, handled: false };
  };

  const showCommandFeedback = (command: string, matchedPhrase: string) => {
    setRecognizedCommand({ command, matchedPhrase });
    
    // Clear any existing timeout
    if (commandTimeoutRef.current) {
      clearTimeout(commandTimeoutRef.current);
    }
    
    // Hide the feedback after 2 seconds
    commandTimeoutRef.current = setTimeout(() => {
      setRecognizedCommand(null);
    }, 2000);
  };

  const handleVoiceCommand = (command: string, matchedPhrase: string) => {
    showCommandFeedback(command, matchedPhrase);
    
    switch (command) {
      case 'stop':
        stopPlayback();
        toast.success('Playback stopped');
        break;
      case 'repeat':
        repeatLastResponse();
        toast.success('Repeating last response');
        break;
      case 'slower':
        adjustPlaybackSpeed(-0.25);
        toast.success(`Speed: ${Math.max(0.5, playbackSpeed - 0.25).toFixed(2)}x`);
        break;
      case 'faster':
        adjustPlaybackSpeed(0.25);
        toast.success(`Speed: ${Math.min(2, playbackSpeed + 0.25).toFixed(2)}x`);
        break;
    }
  };

  const stopPlayback = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
      setIsSpeaking(false);
    }
  };

  const repeatLastResponse = () => {
    if (lastAudioContent && audioEnabled) {
      playAudio(lastAudioContent);
    } else if (!lastAudioContent) {
      toast.error('No response to repeat');
    }
  };

  const adjustPlaybackSpeed = (delta: number) => {
    const newSpeed = Math.max(0.5, Math.min(2, playbackSpeed + delta));
    setPlaybackSpeed(newSpeed);
    if (audioElementRef.current) {
      audioElementRef.current.playbackRate = newSpeed;
    }
  };

  const exportHistory = () => {
    if (conversationHistory.length === 0) {
      toast.error('No conversation to export');
      return;
    }

    const exportData = conversationHistory.map(exchange => ({
      timestamp: exchange.timestamp.toISOString(),
      you: exchange.userMessage,
      khai: exchange.aiResponse,
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voice-conversation-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Conversation exported');
  };

  const exportHistoryAsText = () => {
    if (conversationHistory.length === 0) {
      toast.error('No conversation to export');
      return;
    }

    let textContent = `Voice Conversation - ${new Date().toLocaleDateString()}\n`;
    textContent += '='.repeat(50) + '\n\n';

    conversationHistory.forEach((exchange) => {
      textContent += `[${exchange.timestamp.toLocaleTimeString()}]\n`;
      textContent += `You: ${exchange.userMessage}\n`;
      textContent += `Khai: ${exchange.aiResponse}\n\n`;
    });

    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voice-conversation-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Conversation exported as text');
  };

  const clearHistory = () => {
    setConversationHistory([]);
    setShowClearDialog(false);
    toast.success('Conversation history cleared');
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

        const transcribedText = data.transcription;
        setTranscript(transcribedText);
        
        // Check for voice commands first
        const { command, matchedPhrase, handled } = detectVoiceCommand(transcribedText);
        if (handled && command && matchedPhrase) {
          handleVoiceCommand(command, matchedPhrase);
          return; // Don't process as regular chat
        }

        setAiResponse(data.aiResponse);
        
        // Add to conversation history
        const newExchange: ConversationExchange = {
          id: crypto.randomUUID(),
          userMessage: transcribedText,
          aiResponse: data.aiResponse,
          timestamp: new Date(),
        };
        setConversationHistory(prev => [...prev, newExchange]);
        
        if (data.conversationId && !currentConversationId) {
          setCurrentConversationId(data.conversationId);
        }

        if (audioEnabled && data.audioContent) {
          setLastAudioContent(data.audioContent);
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
    audioElementRef.current.playbackRate = playbackSpeed;
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
      {/* Voice Command Recognition Feedback */}
      {recognizedCommand && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-60 pointer-events-none animate-scale-in">
          <div className={`${VOICE_COMMANDS[recognizedCommand.command]?.color || 'bg-primary'} text-white px-8 py-6 rounded-2xl shadow-2xl flex flex-col items-center gap-3`}>
            <span className="text-4xl">{VOICE_COMMANDS[recognizedCommand.command]?.icon}</span>
            <div className="text-center">
              <p className="text-lg font-bold capitalize">{recognizedCommand.command}</p>
              <p className="text-sm opacity-80">"{recognizedCommand.matchedPhrase}"</p>
            </div>
          </div>
        </div>
      )}

      {/* Top Controls Bar */}
      <div className="absolute top-6 w-full px-6 flex items-center justify-between max-w-lg mx-auto">
        {/* Voice Selection Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 bg-background/50 backdrop-blur-sm">
              <span className="text-sm">{selectedVoiceLabel}</span>
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
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

        {/* History Toggle with Options */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
            className={`gap-2 bg-background/50 backdrop-blur-sm ${showHistory ? 'bg-primary/20' : ''}`}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">History</span>
            {conversationHistory.length > 0 && (
              <span className="bg-primary text-primary-foreground text-xs rounded-full px-1.5">
                {conversationHistory.length}
              </span>
            )}
          </Button>

          {/* History Actions Dropdown */}
          {conversationHistory.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="w-8 h-8 bg-background/50 backdrop-blur-sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportHistoryAsText}>
                  <Download className="w-4 h-4 mr-2" />
                  Export as Text
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportHistory}>
                  <Download className="w-4 h-4 mr-2" />
                  Export as JSON
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setShowClearDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear History
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Clear History Confirmation Dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear conversation history?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all {conversationHistory.length} exchanges from this session. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={clearHistory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Conversation History Panel */}
      {showHistory && (
        <div className="absolute top-20 left-4 right-4 max-w-lg mx-auto bg-background/90 backdrop-blur-md rounded-lg border shadow-lg max-h-64 animate-fade-in">
          <div className="p-3 border-b flex items-center justify-between">
            <h3 className="text-sm font-medium">Conversation History</h3>
            <span className="text-xs text-muted-foreground">{conversationHistory.length} exchanges</span>
          </div>
          <ScrollArea className="h-52">
            <div className="p-3 space-y-3">
              {conversationHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No conversation yet. Start speaking!
                </p>
              ) : (
                conversationHistory.map((exchange) => (
                  <div key={exchange.id} className="space-y-1 pb-3 border-b last:border-0">
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-medium text-blue-500">You:</span>
                      <p className="text-xs text-muted-foreground flex-1">{exchange.userMessage}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-medium text-primary">Khai:</span>
                      <p className="text-xs flex-1">{exchange.aiResponse}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {exchange.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      )}

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

      {/* Current Transcript Display */}
      {(transcript || aiResponse) && !showHistory && (
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

      {/* Voice Commands Help */}
      <div className="absolute bottom-44 text-center px-4">
        <p className="text-xs text-muted-foreground">
          Voice commands: <span className="text-primary">"stop"</span>, <span className="text-primary">"repeat"</span>, <span className="text-primary">"slower"</span>, <span className="text-primary">"faster"</span>
        </p>
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

        {/* Playback Control Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={stopPlayback}
            disabled={!isSpeaking}
            className="w-10 h-10 rounded-full bg-background/50 backdrop-blur-sm"
            title="Stop playback"
          >
            <Square className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={repeatLastResponse}
            disabled={!lastAudioContent || isSpeaking}
            className="w-10 h-10 rounded-full bg-background/50 backdrop-blur-sm"
            title="Repeat last response"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

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

        {/* Speed Indicator */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground bg-background/50 backdrop-blur-sm px-2 py-1 rounded-full">
          <Gauge className="w-3 h-3" />
          <span>{playbackSpeed.toFixed(1)}x</span>
        </div>

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