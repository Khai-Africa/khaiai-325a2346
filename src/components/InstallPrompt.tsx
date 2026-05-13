import { useState, useEffect } from "react";
import { X, Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Check if user has dismissed the prompt
      const dismissedData = localStorage.getItem("installPromptDismissed");
      let shouldShow = true;
      
      if (dismissedData) {
        try {
          const { timestamp } = JSON.parse(dismissedData);
          const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
          const timeSinceDismissed = Date.now() - timestamp;
          
          // Show again after 7 days
          if (timeSinceDismissed < sevenDaysInMs) {
            shouldShow = false;
          }
        } catch {
          // If parsing fails, show the prompt
          shouldShow = true;
        }
      }
      
      if (shouldShow) {
        // Show immediately on mobile for better UX, delayed on desktop
        const delay = isMobile ? 3000 : 5000;
        setTimeout(() => setShowPrompt(true), delay);
      }
    };

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      return;
    }

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, [isMobile]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("installPromptDismissed", JSON.stringify({
      timestamp: Date.now()
    }));
  };

  if (!showPrompt || !deferredPrompt) return null;

  return (
    <Card className="fixed bottom-4 right-4 p-4 max-w-sm shadow-lg z-50 animate-in slide-in-from-bottom-5 border-primary/20">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
      >
        <X className="w-4 h-4" />
      </button>
      
      <div className="flex items-start gap-3">
        <div className="bg-gradient-primary rounded-lg p-2 flex-shrink-0">
          {isMobile ? (
            <Smartphone className="w-6 h-6 text-white" />
          ) : (
            <Download className="w-6 h-6 text-white" />
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold mb-1">Install Kmer AI</h3>
          <p className="text-sm text-muted-foreground mb-3">
            {isMobile 
              ? "Add to your home screen for quick access and offline use"
              : "Get the app experience with offline access and faster loading"
            }
          </p>
          <div className="flex gap-2">
            <Button onClick={handleInstall} size="sm" className="bg-gradient-primary">
              Install
            </Button>
            <Button onClick={handleDismiss} variant="outline" size="sm">
              Not now
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
