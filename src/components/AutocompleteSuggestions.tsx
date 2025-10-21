import { Card } from "@/components/ui/card";

interface AutocompleteSuggestionsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
}

const AutocompleteSuggestions = ({
  suggestions,
  onSelect,
}: AutocompleteSuggestionsProps) => {
  if (suggestions.length === 0) return null;

  return (
    <Card className="absolute bottom-full left-0 right-0 mb-2 p-2 space-y-1">
      {suggestions.map((suggestion, idx) => (
        <button
          key={idx}
          onClick={() => onSelect(suggestion)}
          className="w-full text-left px-3 py-2 rounded-lg hover:bg-secondary text-sm transition-colors"
        >
          {suggestion}
        </button>
      ))}
    </Card>
  );
};

export default AutocompleteSuggestions;
