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
    <div className="rounded-lg overflow-hidden border border-border bg-card my-3">
      <div className="flex items-center justify-between px-4 py-2 bg-secondary/50 border-b border-border">
        <span className="text-xs font-medium text-muted-foreground uppercase">
          {language}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 gap-2 text-xs"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              Copy code
            </>
          )}
        </Button>
      </div>
      <div className="overflow-x-auto">
        <pre
          className="m-0 p-4 text-xs md:text-sm font-mono leading-relaxed bg-card"
          style={{ tabSize: 2, whiteSpace: "pre" }}
        >
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};
