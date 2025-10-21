import { Button } from "@/components/ui/button";
import { ArrowRight, MessageSquare, Zap, Globe } from "lucide-react";
import logo from "@/assets/kai-ai-logo.png";
import SuggestionCards from "./SuggestionCards";

interface HeroProps {
  onStartChat: () => void;
  onSuggestionSelect?: (suggestion: string) => void;
}

const Hero = ({ onStartChat, onSuggestionSelect }: HeroProps) => {
  const handleSuggestion = (suggestion: string) => {
    if (onSuggestionSelect) {
      onSuggestionSelect(suggestion);
    }
    onStartChat();
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col items-center justify-center px-4 relative overflow-hidden">
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
            alt="AfriChat AI Logo" 
            className="w-24 h-24 object-contain animate-glow"
          />
        </div>

        {/* Main heading */}
        <h1 className="text-5xl md:text-7xl font-bold bg-gradient-primary bg-clip-text text-transparent leading-tight">
          AfriChat AI
        </h1>
        
        <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
          Your intelligent AI assistant, designed for Africa. Chat, learn, and create with the power of advanced AI.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
          <Button 
            size="lg" 
            onClick={onStartChat}
            className="bg-gradient-primary hover:opacity-90 text-white px-8 py-6 text-lg rounded-full transition-all hover:shadow-glow group"
          >
            Start Chatting
            <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            className="border-border hover:bg-secondary px-8 py-6 text-lg rounded-full"
          >
            Learn More
          </Button>
        </div>

        {/* Suggestion Cards */}
        <div className="pt-12">
          <p className="text-sm text-muted-foreground mb-6">Try asking about:</p>
          <SuggestionCards onSelect={handleSuggestion} />
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 pt-16 max-w-4xl mx-auto">
          <div className="bg-card border border-border rounded-2xl p-6 hover:shadow-card transition-all hover:scale-105">
            <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
              <MessageSquare className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Smart Conversations</h3>
            <p className="text-muted-foreground">
              Natural, intelligent responses to all your questions
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 hover:shadow-card transition-all hover:scale-105">
            <div className="bg-accent/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Lightning Fast</h3>
            <p className="text-muted-foreground">
              Get instant responses with our optimized infrastructure
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 hover:shadow-card transition-all hover:scale-105">
            <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
              <Globe className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Built for Africa</h3>
            <p className="text-muted-foreground">
              Support for African languages and local payment methods
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
