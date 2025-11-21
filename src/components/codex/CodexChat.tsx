import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, Trash2, Loader2, Sparkles, Zap, Code, LayoutTemplate, ArrowDown } from "lucide-react";
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

interface CodexChatProps {
  projectId: string | null;
  onFilesCreated?: () => void;
  onCodeGenerated?: (code: string, language: string) => void;
}

const quickActions = [
  { label: "Landing Page", icon: <Sparkles className="w-3 h-3" />, prompt: "Create a modern landing page with hero section" },
  { label: "Button", icon: <Zap className="w-3 h-3" />, prompt: "Create a beautiful button component with variants" },
  { label: "Navigation", icon: <MessageSquare className="w-3 h-3" />, prompt: "Create a responsive navigation menu" },
  { label: "Contact Form", icon: <Send className="w-3 h-3" />, prompt: "Create a contact form with validation" },
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
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
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
            {messages.length === 0 ? (
              <div className="space-y-4 sm:space-y-6">
                <div className="text-center space-y-2 sm:space-y-3 py-6 sm:py-8">
                  <h4 className="text-sm sm:text-base font-medium">Quick Actions</h4>
                  <p className="text-xs sm:text-sm text-muted-foreground">Get started with these common requests</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  {quickActions.map((action, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="h-auto p-3 sm:p-4 justify-start text-left hover:bg-accent"
                      onClick={() => handleQuickAction(action.prompt)}
                    >
                      <div className="flex items-start gap-2 sm:gap-3 w-full">
                        <div className="mt-0.5 text-primary">{action.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs sm:text-sm font-medium truncate">{action.label}</div>
                          <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 line-clamp-2">
                            {action.prompt}
                          </div>
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>

                <div className="text-center pt-3 sm:pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowTemplates(true)}
                    className="gap-1 sm:gap-2 text-xs sm:text-sm"
                  >
                    <LayoutTemplate className="w-3 h-3 sm:w-4 sm:h-4" />
                    Browse Templates
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-5 md:space-y-6">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-2 sm:gap-3",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {message.role === "assistant" && (
                      <Avatar className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0 mt-1">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={cn(
                        "rounded-lg shadow-sm w-full max-w-full sm:max-w-[95%] md:max-w-[90%] lg:max-w-[85%]",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      <div className="p-3 sm:p-4 md:p-5">
                        {message.created_at && (
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className={cn(
                              "text-[10px] sm:text-xs opacity-70",
                              message.role === "user" ? "text-primary-foreground" : "text-muted-foreground"
                            )}>
                              {formatTimestamp(message.created_at)}
                            </span>
                          </div>
                        )}
                        {message.role === "user" ? (
                          <p className="text-xs sm:text-sm md:text-base whitespace-pre-wrap break-words leading-relaxed sm:leading-loose">{message.content}</p>
                        ) : (
                          <div className="space-y-2 sm:space-y-3">
                            {parseMessageContent(message.content).map((segment, index) => {
                              if (segment.type === "text") {
                                return (
                                  <p key={index} className="text-xs sm:text-sm md:text-base whitespace-pre-wrap break-words leading-relaxed sm:leading-loose">
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
                        )}
                      </div>
                    </div>
                    {message.role === "user" && (
                      <Avatar className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0 mt-1">
                        <AvatarFallback>U</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
                
                {streaming && (
                  <div className="flex gap-2 sm:gap-3">
                    <Avatar className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0 mt-1">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-muted rounded-lg p-3 sm:p-4">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary rounded-full animate-bounce" />
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Bottom scroll marker */}
                <div ref={scrollBottomRef} className="h-1" />
              </div>
            )}
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

          <form onSubmit={handleSubmit} className="p-3 sm:p-4 md:p-5 border-t bg-muted/30">
            <div className="flex gap-2 sm:gap-3">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe what you want to build..."
                className="min-h-[50px] sm:min-h-[60px] md:min-h-[70px] resize-none text-xs sm:text-sm md:text-base"
                disabled={loading || streaming}
              />
              <Button 
                type="submit" 
                size="icon" 
                disabled={!input.trim() || loading || streaming}
                className="h-[50px] w-[50px] sm:h-[60px] sm:w-[60px] flex-shrink-0"
              >
                <Send className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </div>
          </form>
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
