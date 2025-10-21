import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, MessageSquare, Trash2, ArrowLeft } from "lucide-react";

interface SidebarProps {
  onNewChat: () => void;
  onBack: () => void;
}

const Sidebar = ({ onNewChat, onBack }: SidebarProps) => {
  return (
    <div className="w-64 bg-card border-r border-border flex flex-col">
      <div className="p-4 border-b border-border space-y-2">
        <Button
          onClick={onBack}
          variant="ghost"
          className="w-full justify-start"
          size="sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>
        <Button
          onClick={onNewChat}
          className="w-full bg-gradient-primary hover:opacity-90 text-white"
          size="lg"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Chat
        </Button>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground px-2 py-1 font-semibold">
            TODAY
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-sm hover:bg-secondary group"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            <span className="flex-1 truncate text-left">Getting started with AI</span>
            <Trash2 className="w-3 h-3 opacity-0 group-hover:opacity-50 hover:opacity-100" />
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-sm hover:bg-secondary group"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            <span className="flex-1 truncate text-left">Learn about Africa</span>
            <Trash2 className="w-3 h-3 opacity-0 group-hover:opacity-50 hover:opacity-100" />
          </Button>
          
          <div className="text-xs text-muted-foreground px-2 py-1 mt-4 font-semibold">
            YESTERDAY
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-sm hover:bg-secondary group"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            <span className="flex-1 truncate text-left">Code examples</span>
            <Trash2 className="w-3 h-3 opacity-0 group-hover:opacity-50 hover:opacity-100" />
          </Button>
        </div>
      </ScrollArea>
      
      <div className="p-4 border-t border-border">
        <div className="text-xs text-muted-foreground text-center">
          Free Plan • 10 messages left
        </div>
        <Button
          variant="outline"
          className="w-full mt-2"
          size="sm"
        >
          Upgrade to Premium
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
