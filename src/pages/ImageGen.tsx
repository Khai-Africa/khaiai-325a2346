import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ImageGenerator } from "@/components/ImageGenerator";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface GeneratedImage {
  id: string;
  prompt: string;
  image_data: string;
  created_at: string;
}

const ImageGen = () => {
  const navigate = useNavigate();
  const [recentImages, setRecentImages] = useState<GeneratedImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentImages();
  }, []);

  const fetchRecentImages = async () => {
    try {
      const { data, error } = await supabase
        .from("generated_images")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(6);

      if (error) throw error;
      setRecentImages(data || []);
    } catch (error) {
      console.error("Error fetching images:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <Button
            onClick={() => navigate("/?chat=true")}
            variant="ghost"
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">AI Image Generation</span>
            </div>
            <h1 className="text-4xl font-bold mb-3">
              Create Stunning Images with{" "}
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                AI
              </span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Transform your ideas into beautiful images instantly
            </p>
          </div>

          {/* Image Generator */}
          <div className="mb-12">
            <ImageGenerator />
          </div>

          {/* Recent Images */}
          {recentImages.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Your Recent Creations</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentImages.map((image) => (
                  <Card key={image.id} className="p-4 space-y-3">
                    <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                      <img
                        src={image.image_data}
                        alt={image.prompt}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {image.prompt}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(image.created_at).toLocaleDateString()}
                    </p>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageGen;
