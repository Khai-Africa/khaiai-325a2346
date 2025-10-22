import { Plus, Paperclip, Image, Lightbulb, Telescope, Globe, Pencil, Calendar, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
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
  activeMode?: string;
  hasFiles?: boolean;
}

const PlusMenu = ({ onFilesSelect, onModeSelect, activeMode = "chat", hasFiles = false }: PlusMenuProps) => {
  const navigate = useNavigate();

  // Map modes to their corresponding icons
  const getActiveIcon = () => {
    if (hasFiles) return Paperclip;
    
    const iconMap: Record<string, typeof Plus> = {
      'thinking': Lightbulb,
      'deep-research': Telescope,
      'search': Globe,
    };
    
    return iconMap[activeMode] || Plus;
  };

  const ActiveIcon = getActiveIcon();

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

  const handleGoogleCalendar = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in first");
        return;
      }

      const { data, error } = await supabase.functions.invoke("google-oauth", {
        body: { action: "initiate", service: "calendar" },
      });

      if (error) throw error;
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error("Calendar auth error:", error);
      toast.error("Failed to connect Google Calendar");
    }
  };

  const handleGoogleDrive = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in first");
        return;
      }

      const { data, error } = await supabase.functions.invoke("google-oauth", {
        body: { action: "initiate", service: "drive" },
      });

      if (error) throw error;
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error("Drive auth error:", error);
      toast.error("Failed to connect Google Drive");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border"
        >
          <ActiveIcon className="w-5 h-5" />
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
