import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic, ArrowUp, Menu, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import logo from "@/assets/kai-ai-logo.png";
import Sidebar from "./Sidebar";
import ChatInputMenu from "./ChatInputMenu";
import PlusMenu from "./PlusMenu";
import MessageActions from "./MessageActions";
import { UsageIndicator } from "./UsageIndicator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUsage } from "@/hooks/useUsage";
import { useAnonymousUsage } from "@/hooks/useAnonymousUsage";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(initialMessage || "");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId || null);
  const [selectedMode, setSelectedMode] = useState<string>("chat");
  const [isRecording, setIsRecording] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { refetch: refetchUsage } = useUsage();
  const anonymousUsage = useAnonymousUsage();
  const isAnonymous = !user;

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
      toast.error("Failed to load conversation");
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
    toast.info(`Switched to ${mode} mode`);
  };

  const handleVoiceInput = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      toast.info("Voice input feature coming soon!");
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    // Check anonymous user quota
    if (isAnonymous) {
      if (!anonymousUsage.hasMessageQuota()) {
        toast.error('Free trial limit reached. Create an account to continue chatting!', {
          duration: 6000,
          action: {
            label: 'Sign Up',
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
          toast.error('Rate limit exceeded. Please wait a moment and try again.');
          throw new Error('Rate limit exceeded');
        } else if (data.errorCode === 'PAYMENT_REQUIRED') {
          if (isAnonymous) {
            toast.error('Free trial limit reached. Create an account to continue!', {
              duration: 6000,
              action: {
                label: 'Sign Up',
                onClick: () => navigate('/auth')
              }
            });
          } else {
            toast.error('Message limit reached. Upgrade to Premium for unlimited messages.', {
              action: {
                label: 'Upgrade',
                onClick: () => navigate('/premium')
              }
            });
          }
          throw new Error('Payment required');
        } else if (response.status === 401) {
          toast.error('Authentication error. Please log in again.');
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
          toast.info('You have 2 messages left. Sign up for a free account to get more!', {
            duration: 5000,
            action: {
              label: 'Sign Up',
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
        toast.error('Failed to send message. Please try again.');
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
            <img src={logo} alt="Khai AI" className="w-8 h-8" />
            <span className="font-semibold">Khai</span>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4 md:p-6">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-medium">
                What can I help with?
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
                          onRegenerate={index === messages.length - 1 && !isLoading ? () => {
                            // Handle regenerate
                            toast.info("Regenerating response...");
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
                    placeholder="Ask anything"
                    className="flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none min-h-[24px] max-h-[200px] text-base"
                    rows={1}
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`rounded-full h-10 w-10 ${isRecording ? "text-primary" : "text-muted-foreground"}`}
                      onClick={handleVoiceInput}
                    >
                      <Mic className="w-5 h-5" />
                    </Button>
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
