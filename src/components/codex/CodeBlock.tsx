import { useState } from "react";
import { Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface CodeBlockProps {
  code: string;
  language?: string;
}

export const CodeBlock = ({ code, language = "text" }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);
  const lineCount = code.split('\n').length;
  const shouldCollapse = lineCount > 10;
  const [isOpen, setIsOpen] = useState(!shouldCollapse);
  
  const previewLines = code.split('\n').slice(0, 5).join('\n');

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

  if (!shouldCollapse) {
    // Show full code for short snippets
    return (
      <div className="rounded-lg overflow-hidden border border-border bg-secondary/30 my-2 sm:my-3">
        <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-secondary/50 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase">
              {language || "code"}
            </span>
            <Badge variant="outline" className="text-xs">
              {lineCount} {lineCount === 1 ? 'line' : 'lines'}
            </Badge>
          </div>
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
  }

  // Show collapsible code for long snippets
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="rounded-lg overflow-hidden border border-border bg-secondary/30 my-2 sm:my-3">
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-secondary/50 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase">
            {language || "code"}
          </span>
          <Badge variant="outline" className="text-xs">
            {lineCount} lines
          </Badge>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 sm:h-8 gap-1 sm:gap-2 text-xs"
            >
              {isOpen ? (
                <>
                  <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Collapse</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Expand</span>
                </>
              )}
            </Button>
          </CollapsibleTrigger>
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
      </div>
      
      {!isOpen && (
        <div className="overflow-x-auto relative">
          <pre
            className="m-0 p-3 sm:p-4 text-xs sm:text-sm font-mono leading-relaxed bg-secondary/20"
            style={{ tabSize: 2, whiteSpace: "pre" }}
          >
            <code className="break-words">{previewLines}</code>
          </pre>
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-secondary/30 to-transparent pointer-events-none" />
        </div>
      )}
      
      <CollapsibleContent>
        <div className="overflow-x-auto">
          <pre
            className="m-0 p-3 sm:p-4 text-xs sm:text-sm font-mono leading-relaxed bg-secondary/20"
            style={{ tabSize: 2, whiteSpace: "pre" }}
          >
            <code className="break-words">{code}</code>
          </pre>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
