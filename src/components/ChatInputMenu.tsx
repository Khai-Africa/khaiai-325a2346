import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Plus,
  Paperclip,
  ImagePlus,
  Lightbulb,
  Search,
  BookOpen,
  MoreHorizontal,
  Globe,
  PenTool,
  ChevronRight,
} from "lucide-react";

interface ChatInputMenuProps {
  onModeSelect: (mode: string) => void;
}

const ChatInputMenu = ({ onModeSelect }: ChatInputMenuProps) => {
  const [open, setOpen] = useState(false);

  const modes = [
    {
      id: "upload",
      icon: Paperclip,
      label: "Add photos & files",
      description: "Upload images or documents",
    },
    {
      id: "image",
      icon: ImagePlus,
      label: "Create image",
      description: "Generate images with AI",
    },
    {
      id: "thinking",
      icon: Lightbulb,
      label: "Thinking",
      description: "Deep reasoning mode",
    },
    {
      id: "research",
      icon: Search,
      label: "Deep research",
      description: "Comprehensive analysis",
    },
    {
      id: "learn",
      icon: BookOpen,
      label: "Study and learn",
      description: "Educational assistance",
    },
  ];

  const additionalModes = [
    {
      id: "web-search",
      icon: Globe,
      label: "Web search",
      description: "Search the internet",
    },
    {
      id: "canvas",
      icon: PenTool,
      label: "Canvas",
      description: "Creative workspace",
    },
  ];

  const handleSelect = (modeId: string) => {
    onModeSelect(modeId);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full h-10 w-10"
        >
          <Plus className="w-5 h-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-2"
        align="start"
        side="top"
      >
        <div className="space-y-1">
          {modes.map((mode) => (
            <Button
              key={mode.id}
              variant="ghost"
              className="w-full justify-start h-auto py-3 px-3"
              onClick={() => handleSelect(mode.id)}
            >
              <mode.icon className="w-5 h-5 mr-3 flex-shrink-0" />
              <div className="flex-1 text-left">
                <div className="font-medium">{mode.label}</div>
                <div className="text-xs text-muted-foreground">
                  {mode.description}
                </div>
              </div>
            </Button>
          ))}

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between h-auto py-3 px-3"
              >
                <div className="flex items-center">
                  <MoreHorizontal className="w-5 h-5 mr-3" />
                  <span className="font-medium">More</span>
                </div>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-2" side="right" align="start">
              <div className="space-y-1">
                {additionalModes.map((mode) => (
                  <Button
                    key={mode.id}
                    variant="ghost"
                    className="w-full justify-start h-auto py-3 px-3"
                    onClick={() => handleSelect(mode.id)}
                  >
                    <mode.icon className="w-5 h-5 mr-3 flex-shrink-0" />
                    <div className="flex-1 text-left">
                      <div className="font-medium">{mode.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {mode.description}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ChatInputMenu;
