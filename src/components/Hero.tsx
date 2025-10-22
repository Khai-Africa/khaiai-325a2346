import { Button } from "@/components/ui/button";
import { ArrowRight, LogIn, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/kai-ai-logo.png";
import SuggestionCards from "./SuggestionCards";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { SubscriptionBadge } from "./SubscriptionBadge";
import { useTranslation } from "@/hooks/useTranslation";
import { LanguageSwitch } from "./LanguageSwitch";
import { AITypewriter } from "./AITypewriter";

interface HeroProps {
  onStartChat: () => void;
  onSuggestionSelect?: (suggestion: string) => void;
}

const Hero = ({ onStartChat, onSuggestionSelect }: HeroProps) => {
  const { t } = useTranslation();
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
        <LanguageSwitch />
        {user && <SubscriptionBadge />}
        {!user ? (
          <Button
            variant="outline"
            onClick={() => navigate("/auth")}
            className="border-border hover:bg-secondary px-4 py-2 text-sm"
            size="sm"
          >
            <LogIn className="w-3 h-3 mr-2" />
            {t('hero.login')}
          </Button>
        ) : !isPremium && (
          <Button
            onClick={() => navigate("/premium")}
            className="bg-gradient-primary hover:opacity-90 text-white px-4 py-2 text-sm"
            size="sm"
          >
            <Crown className="w-3 h-3 mr-2" />
            {t('hero.upgradeToPremium')}
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
        <button 
          onClick={() => navigate("/")}
          className="flex justify-center mb-8 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <img 
            src={logo} 
            alt="Khai AI Logo" 
            className="w-12 h-12 object-contain"
          />
        </button>

        {/* Main heading */}
        <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight">
          Khai <AITypewriter />
        </h1>
        
        <p className="text-xl md:text-2xl text-white max-w-2xl mx-auto">
          {t('hero.subtitle')}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
          <Button 
            size="lg" 
            onClick={onStartChat}
            className="bg-gradient-primary hover:opacity-90 text-white px-8 py-6 text-lg transition-all hover:shadow-glow group"
          >
            {t('hero.startChatting')}
            <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => navigate("/learn-more")}
            className="border-border hover:bg-secondary px-4 py-2 text-sm"
          >
            {t('hero.learnMore')}
          </Button>
          {user && !isPremium && (
            <Button 
              size="sm" 
              onClick={() => navigate("/premium")}
              className="bg-gradient-primary hover:opacity-90 text-white px-4 py-2 text-sm border border-white/20"
            >
              <Crown className="mr-2 w-3 h-3" />
              {t('hero.goPremium')}
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
