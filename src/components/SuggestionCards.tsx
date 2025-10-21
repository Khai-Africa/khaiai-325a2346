import { Card } from "@/components/ui/card";
import { Code, BookOpen, Lightbulb, Globe2 } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

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
    <Carousel
      opts={{
        align: "start",
        loop: true,
      }}
      className="w-full max-w-3xl mx-auto"
    >
      <CarouselContent>
        {suggestions.map((suggestion, index) => {
          const Icon = suggestion.icon;
          return (
            <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
              <Card
                onClick={() => onSelect(suggestion.description)}
                className="p-6 bg-card/50 backdrop-blur border border-border hover:bg-card hover:shadow-card cursor-pointer transition-all hover:scale-105 group h-full"
              >
                <Icon className={`w-6 h-6 mb-3 ${suggestion.color} group-hover:scale-110 transition-transform`} />
                <h4 className="font-semibold text-base mb-2">{suggestion.title}</h4>
                <p className="text-sm text-muted-foreground">{suggestion.description}</p>
              </Card>
            </CarouselItem>
          );
        })}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
};

export default SuggestionCards;
