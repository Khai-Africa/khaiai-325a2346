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
      <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-20 flex items-center gap-2 flex-wrap">
        <LanguageSwitch />
        {user && <SubscriptionBadge />}
        {!user ? (
          <Button
            variant="outline"
            onClick={() => navigate("/auth")}
            className="border-border hover:bg-secondary px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm"
            size="sm"
          >
            <LogIn className="w-3 h-3 sm:mr-2" />
            <span className="hidden sm:inline">{t('hero.login')}</span>
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() => navigate("/settings")}
            className="border-border hover:bg-secondary px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm"
            size="sm"
          >
            <span className="hidden sm:inline">{t('hero.account')}</span>
            <span className="sm:hidden">{t('hero.account')}</span>
          </Button>
        )}
      </div>

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto text-center space-y-6 sm:space-y-8 animate-fade-in px-4">
        {/* Logo */}
        <button 
          onClick={() => navigate("/")}
          className="flex justify-center mb-6 sm:mb-8 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <img 
            src={logo} 
            alt="Khai AI Logo" 
            className="w-10 h-10 sm:w-12 sm:h-12 object-contain"
          />
        </button>

        {/* Main heading */}
        <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold text-white leading-tight px-2">
          Khai <AITypewriter />
        </h1>
        
        <p className="text-base sm:text-xl md:text-2xl text-white max-w-2xl mx-auto px-4">
          {t('hero.subtitle')}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center pt-2 sm:pt-4 px-4">
          <Button 
            size="lg" 
            onClick={onStartChat}
            className="bg-gradient-primary hover:opacity-90 text-white px-6 py-5 sm:px-8 sm:py-6 text-base sm:text-lg transition-all hover:shadow-glow group w-full sm:w-auto"
          >
            {t('hero.startChatting')}
            <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => navigate("/learn-more")}
            className="border-border hover:bg-secondary px-4 py-2 text-sm w-full sm:w-auto"
          >
            {t('hero.learnMore')}
          </Button>
        </div>

        {/* Suggestion Cards */}
        <div className="pt-8 sm:pt-12 w-full max-w-4xl mx-auto">
          <SuggestionCards onSelect={handleSuggestion} />
        </div>
      </div>
    </div>
  );
};

export default Hero;
