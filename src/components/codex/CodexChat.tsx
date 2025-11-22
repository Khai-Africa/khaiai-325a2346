import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, Trash2, Loader2, Sparkles, Zap, Code, LayoutTemplate, ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useCodexChat } from "@/hooks/useCodexChat";
import { cn } from "@/lib/utils";
import { CodeBlock } from "./CodeBlock";
import { parseMessageContent } from "@/lib/messageParser";
import { TemplateGallery } from "./TemplateGallery";
import { formatDistanceToNow } from 'date-fns';
import MessageActions from "@/components/MessageActions";
import { TypewriterPlaceholder } from "@/components/TypewriterPlaceholder";
import logo from "@/assets/kai-ai-logo.png";

interface CodexChatProps {
  projectId: string | null;
  onFilesCreated?: () => void;
  onCodeGenerated?: (code: string, language: string) => void;
}

const quickActions = [
  { 
    label: "Landing Page", 
    icon: "🚀", 
    description: "Modern hero section with CTA",
    prompt: "Create a modern landing page with hero section" 
  },
  { 
    label: "Button Component", 
    icon: "⚡", 
    description: "Reusable with variants",
    prompt: "Create a beautiful button component with variants" 
  },
  { 
    label: "Navigation Menu", 
    icon: "🧭", 
    description: "Responsive navbar",
    prompt: "Create a responsive navigation menu" 
  },
  { 
    label: "Contact Form", 
    icon: "📧", 
    description: "With validation",
    prompt: "Create a contact form with validation" 
  },
];

