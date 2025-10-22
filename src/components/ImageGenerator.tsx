import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Sparkles, Download, Loader2, Palette, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/useSubscription";
import { useUsage } from "@/hooks/useUsage";
import { useNavigate } from "react-router-dom";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface ImageGeneratorProps {
  conversationId?: string | null;
}

const imageStyles = [
  { id: "natural", name: "Natural", prompt: ", natural style, realistic, photographic quality" },
  { id: "vivid", name: "Vivid", prompt: ", vivid colors, high contrast, dramatic lighting" },
  { id: "cyberpunk", name: "Cyberpunk", prompt: ", cyberpunk style, neon lights, futuristic, digital art" },
  { id: "anime", name: "Anime", prompt: ", anime style, manga art, vibrant colors, cel shaded" },
  { id: "dramatic", name: "Dramatic Portrait", prompt: ", dramatic portrait, professional lighting, high detail" },
  { id: "coloring", name: "Coloring Book", prompt: ", coloring book style, black and white line art, simple outlines" },
  { id: "photoshoot", name: "Photo Shoot", prompt: ", professional photo shoot, studio lighting, high resolution" },
  { id: "retro", name: "Retro Cartoon", prompt: ", retro cartoon style, vintage animation, bold outlines" },
  { id: "3d", name: "3D Render", prompt: ", 3D render, Pixar style, CGI animation, detailed textures" },
  { id: "watercolor", name: "Watercolor", prompt: ", watercolor painting, soft colors, artistic brush strokes" },
  { id: "sketch", name: "Pencil Sketch", prompt: ", pencil sketch, hand drawn, artistic shading" },
  { id: "oil", name: "Oil Painting", prompt: ", oil painting, classical art style, textured brush strokes" },
];

export const ImageGenerator = ({ conversationId }: ImageGeneratorProps) => {
  const [prompt, setPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("natural");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [stylePopoverOpen, setStylePopoverOpen] = useState(false);
  const { isPremium } = useSubscription();
  const { usage, refetch: refetchUsage } = useUsage();
  const navigate = useNavigate();

  const currentStyle = imageStyles.find(s => s.id === selectedStyle) || imageStyles[0];

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
          description: "Go Premium for unlimited images",
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
        navigate("/auth?redirect=premium");
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
            prompt: prompt + currentStyle.prompt,
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

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Popover open={stylePopoverOpen} onOpenChange={setStylePopoverOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className="gap-2 h-9 px-3"
                  disabled={isGenerating}
                >
                  <Palette className="w-4 h-4" />
                  <span className="text-sm">{currentStyle.name}</span>
                  <ChevronDown className="w-3 h-3 ml-1 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[360px] p-3" align="start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 pb-2 border-b border-border">
                    <Palette className="w-4 h-4 text-primary" />
                    <h4 className="font-semibold text-sm">Image Styles</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
                    {imageStyles.map((style) => (
                      <button
                        key={style.id}
                        onClick={() => {
                          setSelectedStyle(style.id);
                          setStylePopoverOpen(false);
                        }}
                        className={`
                          relative p-3 rounded-lg border-2 text-left transition-all
                          hover:border-primary/50 hover:bg-accent/50
                          ${selectedStyle === style.id 
                            ? 'border-primary bg-accent' 
                            : 'border-border bg-card'
                          }
                        `}
                      >
                        <div className="space-y-1">
                          <div className="font-medium text-sm">{style.name}</div>
                          {selectedStyle === style.id && (
                            <Badge variant="default" className="h-5 text-xs">
                              Selected
                            </Badge>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the image you want to generate..."
            className="min-h-[100px]"
            disabled={isGenerating}
          />
        </div>

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
