import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Mic, ArrowUp } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import logo from "@/assets/kai-ai-logo.png";
import Sidebar from "./Sidebar";
import ChatInputMenu from "./ChatInputMenu";
import AutocompleteSuggestions from "./AutocompleteSuggestions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(initialMessage || "");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId || null);
  const [selectedMode, setSelectedMode] = useState<string>("default");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId);
    } else if (initialMessage && messages.length === 0 && input) {
      handleSend();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    // Generate autocomplete suggestions based on input
    if (input.length > 3) {
      const commonSuggestions = [
        `${input} and what are its key features?`,
        `${input} and its importance in modern technology?`,
        `${input} and why is it useful?`,
      ];
      setSuggestions(commonSuggestions);
    } else {
      setSuggestions([]);
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
    setSelectedMode("default");
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

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput("");
    setSuggestions([]);
    setIsLoading(true);

    try {
      // Create or update conversation
      let currentConvId = conversationId;
      
      if (!currentConvId) {
        const { data: session } = await supabase.auth.getSession();
        
        if (session.session) {
          // Create new conversation
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

      // Save user message to database if we have a conversation
      if (currentConvId) {
        await supabase.from("messages").insert({
          conversation_id: currentConvId,
          role: "user",
          content: currentInput,
        });
      }

      // Call the chat edge function with mode info
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          messages: messages.concat(userMessage).map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          mode: selectedMode,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, aiMessage]);

      // Save AI message to database
      if (currentConvId) {
        await supabase.from("messages").insert({
          conversation_id: currentConvId,
          role: "assistant",
          content: data.message,
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I'm sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar 
        onNewChat={handleNewChat} 
        onBack={onBack} 
        onSelectConversation={onSelectConversation}
        currentConversationId={conversationId}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-16 border-b border-border flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Khai AI" className="w-8 h-8" />
            <span className="font-semibold">Khai</span>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <img src={logo} alt="Khai AI" className="w-20 h-20 opacity-50" />
              <h2 className="text-2xl font-semibold">Start a conversation</h2>
              <p className="text-muted-foreground max-w-md">
                Ask me anything! I can help with writing, coding, analysis, and much more.
              </p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-4 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  } animate-fade-in`}
                >
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center flex-shrink-0">
                      <img src={logo} alt="AI" className="w-5 h-5" />
                    </div>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-3 max-w-[80%] ${
                      message.role === "user"
                        ? "bg-gradient-primary text-white"
                        : "bg-card border border-border"
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{message.content}</p>
                  </div>
                  {message.role === "user" && (
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold">You</span>
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-4 animate-fade-in">
                  <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                    <img src={logo} alt="AI" className="w-5 h-5" />
                  </div>
                  <div className="bg-card border border-border rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-100"></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-200"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="border-t border-border p-4">
          <div className="max-w-3xl mx-auto relative">
            <AutocompleteSuggestions
              suggestions={suggestions}
              onSelect={(suggestion) => {
                setInput(suggestion);
                setSuggestions([]);
                inputRef.current?.focus();
              }}
            />
            <div className="flex gap-2 items-center bg-secondary border border-border rounded-full px-2 py-2">
              <ChatInputMenu onModeSelect={handleModeSelect} />
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder={
                  selectedMode === "default"
                    ? "Ask anything..."
                    : `Ask in ${selectedMode} mode...`
                }
                className="flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-4 py-2"
              />
              <Button
                variant="ghost"
                size="icon"
                className={`rounded-full h-10 w-10 ${isRecording ? "text-red-500" : ""}`}
                onClick={handleVoiceInput}
              >
                <Mic className="w-5 h-5" />
              </Button>
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="bg-gradient-primary hover:opacity-90 text-white rounded-full h-10 w-10"
              >
                <ArrowUp className="w-5 h-5" />
              </Button>
            </div>
            {selectedMode !== "default" && (
              <div className="text-xs text-muted-foreground mt-2 text-center">
                Mode: <span className="font-medium text-primary">{selectedMode}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