export const CodexChat = ({ projectId, onFilesCreated, onCodeGenerated }: CodexChatProps) => {
  const [input, setInput] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const { messages, loading, streaming, sendMessage, clearChat } = useCodexChat(projectId);
  const scrollBottomRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Smart auto-scroll: only scroll if user is near bottom
    const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (scrollContainer) {
      const isNearBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 100;
      
      // Only auto-scroll if near bottom or first message
      if (isNearBottom || messages.length <= 1) {
        scrollBottomRef.current?.scrollIntoView({ 
          behavior: "smooth",
          block: "end"
        });
      }
    }

    // Auto-preview the latest AI message with code
    if (messages.length > 0 && onCodeGenerated) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant') {
        const segments = parseMessageContent(lastMessage.content);
        const codeSegment = segments.find(s => s.type === 'code' && 
          (s.language === 'html' || s.language === 'javascript' || s.language === 'js' || 
           s.language === 'jsx' || s.language === 'tsx' || s.language === 'css' || s.language === 'react'));
        if (codeSegment) {
          onCodeGenerated(codeSegment.content, codeSegment.language || 'html');
        }
      }
    }
  }, [messages, streaming, onCodeGenerated]);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement;
    const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 100;
    setShowScrollButton(!isNearBottom && messages.length > 0);
  };

  const scrollToBottom = () => {
    scrollBottomRef.current?.scrollIntoView({ 
      behavior: "smooth",
      block: "end"
    });
    setShowScrollButton(false);
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || !projectId) return;

    const message = input.trim();
    setInput("");
    await sendMessage(message, onFilesCreated);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleQuickAction = (prompt: string) => {
    setInput(prompt);
  };

  const handleTemplateSelect = (prompt: string) => {
    setInput(prompt);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {projectId === null ? (
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="text-center space-y-3 sm:space-y-4">
            <Code className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-muted-foreground" />
            <div className="space-y-1 sm:space-y-2">
              <h3 className="text-base sm:text-lg font-semibold">No Project Selected</h3>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-sm">
                Select or create a project to start chatting with the AI assistant
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="sticky top-0 z-10 flex items-center justify-between p-3 sm:p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0">
                <img src={logo} alt="AI" className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-semibold">AI Assistant</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Powered by Gemini 3.0 Pro</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearChat}
              className="h-7 sm:h-8 text-xs"
            >
              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline ml-1 sm:ml-2">Clear</span>
            </Button>
          </div>

          <ScrollArea 
            ref={scrollAreaRef}
            className="flex-1 h-[calc(100%-120px)] p-3 sm:p-4 md:p-5" 
            onScrollCapture={handleScroll}
          >
            <div className="max-w-3xl mx-auto">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-medium mb-8 sm:mb-12 text-center">
                    What would you like to build?
                  </h1>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-2xl w-full">
                    {quickActions.map((action) => (
                      <Button
                        key={action.label}
                        variant="outline"
                        className="h-auto p-3 sm:p-4 justify-start hover:bg-accent text-left flex flex-col items-start gap-2 rounded-2xl"
                        onClick={() => handleQuickAction(action.prompt)}
                      >
                        <span className="text-2xl sm:text-3xl">{action.icon}</span>
                        <div>
                          <div className="font-medium text-sm sm:text-base">{action.label}</div>
                          <div className="text-xs sm:text-sm text-muted-foreground">{action.description}</div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
              <div className="space-y-8">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-3 sm:gap-4 animate-fade-in",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {message.role === "assistant" && (
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0 mt-1">
                        <img src={logo} alt="AI" className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "rounded-3xl px-4 sm:px-5 py-2.5 sm:py-3",
                        message.role === "user"
                          ? "bg-card border border-border max-w-[85%]"
                          : "max-w-full"
                      )}
                    >
                      {message.created_at && (
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="text-[10px] sm:text-xs text-muted-foreground">
                            {formatTimestamp(message.created_at)}
                          </span>
                        </div>
                      )}
                      {message.role === "user" ? (
                        <p className="text-xs sm:text-sm md:text-base whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
                      ) : (
                        <>
                          <div className="space-y-2 sm:space-y-3">
                            {parseMessageContent(message.content).map((segment, index) => {
                              if (segment.type === "text") {
                                return (
                                  <p key={index} className="text-xs sm:text-sm md:text-base whitespace-pre-wrap break-words leading-relaxed">
                                    {segment.content}
                                  </p>
                                );
                              } else {
                                return (
                                  <CodeBlock
                                    key={index}
                                    code={segment.content}
                                    language={segment.language}
                                  />
                                );
                              }
                            })}
                          </div>
                          <MessageActions 
                            content={message.content}
                            conversationId={projectId}
                          />
                        </>
                      )}
                    </div>
                    {message.role === "user" && (
                      <Avatar className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0 mt-1">
                        <AvatarFallback>U</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
                
                {streaming && (
                  <div className="flex gap-3 sm:gap-4 animate-fade-in">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div className="flex gap-1 items-center">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.1s]"></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    </div>
                  </div>
                )}
                
                {/* Bottom scroll marker */}
                <div ref={scrollBottomRef} className="h-1" />
              </div>
              )}
            </div>
          </ScrollArea>

          {/* Floating scroll to bottom button */}
          {showScrollButton && (
            <Button
              onClick={scrollToBottom}
              size="icon"
              className="fixed bottom-[140px] right-4 sm:bottom-24 sm:right-8 h-10 w-10 sm:h-12 sm:w-12 rounded-full shadow-lg z-20 animate-in fade-in slide-in-from-bottom-2 bg-primary hover:bg-primary/90"
              variant="default"
            >
              <ArrowDown className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          )}

          <div className="p-3 sm:p-4">
            <div className="max-w-3xl mx-auto">
              <form onSubmit={handleSubmit}>
                <div className="relative bg-card rounded-[28px] shadow-lg border border-border/50">
                  <div className="flex items-end gap-2 sm:gap-3 p-3 sm:p-4">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="rounded-full h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0"
                      onClick={() => setShowTemplates(true)}
                    >
                      <LayoutTemplate className="w-4 h-4 sm:w-5 sm:h-5" />
                    </Button>
                    
                    <div className="flex-1 relative">
                      <Textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder=""
                        className="bg-transparent border-0 focus-visible:ring-0 resize-none min-h-[24px] max-h-[200px] text-sm sm:text-base p-0 shadow-none"
                        rows={1}
                        disabled={loading || streaming}
                      />
                      {!input && (
                        <div className="absolute left-0 top-0 pointer-events-none text-muted-foreground">
                          <TypewriterPlaceholder />
                        </div>
                      )}
                    </div>
                    
                    <Button
                      type="submit"
                      size="icon"
                      className="rounded-full h-9 w-9 sm:h-10 sm:w-10 bg-muted hover:bg-accent flex-shrink-0"
                      disabled={!input.trim() || loading || streaming}
                    >
                      <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5" />
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      <TemplateGallery 
        open={showTemplates}
        onClose={() => setShowTemplates(false)}
        onSelectTemplate={handleTemplateSelect}
      />
    </div>
  );
};
