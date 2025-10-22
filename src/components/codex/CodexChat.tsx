import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCodexChat } from "@/hooks/useCodexChat";
import { cn } from "@/lib/utils";
import { CodeBlock } from "./CodeBlock";
import { parseMessageContent } from "@/lib/messageParser";

interface CodexChatProps {
  projectId: string | null;
  onFilesCreated?: () => void;
}

export const CodexChat = ({ projectId, onFilesCreated }: CodexChatProps) => {
  const [input, setInput] = useState("");
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

      <ScrollArea className="flex-1 p-3 md:p-4" ref={scrollRef}>
        <div className="space-y-3 md:space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-6 md:py-8">
              <MessageSquare className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 md:mb-4 opacity-50" />
              <p className="text-xs md:text-sm">Ask me anything about your code!</p>
              <p className="text-xs mt-2">I have context of your project files</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] md:max-w-[80%] rounded-lg",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground p-2 md:p-3"
                      : "bg-muted/50"
                  )}
                >
                  <div className="text-xs font-medium mb-1 opacity-70 px-2 pt-2">
                    {message.role === "user" ? "You" : "AI Assistant"}
                  </div>
                  {message.role === "user" ? (
                    <div className="text-xs md:text-sm whitespace-pre-wrap break-words px-2 pb-2">
                      {message.content}
                    </div>
                  ) : (
                    <div className="px-2 pb-2">
                      {parseMessageContent(message.content).map((segment, idx) => (
                        <div key={idx}>
                          {segment.type === "text" ? (
                            <p className="text-xs md:text-sm whitespace-pre-wrap break-words">
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
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg p-2 md:p-3">
                <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="p-3 md:p-4 border-t">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your code..."
            className="min-h-[50px] md:min-h-[60px] max-h-[100px] md:max-h-[120px] resize-none text-sm"
            disabled={loading}
          />
          <Button
            type="submit"
            disabled={!input.trim() || loading || !projectId}
            size="icon"
            className="self-end h-9 w-9 md:h-10 md:w-10"
          >
            {loading ? (
              <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" />
            ) : (
              <Send className="w-3 h-3 md:w-4 md:h-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};
