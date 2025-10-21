import { Paperclip, Search, BookOpen, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface ChatInputMenuProps {
  onModeSelect: (mode: string) => void;
}

const ChatInputMenu = ({ onModeSelect }: ChatInputMenuProps) => {
  const navigate = useNavigate();

  const handleAttach = () => {
    onModeSelect("chat");
    toast.info("File upload feature coming soon");
  };

  const handleSearch = () => {
    onModeSelect("search");
    toast.info("Switched to search mode");
  };

  const handleStudy = () => {
    onModeSelect("study");
    toast.info("Switched to study mode");
  };

  const handleImageGen = () => {
    navigate("/image-gen");
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
        onClick={handleImageGen}
        className="h-9 rounded-full bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border"
      >
        <Image className="w-4 h-4 mr-2" />
        Generate Image
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
