import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Sparkles, Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/useSubscription";
import { useUsage } from "@/hooks/useUsage";
import { useNavigate } from "react-router-dom";

interface ImageGeneratorProps {
  conversationId?: string | null;
}

export const ImageGenerator = ({ conversationId }: ImageGeneratorProps) => {
  const [prompt, setPrompt] = useState("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { isPremium } = useSubscription();
  const { usage, refetch: refetchUsage } = useUsage();
  const navigate = useNavigate();

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    // Check limits for free users
    if (!isPremium && usage) {
      const imageLimit = 3;
      const currentImages = usage.messageCount; // We'll track separately
      
      if (currentImages >= imageLimit) {
        toast.error("Daily image limit reached", {
          description: "Upgrade to Premium for unlimited images",
          action: {
            label: "Upgrade",
            onClick: () => navigate("/premium")
          }
        });
        return;
      }
    }

    setIsGenerating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to generate images");
        navigate("/auth");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            prompt,
            conversationId
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (data.errorCode === 'AUTH_REQUIRED') {
          toast.error('Sign up required', {
            description: 'Image generation requires a free account',
            action: {
              label: 'Sign Up',
              onClick: () => navigate('/auth')
            }
          });
        } else if (data.errorCode === 'PAYMENT_REQUIRED') {
          toast.error(data.error, {
            action: {
              label: 'Upgrade',
              onClick: () => navigate('/premium')
            }
          });
        } else if (data.errorCode === 'RATE_LIMIT') {
          toast.error(data.error);
        } else {
          toast.error(data.error || 'Failed to generate image');
        }
        return;
      }

      setGeneratedImage(data.imageUrl);
      toast.success("Image generated successfully!");
      refetchUsage();
    } catch (error) {
      console.error('Error generating image:', error);
      toast.error('Failed to generate image. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;

    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `khai-ai-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Image downloaded!");
  };

  return (
    <div className="space-y-4">
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">AI Image Generator</h3>
          {!isPremium && (
            <span className="text-xs text-muted-foreground ml-auto">
              {usage ? `${Math.max(0, 3 - (usage.messageCount || 0))} images left today` : ''}
            </span>
          )}
        </div>

        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the image you want to generate..."
          className="min-h-[100px]"
          disabled={isGenerating}
        />

        <Button
          onClick={handleGenerate}
          disabled={!prompt.trim() || isGenerating}
          className="w-full bg-gradient-primary hover:opacity-90"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Image
            </>
          )}
        </Button>

        {!isPremium && (
          <p className="text-xs text-muted-foreground text-center">
            Free users: 3 images per day.{" "}
            <button
              onClick={() => navigate("/premium")}
              className="text-primary hover:underline"
            >
              Upgrade for unlimited
            </button>
          </p>
        )}
      </Card>

      {generatedImage && (
        <Card className="p-4 space-y-4">
          <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
            <img
              src={generatedImage}
              alt="Generated"
              className="w-full h-full object-contain"
            />
          </div>
          <Button
            onClick={handleDownload}
            variant="outline"
            className="w-full"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Image
          </Button>
        </Card>
      )}
    </div>
  );
};
