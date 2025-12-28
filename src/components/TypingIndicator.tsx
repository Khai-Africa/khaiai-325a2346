import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";

interface TypingIndicatorProps {
  isRetrying?: boolean;
  retryCount?: number;
}

export const TypingIndicator = ({ isRetrying = false, retryCount = 0 }: TypingIndicatorProps) => {
  const [dots, setDots] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev + 1) % 4);
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex gap-3 md:gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <div className="w-4 h-4 rounded-full bg-primary animate-pulse" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="bg-card border border-border rounded-2xl px-4 py-3 flex items-center gap-1">
          <div className="flex gap-1.5">
            <span 
              className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" 
              style={{ animationDelay: '0ms', animationDuration: '600ms' }}
            />
            <span 
              className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" 
              style={{ animationDelay: '150ms', animationDuration: '600ms' }}
            />
            <span 
              className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" 
              style={{ animationDelay: '300ms', animationDuration: '600ms' }}
            />
          </div>
          <span className="text-sm text-muted-foreground ml-2">
            Kai is thinking{'.'.repeat(dots)}
          </span>
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
