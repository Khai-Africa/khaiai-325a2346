import { useState } from "react";
import { Copy, Check, ChevronDown, ChevronUp, Download, Maximize2, MoreHorizontal, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface CodeBlockProps {
  code: string;
  language?: string;
}

export const CodeBlock = ({ code, language = "text" }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);
  const [formattedCode, setFormattedCode] = useState(code);
  const [isFormatting, setIsFormatting] = useState(false);
  const lineCount = formattedCode.split('\n').length;
  const shouldCollapse = lineCount > 10;
  const [isOpen, setIsOpen] = useState(!shouldCollapse);
  
  const previewLines = formattedCode.split('\n').slice(0, 5).join('\n');

  const handleFormat = () => {
    setIsFormatting(true);
    try {
      // Basic formatting: normalize indentation
      const lines = formattedCode.split('\n');
      let indentLevel = 0;
      const formatted = lines.map(line => {
        const trimmed = line.trim();
        if (!trimmed) return '';
        
        // Decrease indent for closing brackets
        if (trimmed.startsWith('}') || trimmed.startsWith(']') || trimmed.startsWith(')')) {
          indentLevel = Math.max(0, indentLevel - 1);
        }
        
        const indented = '  '.repeat(indentLevel) + trimmed;
        
        // Increase indent for opening brackets
        if (trimmed.endsWith('{') || trimmed.endsWith('[') || trimmed.endsWith('(')) {
          indentLevel++;
        }
        
        return indented;
      }).join('\n');
      
      setFormattedCode(formatted);
      toast.success('Code formatted');
    } catch (error) {
      toast.error('Failed to format code');
    } finally {
      setIsFormatting(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedCode);
      setCopied(true);
      toast.success("Code copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy code");
    }
  };

  const handleDownload = () => {
    const extension = language === 'javascript' || language === 'js' ? 'js' 
      : language === 'typescript' || language === 'ts' ? 'ts'
      : language === 'jsx' ? 'jsx'
      : language === 'tsx' ? 'tsx'
      : language === 'html' ? 'html'
      : language === 'css' ? 'css'
      : language === 'python' ? 'py'
      : 'txt';
    
    const blob = new Blob([formattedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Code downloaded");
  };

  // HTML escape function to prevent XSS
  const escapeHtml = (text: string): string => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  const handleFullscreen = () => {
    // Create fullscreen container
    const fullscreenDiv = document.createElement('div');
    fullscreenDiv.className = 'fixed inset-0 z-50 bg-background flex flex-col';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'flex items-center justify-between p-4 border-b border-border';
    
    const leftSection = document.createElement('div');
    leftSection.className = 'flex items-center gap-2';
    
    const langSpan = document.createElement('span');
    langSpan.className = 'text-sm font-medium uppercase';
    langSpan.textContent = language || 'code';
    
    const linesSpan = document.createElement('span');
    linesSpan.className = 'text-xs text-muted-foreground';
    linesSpan.textContent = `${lineCount} lines`;
    
    leftSection.appendChild(langSpan);
    leftSection.appendChild(linesSpan);
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'text-sm hover:text-foreground text-muted-foreground';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', () => {
      document.body.removeChild(fullscreenDiv);
    });
    
    header.appendChild(leftSection);
    header.appendChild(closeBtn);
    
    // Create content area
    const contentDiv = document.createElement('div');
    contentDiv.className = 'flex-1 overflow-auto p-4';
    
    const pre = document.createElement('pre');
    pre.className = 'text-sm';
    
    const codeEl = document.createElement('code');
    codeEl.textContent = formattedCode; // Safe: textContent doesn't execute HTML
    
    pre.appendChild(codeEl);
    contentDiv.appendChild(pre);
    
    fullscreenDiv.appendChild(header);
    fullscreenDiv.appendChild(contentDiv);
    document.body.appendChild(fullscreenDiv);
  };

  if (!shouldCollapse) {
    // Show full code for short snippets
    return (
      <div className="rounded-lg overflow-hidden border border-border bg-secondary/30 my-2 sm:my-3">
        <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-secondary/50 border-b border-border">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase truncate">
              {language || "code"}
            </span>
            <Badge variant="outline" className="text-xs flex-shrink-0">
              {lineCount} {lineCount === 1 ? 'line' : 'lines'}
            </Badge>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-7 sm:h-8 gap-1 text-xs"
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
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFormat}
              disabled={isFormatting}
              className="h-7 sm:h-8 gap-1 text-xs"
              title="Format code"
            >
              <Wand2 className={cn("h-3 w-3 sm:h-4 sm:w-4", isFormatting && "animate-spin")} />
              <span className="hidden sm:inline">Format</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 sm:h-8 w-7 sm:w-8 p-0"
                >
                  <MoreHorizontal className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 bg-popover z-50">
                <DropdownMenuItem onClick={handleDownload} className="cursor-pointer">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleFullscreen} className="cursor-pointer">
                  <Maximize2 className="h-4 w-4 mr-2" />
                  Fullscreen
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="overflow-x-auto max-h-[400px] sm:max-h-[500px] overflow-y-auto">
          <SyntaxHighlighter
            language={language || 'text'}
            style={oneDark}
            customStyle={{
              margin: 0,
              padding: '0.75rem 1rem',
              fontSize: '0.75rem',
              lineHeight: '1.5',
              background: 'hsl(var(--secondary) / 0.2)',
            }}
            codeTagProps={{
              style: {
                fontSize: 'clamp(0.7rem, 2vw, 0.875rem)',
              }
            }}
            showLineNumbers
            wrapLines
          >
            {formattedCode}
          </SyntaxHighlighter>
        </div>
      </div>
    );
  }

  // Show collapsible code for long snippets
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="rounded-lg overflow-hidden border border-border bg-secondary/30 my-2 sm:my-3">
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-secondary/50 border-b border-border">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase truncate">
            {language || "code"}
          </span>
          <Badge variant="outline" className="text-xs flex-shrink-0">
            {lineCount} lines
          </Badge>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 sm:h-8 gap-1 text-xs"
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
            className="h-7 sm:h-8 gap-1 text-xs"
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
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFormat}
            disabled={isFormatting}
            className="h-7 sm:h-8 gap-1 text-xs"
            title="Format code"
          >
            <Wand2 className={cn("h-3 w-3 sm:h-4 sm:w-4", isFormatting && "animate-spin")} />
            <span className="hidden sm:inline">Format</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 sm:h-8 w-7 sm:w-8 p-0"
              >
                <MoreHorizontal className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 bg-popover z-50">
              <DropdownMenuItem onClick={handleDownload} className="cursor-pointer">
                <Download className="h-4 w-4 mr-2" />
                Download
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleFullscreen} className="cursor-pointer">
                <Maximize2 className="h-4 w-4 mr-2" />
                Fullscreen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {!isOpen && (
        <div className="overflow-x-auto relative">
          <SyntaxHighlighter
            language={language || 'text'}
            style={oneDark}
            customStyle={{
              margin: 0,
              padding: '0.75rem 1rem',
              fontSize: '0.75rem',
              lineHeight: '1.5',
              background: 'hsl(var(--secondary) / 0.2)',
            }}
            codeTagProps={{
              style: {
                fontSize: 'clamp(0.7rem, 2vw, 0.875rem)',
              }
            }}
            showLineNumbers
          >
            {previewLines}
          </SyntaxHighlighter>
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-secondary/30 to-transparent pointer-events-none" />
        </div>
      )}
      
      <CollapsibleContent>
        <div className="overflow-x-auto max-h-[500px] sm:max-h-[600px] overflow-y-auto">
          <SyntaxHighlighter
            language={language || 'text'}
            style={oneDark}
            customStyle={{
              margin: 0,
              padding: '0.75rem 1rem',
              fontSize: '0.75rem',
              lineHeight: '1.5',
              background: 'hsl(var(--secondary) / 0.2)',
            }}
            codeTagProps={{
              style: {
                fontSize: 'clamp(0.7rem, 2vw, 0.875rem)',
              }
            }}
            showLineNumbers
            wrapLines
          >
            {formattedCode}
          </SyntaxHighlighter>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
