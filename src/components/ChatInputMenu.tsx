import { Paperclip, Search, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ChatInputMenuProps {
  onModeSelect: (mode: string) => void;
}

const ChatInputMenu = ({ onModeSelect }: ChatInputMenuProps) => {
  const handleAttach = () => {
    onModeSelect("upload");
    toast.info("File upload feature coming soon");
  };

  const handleSearch = () => {
    onModeSelect("research");
    toast.info("Switched to search mode");
  };

  const handleStudy = () => {
    onModeSelect("learn");
    toast.info("Switched to study mode");
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleAttach}
        className="h-9 rounded-full bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border"
      >
        <Paperclip className="w-4 h-4 mr-2" />
        Attach
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSearch}
        className="h-9 rounded-full bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border"
      >
        <Search className="w-4 h-4 mr-2" />
        Search
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleStudy}
        className="h-9 rounded-full bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border"
      >
        <BookOpen className="w-4 h-4 mr-2" />
        Study
      </Button>
    </div>
  );
};

export default ChatInputMenu;
