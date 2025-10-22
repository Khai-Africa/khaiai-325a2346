import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CodeBlockProps {
  code: string;
  language?: string;
}

export const CodeBlock = ({ code, language = "text" }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Code copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy code");
    }
  };

  return (
    <div className="rounded-lg overflow-hidden border border-border bg-secondary/30 my-2 sm:my-3">
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-secondary/50 border-b border-border">
        <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase truncate max-w-[50%]">
          {language || "code"}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 sm:h-8 gap-1 sm:gap-2 text-xs flex-shrink-0"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Copy</span>
            </>
          )}
        </Button>
      </div>
      <div className="overflow-x-auto">
        <pre
          className="m-0 p-3 sm:p-4 text-xs sm:text-sm font-mono leading-relaxed bg-secondary/20"
          style={{ tabSize: 2, whiteSpace: "pre" }}
        >
          <code className="break-words">{code}</code>
        </pre>
      </div>
    </div>
  );
};
