import { Button } from "@/components/ui/button";
import { Code, BookOpen, Lightbulb, Globe2, Search, MessageSquare, Sparkles } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface SuggestionCardsProps {
  onSelect: (suggestion: string) => void;
}

const SuggestionCards = ({ onSelect }: SuggestionCardsProps) => {
  const { t } = useTranslation();
  
  const suggestions = [
    {
      icon: BookOpen,
      title: t('suggestions.learnCulture'),
      color: "text-blue-400",
    },
    {
      icon: Search,
      title: t('suggestions.searchKhai'),
      color: "text-green-400",
    },
    {
      icon: MessageSquare,
      title: t('suggestions.talkKhai'),
      color: "text-purple-400",
    },
    {
      icon: Lightbulb,
      title: t('suggestions.getIdeas'),
      color: "text-yellow-400",
    },
    {
      icon: Code,
      title: t('suggestions.writeCode'),
      color: "text-orange-400",
    },
    {
      icon: Globe2,
      title: t('suggestions.translateLanguages'),
      color: "text-pink-400",
    },
    {
      icon: Sparkles,
      title: t('suggestions.more'),
      color: "text-cyan-400",
    },
  ];

  return (
    <div className="flex flex-wrap gap-3 justify-center items-center">
      {suggestions.map((suggestion, index) => {
        const Icon = suggestion.icon;
        return (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => onSelect(suggestion.title)}
            className="group rounded-full border-border hover:bg-card/50 transition-all"
          >
            <Icon className={`w-3 h-3 mr-2 ${suggestion.color} group-hover:scale-110 transition-transform`} />
            <span className="text-sm">{suggestion.title}</span>
          </Button>
        );
      })}
    </div>
  );
};

export default SuggestionCards;
