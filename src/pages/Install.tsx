import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Smartphone, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/kai-ai-logo.png";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="flex justify-center">
          <img src={logo} alt="Khai AI" className="w-24 h-24" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Install Khai AI</h1>
          <p className="text-muted-foreground">
            Get the full app experience with offline access and quick launch from your home screen
          </p>
        </div>

        {isInstalled ? (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-lg p-6">
              <Check className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">App Installed!</h2>
              <p className="text-muted-foreground text-sm">
                Khai AI has been installed on your device. You can now access it from your home screen.
              </p>
            </div>
            <Button onClick={() => navigate("/")} className="w-full" size="lg">
              Open App
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-lg p-6 space-y-4">
              <div className="flex items-start gap-4 text-left">
                <Smartphone className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold mb-1">Works offline</h3>
                  <p className="text-sm text-muted-foreground">
                    Access your conversations even without an internet connection
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4 text-left">
                <Download className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold mb-1">Quick access</h3>
                  <p className="text-sm text-muted-foreground">
                    Launch directly from your home screen like a native app
                  </p>
                </div>
              </div>
            </div>

            {deferredPrompt ? (
              <Button onClick={handleInstall} className="w-full bg-gradient-primary" size="lg">
                <Download className="w-5 h-5 mr-2" />
                Install App
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="bg-card border border-border rounded-lg p-4 text-left text-sm">
                  <h3 className="font-semibold mb-2">Manual Installation:</h3>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex gap-2">
                      <span className="font-semibold">iOS:</span>
                      <span>Tap Share → Add to Home Screen</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-semibold">Android:</span>
                      <span>Tap Menu → Install App</span>
                    </li>
                  </ul>
                </div>
                <Button onClick={() => navigate("/")} variant="outline" className="w-full" size="lg">
                  Continue in Browser
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Install;
