import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, MessageSquare, Trash2, ArrowLeft, LogOut, User, Crown, Image } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { SubscriptionBadge } from "./SubscriptionBadge";

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
  onClose?: () => void;
}

const Sidebar = ({ onNewChat, onBack, onSelectConversation, currentConversationId, onClose }: SidebarProps) => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isPremium } = useSubscription();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
    navigate("/auth");
  };

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
    <>
      {/* Mobile overlay */}
      {onClose && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}
      
      <div className="w-64 bg-card border-r border-border flex flex-col fixed md:relative h-full z-50 md:z-auto">
      <div className="p-4 border-b border-border space-y-2">
        <Button
          onClick={onBack}
          variant="ghost"
          className="w-full justify-start"
          size="sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Chat
        </Button>
        <Button
          onClick={onNewChat}
          className="w-full bg-gradient-primary hover:opacity-90 text-white"
          size="lg"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Chat
        </Button>
        <Button
          onClick={() => navigate("/image-gen")}
          variant="outline"
          className="w-full justify-start"
          size="sm"
        >
          <Image className="w-4 h-4 mr-2" />
          Generate Images
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
                      onClick={() => {
                        onSelectConversation(conv.id);
                        onClose?.();
                      }}
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
      
      <div className="p-4 border-t border-border space-y-3">
        {/* User Info */}
        {user && (
          <div className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{user.email}</div>
              <SubscriptionBadge />
            </div>
          </div>
        )}

        {/* Upgrade Button */}
        {!isPremium && (
          <Button
            onClick={() => navigate("/premium")}
            className="w-full bg-gradient-primary hover:opacity-90 text-white"
            size="sm"
          >
            <Crown className="w-4 h-4 mr-2" />
            Upgrade to Premium
          </Button>
        )}

        {/* Logout Button */}
        <Button
          onClick={handleSignOut}
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          size="sm"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
    </>
  );
};

export default Sidebar;
