import { Plus, Paperclip, Image, Lightbulb, Telescope, Globe, Pencil, Calendar, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface PlusMenuProps {
  onFilesSelect?: () => void;
  onModeSelect?: (mode: string) => void;
}

const PlusMenu = ({ onFilesSelect, onModeSelect }: PlusMenuProps) => {
  const navigate = useNavigate();

  const handleFileUpload = () => {
    onFilesSelect?.();
    toast.success("File upload activated");
  };

  const handleCreateImage = () => {
    navigate("/image-gen");
  };

  const handleThinking = () => {
    onModeSelect?.("thinking");
    toast.success("Thinking mode activated - I'll provide deeper reasoning");
  };

  const handleDeepResearch = () => {
    onModeSelect?.("deep-research");
    toast.success("Deep research mode activated - I'll conduct thorough analysis");
  };

  const handleWebSearch = () => {
    onModeSelect?.("search");
    toast.success("Web search mode activated");
  };

  const handleCanvas = () => {
    navigate("/canvas");
  };

  const handleGoogleCalendar = () => {
    navigate("/google-auth?service=calendar");
  };

  const handleGoogleDrive = () => {
    navigate("/google-auth?service=drive");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border"
        >
          <Plus className="w-5 h-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="start" 
        side="top"
        className="w-64 bg-card border-border p-2"
      >
        <DropdownMenuItem 
          onClick={handleFileUpload}
          className="cursor-pointer py-3 px-3 rounded-lg hover:bg-muted"
        >
          <Paperclip className="w-5 h-5 mr-3" />
          <span className="text-sm font-medium">Add photos & files</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={handleCreateImage}
          className="cursor-pointer py-3 px-3 rounded-lg hover:bg-muted"
        >
          <Image className="w-5 h-5 mr-3" />
          <span className="text-sm font-medium">Create image</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={handleThinking}
          className="cursor-pointer py-3 px-3 rounded-lg hover:bg-muted"
        >
          <Lightbulb className="w-5 h-5 mr-3" />
          <span className="text-sm font-medium">Thinking</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={handleDeepResearch}
          className="cursor-pointer py-3 px-3 rounded-lg hover:bg-muted"
        >
          <Telescope className="w-5 h-5 mr-3" />
          <span className="text-sm font-medium">Deep research</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={handleWebSearch}
          className="cursor-pointer py-3 px-3 rounded-lg hover:bg-muted"
        >
          <Globe className="w-5 h-5 mr-3" />
          <span className="text-sm font-medium">Web search</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={handleCanvas}
          className="cursor-pointer py-3 px-3 rounded-lg hover:bg-muted"
        >
          <Pencil className="w-5 h-5 mr-3" />
          <span className="text-sm font-medium">Canvas</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-2" />
        
        <DropdownMenuItem 
          onClick={handleGoogleCalendar}
          className="cursor-pointer py-3 px-3 rounded-lg hover:bg-muted"
        >
          <Calendar className="w-5 h-5 mr-3" />
          <span className="text-sm font-medium">Google Calendar</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={handleGoogleDrive}
          className="cursor-pointer py-3 px-3 rounded-lg hover:bg-muted"
        >
          <HardDrive className="w-5 h-5 mr-3" />
          <span className="text-sm font-medium">Google Drive</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default PlusMenu;
