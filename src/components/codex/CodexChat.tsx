import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, Trash2, Loader2, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCodexChat } from "@/hooks/useCodexChat";
import { cn } from "@/lib/utils";
import { CodeBlock } from "./CodeBlock";
import { parseMessageContent } from "@/lib/messageParser";
import { TemplateGallery } from "./TemplateGallery";

interface CodexChatProps {
  projectId: string | null;
  onFilesCreated?: () => void;
}

const quickActions = [
  { label: "Landing Page", icon: <Sparkles className="w-3 h-3" />, prompt: "Create a modern landing page with hero section" },
  { label: "Button", icon: <Zap className="w-3 h-3" />, prompt: "Create a beautiful button component with variants" },
  { label: "Navigation", icon: <MessageSquare className="w-3 h-3" />, prompt: "Create a responsive navigation menu" },
  { label: "Contact Form", icon: <Send className="w-3 h-3" />, prompt: "Create a contact form with validation" },
];

export const CodexChat = ({ projectId, onFilesCreated }: CodexChatProps) => {
  const [input, setInput] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const { messages, loading, streaming, sendMessage, clearChat } = useCodexChat(projectId);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      });
    }
  }, [messages, streaming]);

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

  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>Create or select a project to start chatting</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 md:p-4 border-b">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 md:w-5 md:h-5" />
          <h3 className="font-semibold text-sm md:text-base">AI Assistant</h3>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearChat}
            disabled={loading}
          >
            <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 p-2 sm:p-3 md:p-4 lg:p-6" ref={scrollRef}>
        <div className="space-y-2 sm:space-y-3 md:space-y-4 max-w-4xl mx-auto">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 md:py-12 lg:py-16 px-4">
              <MessageSquare className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 md:mb-6 opacity-50" />
              <p className="text-sm md:text-base lg:text-lg font-medium mb-2">Ask me anything about your code!</p>
              <p className="text-xs md:text-sm opacity-70 mb-6">I have context of your project files</p>
              
              {/* Quick Actions */}
              <div className="max-w-2xl mx-auto space-y-4">
                <div className="flex items-center gap-2 justify-center mb-3">
                  <Sparkles className="w-4 h-4" />
                  <p className="text-sm font-medium">Quick Start</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {quickActions.map((action) => (
                    <Button
                      key={action.label}
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickAction(action.prompt)}
                      className="justify-start gap-2 h-auto py-3"
                    >
                      {action.icon}
                      <span className="text-xs">{action.label}</span>
                    </Button>
                  ))}
                </div>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowTemplates(true)}
                  className="w-full gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Browse Template Gallery
                </Button>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-2 sm:gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "rounded-lg shadow-sm",
                    "w-full sm:max-w-[90%] md:max-w-[85%] lg:max-w-[80%]",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground p-3 sm:p-4"
                      : "bg-card border border-border"
                  )}
                >
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <div className={cn(
                      "w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-medium",
                      message.role === "user" 
                        ? "bg-primary-foreground/20 text-primary-foreground" 
                        : "bg-primary/10 text-primary"
                    )}>
                      {message.role === "user" ? "U" : "AI"}
                    </div>
                    <span className="text-xs sm:text-sm font-medium opacity-70">
                      {message.role === "user" ? "You" : "AI Assistant"}
                    </span>
                  </div>
                  {message.role === "user" ? (
                    <div className="text-sm sm:text-base whitespace-pre-wrap break-words px-1 leading-relaxed">
                      {message.content}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {parseMessageContent(message.content).map((segment, idx) => (
                        <div key={idx}>
                          {segment.type === "text" ? (
                            <p className="text-sm sm:text-base whitespace-pre-wrap break-words px-1 leading-relaxed">
                              {segment.content}
                            </p>
                          ) : (
                            <CodeBlock code={segment.content} language={segment.language} />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          {streaming && (
            <div className="flex justify-start animate-in fade-in duration-300">
              <div className="bg-card border border-border rounded-lg p-3 sm:p-4 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-xs sm:text-sm text-muted-foreground">AI is thinking...</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="p-2 sm:p-3 md:p-4 border-t bg-background">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your code..."
            className="min-h-[60px] sm:min-h-[70px] md:min-h-[80px] max-h-[120px] md:max-h-[150px] resize-none text-sm sm:text-base"
            disabled={loading}
          />
          <Button
            type="submit"
            disabled={!input.trim() || loading || !projectId}
            size="icon"
            className="self-end h-10 w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 flex-shrink-0"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
            ) : (
              <Send className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </Button>
        </div>
      </form>

      <TemplateGallery 
        open={showTemplates}
        onClose={() => setShowTemplates(false)}
        onSelectTemplate={handleTemplateSelect}
      />
    </div>
  );
};
