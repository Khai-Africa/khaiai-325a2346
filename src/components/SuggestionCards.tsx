import { Card } from "@/components/ui/card";
import { Code, BookOpen, Lightbulb, Globe2 } from "lucide-react";

const suggestions = [
  {
    icon: Code,
    title: "Write code",
    description: "Help me build a web application",
    color: "text-blue-400",
  },
  {
    icon: BookOpen,
    title: "Learn something new",
    description: "Teach me about African history",
    color: "text-green-400",
  },
  {
    icon: Lightbulb,
    title: "Get creative",
    description: "Help me brainstorm business ideas",
    color: "text-yellow-400",
  },
  {
    icon: Globe2,
    title: "Translate",
    description: "Translate English to French",
    color: "text-purple-400",
  },
];

interface SuggestionCardsProps {
  onSelect: (suggestion: string) => void;
}

const SuggestionCards = ({ onSelect }: SuggestionCardsProps) => {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto px-4 mb-8">
      {suggestions.map((suggestion, index) => {
        const Icon = suggestion.icon;
        return (
          <Card
            key={index}
            onClick={() => onSelect(suggestion.description)}
            className="p-4 bg-card/50 backdrop-blur border border-border hover:bg-card hover:shadow-card cursor-pointer transition-all hover:scale-105 group"
          >
            <Icon className={`w-6 h-6 mb-3 ${suggestion.color} group-hover:scale-110 transition-transform`} />
            <h4 className="font-semibold mb-1">{suggestion.title}</h4>
            <p className="text-sm text-muted-foreground">{suggestion.description}</p>
          </Card>
        );
      })}
    </div>
  );
};

export default SuggestionCards;
