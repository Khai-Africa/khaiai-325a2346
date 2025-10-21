import { Button } from "@/components/ui/button";
import { Code, BookOpen, Lightbulb, Globe2, Search, MessageSquare, Sparkles } from "lucide-react";

const suggestions = [
  {
    icon: BookOpen,
    title: "Learn about African culture",
    color: "text-blue-400",
  },
  {
    icon: Search,
    title: "Search with Khai AI",
    color: "text-green-400",
  },
  {
    icon: MessageSquare,
    title: "Talk with Khai AI",
    color: "text-purple-400",
  },
  {
    icon: Lightbulb,
    title: "Get creative ideas",
    color: "text-yellow-400",
  },
  {
    icon: Code,
    title: "Write code",
    color: "text-orange-400",
  },
  {
    icon: Globe2,
    title: "Translate languages",
    color: "text-pink-400",
  },
  {
    icon: Sparkles,
    title: "More",
    color: "text-cyan-400",
  },
];

interface SuggestionCardsProps {
  onSelect: (suggestion: string) => void;
}

const SuggestionCards = ({ onSelect }: SuggestionCardsProps) => {
  return (
    <div className="flex flex-wrap gap-3 justify-center items-center">
      {suggestions.map((suggestion, index) => {
        const Icon = suggestion.icon;
        return (
          <Button
            key={index}
            variant="outline"
            onClick={() => onSelect(suggestion.title)}
            className="group rounded-full px-6 py-5 h-auto border-border hover:bg-card/50 transition-all"
          >
            <Icon className={`w-4 h-4 mr-2 ${suggestion.color} group-hover:scale-110 transition-transform`} />
            <span className="text-sm">{suggestion.title}</span>
          </Button>
        );
      })}
    </div>
  );
};

export default SuggestionCards;
