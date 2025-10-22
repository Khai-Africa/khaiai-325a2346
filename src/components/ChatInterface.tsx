import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic, ArrowUp, Menu, X, Volume2, Square } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import logo from "@/assets/kai-ai-logo.png";
import Sidebar from "./Sidebar";
import ChatInputMenu from "./ChatInputMenu";
import PlusMenu from "./PlusMenu";
import MessageActions from "./MessageActions";
import { UsageIndicator } from "./UsageIndicator";
import { TypewriterPlaceholder } from "./TypewriterPlaceholder";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUsage } from "@/hooks/useUsage";
import { useAnonymousUsage } from "@/hooks/useAnonymousUsage";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from "@/hooks/useTranslation";
import { LanguageSwitch } from "./LanguageSwitch";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatInterfaceProps {
  onBack: () => void;
  initialMessage?: string;
  conversationId?: string;
  onSelectConversation: (conversationId: string) => void;
}

const ChatInterface = ({ onBack, initialMessage, conversationId: initialConversationId, onSelectConversation }: ChatInterfaceProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(initialMessage || "");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId || null);
  const [selectedMode, setSelectedMode] = useState<string>("chat");
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { refetch: refetchUsage } = useUsage();
  const anonymousUsage = useAnonymousUsage();
  const isAnonymous = !user;

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Auto-hide sidebar on mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId);
    } else if (initialMessage && messages.length === 0 && input) {
      handleSend();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [input]);

  const loadConversation = async (convId: string) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const loadedMessages: Message[] = data.map((msg) => ({
        id: msg.id,
        role: msg.role as "user" | "assistant",
        content: msg.content,
        timestamp: new Date(msg.created_at),
      }));

      setMessages(loadedMessages);
    } catch (error) {
      console.error("Error loading conversation:", error);
      toast.error(t('chat.loadConversationFailed'));
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setConversationId(null);
    setInput("");
    setSelectedMode("chat");
  };

  const handleModeSelect = (mode: string) => {
    setSelectedMode(mode);
    toast.info(t('chat.switchedToMode', { mode }));
  };

  const handleVoiceInput = async () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      }
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm',
        });
        
        audioChunksRef.current = [];
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };
        
        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
          // Convert to base64
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = reader.result?.toString().split(',')[1];
            
              if (base64Audio) {
              toast.info(t('chat.transcribing'));
              
              try {
                const { data, error } = await supabase.functions.invoke('transcribe-audio', {
                  body: { audio: base64Audio }
                });
                
                if (error) throw error;
                
                if (data.text) {
                  setInput(data.text);
                  toast.success(t('chat.audioTranscribed'));
                } else {
                  toast.error(t('chat.noSpeechDetected'));
                }
              } catch (error) {
                console.error('Transcription error:', error);
                toast.error(t('chat.transcribeFailed'));
              }
            }
          };
          
          // Stop all tracks
          stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start();
        setIsRecording(true);
        toast.info(t('chat.recording'));
      } catch (error) {
        console.error('Error accessing microphone:', error);
        toast.error(t('chat.microphoneError'));
      }
    }
  };

  const handleSpeakMessage = async (text: string) => {
    try {
      // Stop any currently playing audio
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
        setIsSpeaking(false);
      }

      if (isSpeaking) {
        return;
      }

      setIsSpeaking(true);
      toast.info(t('chat.generatingSpeech'));

      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text, voice: 'alloy' }
      });

      // Handle errors from edge function
      if (error) {
        console.error('Edge function error:', error);
        throw new Error('Failed to connect to speech service');
      }

      // Check for error in response data
      if (data?.error) {
        console.error('TTS API error:', data.error);
        throw new Error(data.error);
      }

      // Validate audio content exists
      if (!data?.audioContent) {
        console.error('No audio content in response:', data);
        throw new Error('No audio content received from service');
      }

      // Convert base64 to audio
      const audioBlob = new Blob(
        [Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0))],
        { type: 'audio/mpeg' }
      );
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
      };
      
      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        setIsSpeaking(false);
        toast.error(t('chat.speechFailed'));
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
      };
      
      currentAudioRef.current = audio;
      
      // Handle play promise rejection
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            toast.success(t('chat.playingAudio'));
          })
          .catch(error => {
            console.error('Audio play error:', error);
            setIsSpeaking(false);
            toast.error(t('chat.speechFailed'));
            URL.revokeObjectURL(audioUrl);
          });
      }
    } catch (error) {
      console.error('TTS error:', error);
      setIsSpeaking(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`${t('chat.speechFailed')}: ${errorMessage}`);
    }
  };

  const stopSpeaking = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
      setIsSpeaking(false);
      toast.info(t('chat.stoppedSpeaking'));
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    // Check anonymous user quota
    if (isAnonymous) {
      if (!anonymousUsage.hasMessageQuota()) {
        toast.error(t('chat.freeTrialLimit'), {
          duration: 6000,
          action: {
            label: t('chat.signUp'),
            onClick: () => navigate('/auth')
          }
        });
        return;
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput("");
    setIsLoading(true);

    try {
      // Create or update conversation (only for authenticated users)
      let currentConvId = conversationId;
      
      if (!isAnonymous && !currentConvId) {
        const { data: session } = await supabase.auth.getSession();
        
        if (session.session) {
          const title = currentInput.slice(0, 50) + (currentInput.length > 50 ? "..." : "");
          const { data: newConv, error: convError } = await supabase
            .from("conversations")
            .insert({ user_id: session.session.user.id, title })
            .select()
            .single();

          if (convError) throw convError;
          currentConvId = newConv.id;
          setConversationId(currentConvId);
        }
      }

      // Save user message to database (only for authenticated users with conversation)
      if (!isAnonymous && currentConvId) {
        await supabase.from("messages").insert({
          conversation_id: currentConvId,
          role: "user",
          content: currentInput,
        });
      }

      // Call the chat edge function
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Only add auth header if user is authenticated
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: messages.concat(userMessage).map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          conversationId: currentConvId,
          mode: selectedMode,
        }),
      });

      const data = await response.json();

      // Handle specific error codes
      if (!response.ok) {
        if (data.errorCode === 'RATE_LIMIT') {
          toast.error(t('chat.rateLimitExceeded'));
          throw new Error('Rate limit exceeded');
        } else if (data.errorCode === 'PAYMENT_REQUIRED') {
          if (isAnonymous) {
            toast.error(t('chat.freeTrialLimit'), {
              duration: 6000,
              action: {
                label: t('chat.signUp'),
                onClick: () => navigate('/auth')
              }
            });
          } else {
            toast.error(t('chat.messageLimitReached'), {
              action: {
                label: t('chat.upgrade'),
                onClick: () => navigate('/premium')
              }
            });
          }
          throw new Error('Payment required');
        } else if (response.status === 401) {
          toast.error(t('chat.authError'));
          throw new Error('Authentication required');
        } else {
          throw new Error(data.error || 'Failed to get AI response');
        }
      }
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, aiMessage]);

      // Save AI message to database (only for authenticated users)
      if (!isAnonymous && currentConvId) {
        await supabase.from("messages").insert({
          conversation_id: currentConvId,
          role: "assistant",
          content: data.message,
        });
      }

      // Update usage tracking
      if (isAnonymous) {
        anonymousUsage.incrementMessageCount();
        
        // Show signup prompt after a few messages
        const newCount = anonymousUsage.usage.messageCount + 1;
        if (newCount === 3) {
          toast.info(t('chat.messagesLeft', { count: 2 }), {
            duration: 5000,
            action: {
              label: t('chat.signUp'),
              onClick: () => navigate('/auth')
            }
          });
        }
      } else {
        refetchUsage();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Don't show generic error if we already showed a specific one
      const errorString = error instanceof Error ? error.message : String(error);
      if (!errorString.includes('Rate limit') && 
          !errorString.includes('Payment required') && 
          !errorString.includes('Authentication')) {
        toast.error(t('chat.sendFailed'));
      }
      
      // Remove the user message if there was an error
      setMessages((prev) => prev.filter(msg => msg.id !== userMessage.id));
      setInput(currentInput); // Restore the input
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      {sidebarOpen && (
        <Sidebar 
          onNewChat={handleNewChat} 
          onBack={onBack} 
          onSelectConversation={onSelectConversation}
          currentConversationId={conversationId}
          onClose={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-muted-foreground hover:text-foreground"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            <button 
              onClick={() => navigate("/")}
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <img src={logo} alt="Khai AI" className="w-8 h-8" />
              <span className="text-lg font-semibold">Khai AI</span>
            </button>
          </div>
          <LanguageSwitch />
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4 md:p-6">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-medium">
                {t('chat.whatCanIHelp')}
              </h1>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-8 pb-4">
              {messages.map((message, index) => (
                <div key={message.id} className="animate-fade-in">
                  {message.role === "user" ? (
                    <div className="flex justify-end mb-8">
                      <div className="bg-card border border-border rounded-3xl px-5 py-3 max-w-[85%]">
                        <p className="text-sm md:text-base leading-relaxed">{message.content}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3 md:gap-4">
                      <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0 mt-1">
                        <img src={logo} alt="AI" className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">
                          {message.content}
                        </p>
                        <MessageActions 
                          content={message.content}
                          conversationId={conversationId}
                          onSpeak={handleSpeakMessage}
                          onRegenerate={index === messages.length - 1 && !isLoading ? () => {
                            // Handle regenerate
                            toast.info(t('actions.regenerating'));
                          } : undefined}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 md:gap-4 animate-fade-in">
                  <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0">
                    <img src={logo} alt="AI" className="w-5 h-5" />
                  </div>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="p-4">
          <div className="max-w-3xl mx-auto">
            <div className="relative bg-card rounded-[28px] shadow-lg">
              <div className="flex flex-col gap-2 p-4">
                <div className="flex items-start gap-3">
                  <PlusMenu 
                    onModeSelect={handleModeSelect}
                    onFilesSelect={() => {
                      // Trigger file upload via the FileUpload component in ChatInputMenu
                      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
                      fileInput?.click();
                    }}
                  />
                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder=""
                    className="flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none min-h-[24px] max-h-[200px] text-base"
                    rows={1}
                  />
                  {!input && (
                    <div className="absolute left-16 top-[18px] pointer-events-none">
                      <TypewriterPlaceholder />
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`rounded-full h-10 w-10 ${isRecording ? "text-primary animate-pulse" : "text-muted-foreground"}`}
                      onClick={handleVoiceInput}
                    >
                      {isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </Button>
                    {isSpeaking ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full h-10 w-10 text-primary animate-pulse"
                        onClick={stopSpeaking}
                      >
                        <Square className="w-5 h-5" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full h-10 w-10 text-muted-foreground"
                        onClick={() => {
                          const lastMessage = messages[messages.length - 1];
                          if (lastMessage?.role === 'assistant') {
                            handleSpeakMessage(lastMessage.content);
                          }
                        }}
                        disabled={!messages.length || messages[messages.length - 1]?.role !== 'assistant'}
                      >
                        <Volume2 className="w-5 h-5" />
                      </Button>
                    )}
                    <Button
                      onClick={handleSend}
                      disabled={!input.trim() || isLoading}
                      size="icon"
                      className="rounded-full h-10 w-10 bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ArrowUp className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
                <ChatInputMenu 
                  onModeSelect={handleModeSelect}
                  selectedFiles={selectedFiles}
                  onFilesSelect={setSelectedFiles}
                  onRemoveFile={(index) => {
                    const newFiles = [...selectedFiles];
                    newFiles.splice(index, 1);
                    setSelectedFiles(newFiles);
                  }}
                />
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <UsageIndicator />
              <p className="text-xs text-center text-muted-foreground">
                Khai AI can make mistakes. Check important info.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
