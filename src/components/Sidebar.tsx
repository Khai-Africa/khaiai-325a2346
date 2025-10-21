import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, MessageSquare, Trash2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

interface SidebarProps {
  onNewChat: () => void;
  onBack: () => void;
  onSelectConversation: (conversationId: string) => void;
  currentConversationId?: string | null;
}

const Sidebar = ({ onNewChat, onBack, onSelectConversation, currentConversationId }: SidebarProps) => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
    
    // Subscribe to conversation changes
    const channel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadConversations = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("user_id", session.session.user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const { error } = await supabase
        .from("conversations")
        .delete()
        .eq("id", conversationId);

      if (error) throw error;
      toast.success("Conversation deleted");
      
      if (currentConversationId === conversationId) {
        onNewChat();
      }
    } catch (error) {
      console.error("Error deleting conversation:", error);
      toast.error("Failed to delete conversation");
    }
  };

  const groupConversations = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups: Record<string, Conversation[]> = {
      TODAY: [],
      YESTERDAY: [],
      OLDER: [],
    };

    conversations.forEach((conv) => {
      const convDate = new Date(conv.updated_at);
      const convDay = new Date(convDate.getFullYear(), convDate.getMonth(), convDate.getDate());

      if (convDay.getTime() === today.getTime()) {
        groups.TODAY.push(conv);
      } else if (convDay.getTime() === yesterday.getTime()) {
        groups.YESTERDAY.push(conv);
      } else {
        groups.OLDER.push(conv);
      }
    });

    return groups;
  };

  const conversationGroups = groupConversations();

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
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-8">
            No conversations yet
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(conversationGroups).map(([group, convs]) => {
              if (convs.length === 0) return null;
              
              return (
                <div key={group} className="space-y-2">
                  <div className="text-xs text-muted-foreground px-2 py-1 font-semibold">
                    {group}
                  </div>
                  {convs.map((conv) => (
                    <Button
                      key={conv.id}
                      variant="ghost"
                      className={`w-full justify-start text-sm hover:bg-secondary group ${
                        currentConversationId === conv.id ? "bg-secondary" : ""
                      }`}
                      onClick={() => onSelectConversation(conv.id)}
                    >
                      <MessageSquare className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span className="flex-1 truncate text-left">{conv.title}</span>
                      <Trash2
                        className="w-3 h-3 opacity-0 group-hover:opacity-50 hover:opacity-100 flex-shrink-0"
                        onClick={(e) => handleDelete(conv.id, e)}
                      />
                    </Button>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
      
      <div className="p-4 border-t border-border">
        <div className="text-xs text-muted-foreground text-center">
          Free Plan • 10 messages/day
        </div>
        <Button
          onClick={() => navigate("/premium")}
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
