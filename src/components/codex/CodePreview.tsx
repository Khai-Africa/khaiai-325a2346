import { useState, useEffect, useRef } from "react";
import { Eye, EyeOff, RefreshCw, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CodePreviewProps {
  code: string;
  language: string;
  autoRefresh?: boolean;
}

export const CodePreview = ({ code, language, autoRefresh = true }: CodePreviewProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (autoRefresh) {
      updatePreview();
    }
  }, [code, language, autoRefresh]);

  const updatePreview = () => {
    setError(null);
    
    try {
      if (language === 'html' || language === 'xml') {
        // Handle HTML preview
        const wrappedHtml = code.includes('<!DOCTYPE') || code.includes('<html') 
          ? code 
          : `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 16px; font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body>
  ${code}
</body>
</html>`;
        setPreviewContent(wrappedHtml);
      } else if (language === 'javascript' || language === 'js') {
        // Handle JavaScript preview
        const htmlWithJs = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 16px; font-family: system-ui, -apple-system, sans-serif; }
    #output { white-space: pre-wrap; font-family: monospace; }
  </style>
</head>
<body>
  <div id="output"></div>
  <script>
    const output = document.getElementById('output');
    const log = (...args) => {
      output.textContent += args.join(' ') + '\\n';
    };
    console.log = log;
    console.error = log;
    
    try {
      ${code}
    } catch (e) {
      output.textContent += 'Error: ' + e.message;
    }
  </script>
</body>
</html>`;
        setPreviewContent(htmlWithJs);
      } else if (language === 'css') {
        // Handle CSS preview
        const htmlWithCss = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    ${code}
  </style>
</head>
<body>
  <h1>Heading 1</h1>
  <h2>Heading 2</h2>
  <p>This is a paragraph to preview your CSS styles.</p>
  <button>Button</button>
  <div class="container">
    <div class="box">Box 1</div>
    <div class="box">Box 2</div>
  </div>
</body>
</html>`;
        setPreviewContent(htmlWithCss);
      } else if (language === 'jsx' || language === 'tsx' || language === 'react') {
        setError("React preview not yet supported. Use HTML/JS/CSS for now.");
      } else if (language === 'markdown' || language === 'md') {
        // Basic markdown preview
        const html = code
          .replace(/^### (.*$)/gim, '<h3>$1</h3>')
          .replace(/^## (.*$)/gim, '<h2>$1</h2>')
          .replace(/^# (.*$)/gim, '<h1>$1</h1>')
          .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
          .replace(/\*(.*)\*/gim, '<em>$1</em>')
          .replace(/\n/g, '<br>');
        
        setPreviewContent(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { padding: 16px; font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body>${html}</body>
</html>`);
      } else {
        setError(`Preview not available for ${language} files`);
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (!isVisible) {
    return (
      <div className="flex items-center justify-center h-full border border-border rounded-lg bg-secondary/20">
        <Button variant="outline" onClick={() => setIsVisible(true)}>
          <Eye className="w-4 h-4 mr-2" />
          Show Preview
        </Button>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex flex-col h-full border border-border rounded-lg bg-background overflow-hidden",
      isFullscreen && "fixed inset-0 z-50"
    )}>
      {/* Preview Toolbar */}
      <div className="flex items-center justify-between p-2 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs font-medium text-muted-foreground">
            Live Preview {language && `(${language})`}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={updatePreview}
            className="h-7 w-7"
            title="Refresh preview"
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="h-7 w-7"
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="w-3 h-3" />
            ) : (
              <Maximize2 className="w-3 h-3" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(false)}
            className="h-7 w-7"
            title="Hide preview"
          >
            <EyeOff className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 relative bg-white overflow-auto">
        {error ? (
          <div className="flex items-center justify-center h-full p-4">
            <div className="text-center">
              <p className="text-sm text-destructive mb-2">Preview Error</p>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
          </div>
        ) : previewContent ? (
          <iframe
            ref={iframeRef}
            srcDoc={previewContent}
            sandbox="allow-scripts allow-same-origin"
            className="w-full h-full border-0"
            title="Code Preview"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p className="text-sm">No preview available</p>
          </div>
        )}
      </div>
    </div>
  );
};
