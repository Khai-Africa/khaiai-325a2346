import { useEffect, useState } from "react";
import { RotateCcw, Brain, Sparkles, MessageSquare, Search, Lightbulb } from "lucide-react";

interface TypingIndicatorProps {
  isRetrying?: boolean;
  retryCount?: number;
}

const actionDescriptions = [
  { text: "Understanding your request", icon: Brain },
  { text: "Thinking through the answer", icon: Lightbulb },
  { text: "Searching for relevant info", icon: Search },
  { text: "Crafting a helpful response", icon: MessageSquare },
  { text: "Adding finishing touches", icon: Sparkles },
];

export const TypingIndicator = ({ isRetrying = false, retryCount = 0 }: TypingIndicatorProps) => {
  const [dots, setDots] = useState(0);
  const [actionIndex, setActionIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setDots((prev) => (prev + 1) % 4);
    }, 400);
    return () => clearInterval(dotsInterval);
  }, []);

  useEffect(() => {
    const actionInterval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setActionIndex((prev) => (prev + 1) % actionDescriptions.length);
        setIsTransitioning(false);
      }, 200);
    }, 3000);
    return () => clearInterval(actionInterval);
  }, []);

  const currentAction = actionDescriptions[actionIndex];
  const ActionIcon = currentAction.icon;

  return (
    <div className="flex gap-3 md:gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <div className="w-4 h-4 rounded-full bg-primary animate-pulse" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="bg-card border border-border rounded-2xl px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <span 
                className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" 
                style={{ animationDelay: "0ms", animationDuration: "600ms" }}
              />
              <span 
                className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" 
                style={{ animationDelay: "150ms", animationDuration: "600ms" }}
              />
              <span 
                className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" 
                style={{ animationDelay: "300ms", animationDuration: "600ms" }}
              />
            </div>
            <div className="flex items-center gap-2 overflow-hidden">
              <ActionIcon 
                className={`w-4 h-4 text-primary flex-shrink-0 transition-all duration-200 ${
                  isTransitioning ? "opacity-0 scale-75" : "opacity-100 scale-100"
                }`} 
              />
              <span 
                className={`text-sm text-muted-foreground transition-all duration-200 ${
                  isTransitioning ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
                }`}
              >
                {currentAction.text}{".".repeat(dots)}
              </span>
            </div>
          </div>
        </div>
        {isRetrying && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <RotateCcw className="w-3 h-3 animate-spin" />
            <span>Retrying... (attempt {retryCount}/3)</span>
          </div>
        )}
      </div>
    </div>
  );
};
