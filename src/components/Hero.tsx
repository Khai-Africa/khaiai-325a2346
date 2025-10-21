import { Button } from "@/components/ui/button";
import { ArrowRight, LogIn, Crown, Image } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/kai-ai-logo.png";
import SuggestionCards from "./SuggestionCards";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { SubscriptionBadge } from "./SubscriptionBadge";

interface HeroProps {
  onStartChat: () => void;
  onSuggestionSelect?: (suggestion: string) => void;
}

const Hero = ({ onStartChat, onSuggestionSelect }: HeroProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  
  const handleSuggestion = (suggestion: string) => {
    if (onSuggestionSelect) {
      onSuggestionSelect(suggestion);
    }
    onStartChat();
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Top Bar */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-3">
        {user && <SubscriptionBadge />}
        {!user ? (
          <Button
            variant="outline"
            onClick={() => navigate("/auth")}
            className="border-border hover:bg-secondary"
          >
            <LogIn className="w-4 h-4 mr-2" />
            Login
          </Button>
        ) : !isPremium && (
          <Button
            onClick={() => navigate("/premium")}
            className="bg-gradient-primary hover:opacity-90 text-white"
          >
            <Crown className="w-4 h-4 mr-2" />
            Upgrade to Premium
          </Button>
        )}
      </div>

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto text-center space-y-8 animate-fade-in">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img 
            src={logo} 
            alt="Khai AI Logo" 
            className="w-24 h-24 object-contain animate-glow"
          />
        </div>

        {/* Main heading */}
        <h1 className="text-5xl md:text-7xl font-bold bg-gradient-primary bg-clip-text text-transparent leading-tight">
          Khai AI
        </h1>
        
        <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
          What can I help with?
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
          <Button 
            size="lg" 
            onClick={onStartChat}
            className="bg-gradient-primary hover:opacity-90 text-white px-8 py-6 text-lg transition-all hover:shadow-glow group"
          >
            Start Chatting
            <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            onClick={() => navigate("/image-gen")}
            className="border-border hover:bg-secondary px-8 py-6 text-lg"
          >
            <Image className="mr-2" />
            Generate Images
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            onClick={() => navigate("/learn-more")}
            className="border-border hover:bg-secondary px-8 py-6 text-lg"
          >
            Learn More
          </Button>
          {user && !isPremium && (
            <Button 
              size="lg" 
              onClick={() => navigate("/premium")}
              className="bg-gradient-primary hover:opacity-90 text-white px-8 py-6 text-lg border-2 border-white/20"
            >
              <Crown className="mr-2" />
              Go Premium
            </Button>
          )}
        </div>

        {/* Suggestion Cards */}
        <div className="pt-12 w-full max-w-4xl mx-auto">
          <SuggestionCards onSelect={handleSuggestion} />
        </div>
      </div>
    </div>
  );
};

export default Hero;
