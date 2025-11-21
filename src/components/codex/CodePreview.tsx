import { useState, useEffect, useRef } from "react";
import { Eye, EyeOff, RefreshCw, Maximize2, Minimize2, Monitor, Tablet, Smartphone, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CodePreviewProps {
  code: string;
  language: string;
  autoRefresh?: boolean;
}

type DeviceMode = 'desktop' | 'tablet' | 'mobile';

export const CodePreview = ({ code, language, autoRefresh = true }: CodePreviewProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');
  const [previewContent, setPreviewContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [showConsole, setShowConsole] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const deviceSizes = {
    desktop: '100%',
    tablet: '768px',
    mobile: '375px',
  };

  const getDeviceWidth = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      return '100%';
    }
    return deviceSizes[deviceMode];
  };

  useEffect(() => {
    if (autoRefresh) {
      updatePreview();
    }
  }, [code, language, autoRefresh]);

  const transformReactCode = (jsxCode: string): string => {
    try {
      // Use Babel standalone to transform JSX to vanilla JS
      if (typeof window !== 'undefined' && (window as any).Babel) {
        const transformed = (window as any).Babel.transform(jsxCode, {
          presets: ['react'],
        }).code;
        return transformed;
      }
      throw new Error("Babel not loaded");
    } catch (e: any) {
      console.error('React transform error:', e);
      throw new Error(`Failed to transform React code: ${e.message}`);
    }
  };

  const updatePreview = () => {
    setError(null);
    setConsoleLogs([]);
    
    try {
      if (language === 'html' || language === 'xml') {
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
  <script>
    ${getConsoleInterceptor()}
  </script>
</body>
</html>`;
        setPreviewContent(wrappedHtml);
      } else if (language === 'javascript' || language === 'js') {
        const htmlWithJs = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 16px; font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    ${getConsoleInterceptor()}
    try {
      ${code}
    } catch (e) {
      console.error('Error: ' + e.message);
    }
  </script>
</body>
</html>`;
        setPreviewContent(htmlWithJs);
      } else if (language === 'css') {
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
  <script>
    ${getConsoleInterceptor()}
  </script>
</body>
</html>`;
        setPreviewContent(htmlWithCss);
      } else if (language === 'jsx' || language === 'tsx' || language === 'react') {
        const htmlWithReact = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    body { margin: 0; padding: 16px; font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    ${getConsoleInterceptor()}
  </script>
  <script type="text/babel">
    ${code}
    
    // Auto-render if there's a component
    const rootElement = document.getElementById('root');
    if (rootElement && typeof App !== 'undefined') {
      ReactDOM.render(<App />, rootElement);
    }
  </script>
</body>
</html>`;
        setPreviewContent(htmlWithReact);
        setShowConsole(true);
      } else if (language === 'markdown' || language === 'md') {
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

  const getConsoleInterceptor = () => {
    return `
      (function() {
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;
        
        window.addEventListener('message', function(e) {
          if (e.data.type === 'getConsoleLogs') {
            window.parent.postMessage({ type: 'consoleLogs', logs: window.__logs || [] }, '*');
          }
        });
        
        window.__logs = [];
        
        console.log = function(...args) {
          const message = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ');
          window.__logs.push({ type: 'log', message });
          window.parent.postMessage({ type: 'console', level: 'log', message }, '*');
          originalLog.apply(console, args);
        };
        
        console.error = function(...args) {
          const message = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ');
          window.__logs.push({ type: 'error', message });
          window.parent.postMessage({ type: 'console', level: 'error', message }, '*');
          originalError.apply(console, args);
        };
        
        console.warn = function(...args) {
          const message = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ');
          window.__logs.push({ type: 'warn', message });
          window.parent.postMessage({ type: 'console', level: 'warn', message }, '*');
          originalWarn.apply(console, args);
        };
        
        window.addEventListener('error', function(e) {
          const message = e.message + ' at ' + e.filename + ':' + e.lineno;
          window.__logs.push({ type: 'error', message });
          window.parent.postMessage({ type: 'console', level: 'error', message }, '*');
        });
      })();
    `;
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'console') {
        setConsoleLogs(prev => [...prev, `[${event.data.level}] ${event.data.message}`]);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

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
          {/* Device Mode Buttons */}
          <div className="flex items-center gap-0.5 mr-2">
            <Button
              variant={deviceMode === 'desktop' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setDeviceMode('desktop')}
              className="h-7 w-7"
              title="Desktop view"
            >
              <Monitor className="w-3 h-3" />
            </Button>
            <Button
              variant={deviceMode === 'tablet' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setDeviceMode('tablet')}
              className="h-7 w-7"
              title="Tablet view (768px)"
            >
              <Tablet className="w-3 h-3" />
            </Button>
            <Button
              variant={deviceMode === 'mobile' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setDeviceMode('mobile')}
              className="h-7 w-7"
              title="Mobile view (375px)"
            >
              <Smartphone className="w-3 h-3" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowConsole(!showConsole)}
            className={cn("h-7 w-7", showConsole && "bg-accent")}
            title="Toggle console"
          >
            <Terminal className="w-3 h-3" />
          </Button>
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
      <div className={cn("flex-1 flex flex-col overflow-hidden", showConsole ? "h-[60%]" : "h-full")}>
        <div className="flex-1 relative bg-white overflow-auto flex justify-center items-start">
          {error ? (
            <div className="flex items-center justify-center h-full p-4">
              <div className="text-center">
                <p className="text-sm text-destructive mb-2">Preview Error</p>
                <p className="text-xs text-muted-foreground">{error}</p>
              </div>
            </div>
          ) : previewContent ? (
            <div 
              className="h-full transition-all duration-300 ease-in-out overflow-auto"
              style={{ 
                width: getDeviceWidth(), 
                maxWidth: '100%',
                minHeight: '100%'
              }}
            >
              <iframe
                ref={iframeRef}
                srcDoc={previewContent}
                sandbox="allow-scripts allow-same-origin"
                className="w-full h-full border-0"
                title="Code Preview"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p className="text-sm">No preview available</p>
            </div>
          )}
        </div>
      </div>

      {/* Console Output */}
      {showConsole && (
        <div className="h-[40%] border-t border-border bg-secondary/20">
          <div className="flex items-center justify-between p-2 border-b border-border">
            <div className="flex items-center gap-2">
              <Terminal className="w-3 h-3" />
              <span className="text-xs font-medium">Console Output</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConsoleLogs([])}
              className="h-6 text-xs"
            >
              Clear
            </Button>
          </div>
          <ScrollArea className="h-[calc(100%-40px)] p-2">
            {consoleLogs.length === 0 ? (
              <p className="text-xs text-muted-foreground">No console output yet...</p>
            ) : (
              <div className="space-y-1">
                {consoleLogs.map((log, idx) => (
                  <div 
                    key={idx} 
                    className={cn(
                      "text-xs font-mono whitespace-pre-wrap break-all",
                      log.startsWith('[error]') && "text-destructive",
                      log.startsWith('[warn]') && "text-yellow-600",
                      log.startsWith('[log]') && "text-foreground"
                    )}
                  >
                    {log}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
};
