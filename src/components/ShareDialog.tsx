import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationText: string;
  conversationTitle: string;
}

const socialPlatforms = [
  {
    name: "WhatsApp",
    icon: "💬",
    getUrl: (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`,
  },
  {
    name: "Facebook",
    icon: "📘",
    getUrl: (text: string) => `https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(text)}`,
  },
  {
    name: "X (Twitter)",
    icon: "🐦",
    getUrl: (text: string) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
  },
  {
    name: "Telegram",
    icon: "✈️",
    getUrl: (text: string) => `https://t.me/share/url?text=${encodeURIComponent(text)}`,
  },
];

export const ShareDialog = ({ open, onOpenChange, conversationText, conversationTitle }: ShareDialogProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(conversationText);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy");
    }
  };

  const handleShare = (platform: typeof socialPlatforms[0]) => {
    const shareText = `${conversationTitle}\n\n${conversationText}`;
    window.open(platform.getUrl(shareText), "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Share Conversation</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto">
          <div className="bg-muted rounded-lg p-4 mb-4 max-h-64 overflow-y-auto">
            <pre className="text-sm whitespace-pre-wrap font-sans">{conversationText}</pre>
          </div>

          <div className="space-y-4">
            <div>
              <Button
                onClick={handleCopy}
                variant="outline"
                className="w-full justify-start gap-2"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {copied ? "Copied!" : "Copy to clipboard"}
              </Button>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground mb-3">Share to social media</p>
              <div className="grid grid-cols-2 gap-2">
                {socialPlatforms.map((platform) => (
                  <Button
                    key={platform.name}
                    onClick={() => handleShare(platform)}
                    variant="outline"
                    className="justify-start gap-2"
                  >
                    <span className="text-xl">{platform.icon}</span>
                    {platform.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
