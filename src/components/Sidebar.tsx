import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Plus, MessageSquare, Trash2, ArrowLeft, LogOut, User, Crown, Image, Settings, HelpCircle, BarChart3, BookOpen, Shield, FileText, ChevronDown, Code2, Download, Upload, Search, X, Pencil, Check } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { SubscriptionBadge } from "./SubscriptionBadge";
import { useTranslation } from "@/hooks/useTranslation";
import { NotificationBell } from "./NotificationBell";
import { ConversationThumbnail } from "./ConversationThumbnail";
import { useAnonymousConversations, StoredConversation } from "@/hooks/useAnonymousConversations";
import { MigrationDialog } from "./MigrationDialog";

interface UploadedFile {
  id: string;
  file_name: string;
  file_type: string;
  metadata: {
    thumbnail?: string;
    isImage?: boolean;
  } | null;
}

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
  uploaded_files?: UploadedFile[];
}

interface SidebarProps {
  onNewChat: () => void;
  onBack: () => void;
  onSelectConversation: (conversationId: string) => void;
  currentConversationId?: string | null;
  onClose?: () => void;
}

const Sidebar = ({ onNewChat, onBack, onSelectConversation, currentConversationId, onClose }: SidebarProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isPremium } = useSubscription();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMigrationDialog, setShowMigrationDialog] = useState(false);
  const [pendingMigration, setPendingMigration] = useState<StoredConversation[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const isAnonymous = !user;
  
  const { 
    conversations: anonymousConversations, 
    deleteConversation: deleteAnonymousConversation,
    exportConversations,
    importConversations,
    clearAll: clearAnonymousConversations,
    saveConversation: saveAnonymousConversation,
    loadConversation: loadAnonymousConversation,
  } = useAnonymousConversations();

  // Focus edit input when editing starts
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  // Check for pending anonymous conversations when user logs in
  useEffect(() => {
    if (user) {
      const stored = localStorage.getItem('kmer_anonymous_conversations');
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as StoredConversation[];
          if (parsed.length > 0) {
            setPendingMigration(parsed);
            setShowMigrationDialog(true);
          }
        } catch (error) {
          console.error('Failed to parse anonymous conversations:', error);
        }
      }
    }
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    toast.success(t('chat.signedOut'));
    navigate("/auth");
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importConversations(file);
      e.target.value = ''; // Reset input
    }
  };

  const handleDeleteAnonymous = (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteAnonymousConversation(conversationId);
    toast.success(t('chat.conversationDeleted'));
    if (currentConversationId === conversationId) {
      onNewChat();
    }
  };

  useEffect(() => {
    if (!isAnonymous) {
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
    } else {
      setLoading(false);
    }
  }, [isAnonymous]);

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
        .select(`
          *,
          uploaded_files (
            id,
            file_name,
            file_type,
            metadata,
            created_at
          )
        `)
        .eq("user_id", session.session.user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setConversations((data || []) as Conversation[]);
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
      toast.success(t('chat.conversationDeleted'));
      
      if (currentConversationId === conversationId) {
        onNewChat();
      }
    } catch (error) {
      console.error("Error deleting conversation:", error);
      toast.error(t('chat.deleteConversationFailed'));
    }
  };

  const handleRename = async (conversationId: string) => {
    if (!editingTitle.trim()) {
      setEditingId(null);
      return;
    }

    try {
      const { error } = await supabase
        .from("conversations")
        .update({ title: editingTitle.trim() })
        .eq("id", conversationId);

      if (error) throw error;
      toast.success("Conversation renamed");
      loadConversations();
    } catch (error) {
      console.error("Error renaming conversation:", error);
      toast.error("Failed to rename conversation");
    } finally {
      setEditingId(null);
    }
  };

  const handleRenameAnonymous = (conversationId: string) => {
    if (!editingTitle.trim()) {
      setEditingId(null);
      return;
    }

    const conv = loadAnonymousConversation(conversationId);
    if (conv) {
      saveAnonymousConversation(conversationId, conv.messages, editingTitle.trim());
      toast.success("Conversation renamed");
    }
    setEditingId(null);
  };

  const startEditing = (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(id);
    setEditingTitle(title);
  };

  const handleKeyDown = (e: React.KeyboardEvent, conversationId: string, isAnon: boolean) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isAnon) {
        handleRenameAnonymous(conversationId);
      } else {
        handleRename(conversationId);
      }
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  // Filter conversations by search query
  const filterConversations = (convs: Conversation[]) => {
    if (!searchQuery.trim()) return convs;
    const query = searchQuery.toLowerCase();
    return convs.filter(conv => conv.title.toLowerCase().includes(query));
  };

  const filterAnonymousConversations = (convs: StoredConversation[]) => {
    if (!searchQuery.trim()) return convs;
    const query = searchQuery.toLowerCase();
    return convs.filter(conv => 
      conv.title.toLowerCase().includes(query) ||
      conv.messages.some(msg => {
        const content = typeof msg.content === 'string' 
          ? msg.content 
          : msg.content.find(p => p.type === 'text')?.text || '';
        return content.toLowerCase().includes(query);
      })
    );
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

    const filtered = filterConversations(conversations);
    filtered.forEach((conv) => {
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

  const groupAnonymousConversations = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups: Record<string, StoredConversation[]> = {
      TODAY: [],
      YESTERDAY: [],
      OLDER: [],
    };

    const filtered = filterAnonymousConversations(anonymousConversations);
    filtered.forEach((conv) => {
      const convDate = new Date(conv.updatedAt);
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
  const anonymousGroups = groupAnonymousConversations();

  const handleMigrationComplete = () => {
    setPendingMigration([]);
    loadConversations();
  };

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
        <div className="flex items-center gap-2">
          <Button
            onClick={() => navigate(-1)}
            variant="ghost"
            className="flex-1 justify-start"
            size="sm"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <NotificationBell />
        </div>
        <Button
          onClick={onNewChat}
          className="w-full bg-gradient-primary hover:opacity-90 text-white"
          size="lg"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t('sidebar.newChat')}
        </Button>
        <Button
          onClick={() => navigate("/image-gen")}
          variant="outline"
          className="w-full justify-start"
          size="sm"
        >
          <Image className="w-4 h-4 mr-2" />
          {t('sidebar.generateImages')}
        </Button>
        <Button
          onClick={() => navigate("/codex")}
          variant="outline"
          className="w-full justify-start"
          size="sm"
        >
          <Code2 className="w-4 h-4 mr-2" />
          Vibe Coding
        </Button>
      </div>
      {/* Search Input */}
      <div className="px-4 pt-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-8 h-8 text-sm"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-8 w-8 p-0"
              onClick={() => setSearchQuery("")}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : isAnonymous ? (
          // Anonymous user conversations from localStorage
          anonymousConversations.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8">
              {t('sidebar.noConversations')}
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(anonymousGroups).map(([group, convs]) => {
                if (convs.length === 0) return null;
                
                return (
                  <div key={group} className="space-y-2">
                    <div className="text-xs text-muted-foreground px-2 py-1 font-semibold">
                      {t(`chat.${group.toLowerCase()}`)}
                    </div>
                    {convs.map((conv) => (
                      <div
                        key={conv.id}
                        className={`w-full text-sm hover:bg-secondary group flex items-center h-auto py-2 px-3 rounded-md cursor-pointer ${
                          currentConversationId === conv.id ? "bg-secondary" : ""
                        }`}
                        onClick={() => {
                          if (editingId !== conv.id) {
                            onSelectConversation(conv.id);
                            onClose?.();
                          }
                        }}
                      >
                        <MessageSquare className="w-4 h-4 mr-2 flex-shrink-0" />
                        {editingId === conv.id ? (
                          <div className="flex-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Input
                              ref={editInputRef}
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, conv.id, true)}
                              onBlur={() => handleRenameAnonymous(conv.id)}
                              className="h-6 text-sm py-0 px-1"
                            />
                          </div>
                        ) : (
                          <>
                            <span className="flex-1 truncate text-left">{conv.title}</span>
                            <Pencil
                              className="w-3 h-3 opacity-0 group-hover:opacity-50 hover:opacity-100 flex-shrink-0 mr-1"
                              onClick={(e) => startEditing(conv.id, conv.title, e)}
                            />
                            <Trash2
                              className="w-3 h-3 opacity-0 group-hover:opacity-50 hover:opacity-100 flex-shrink-0"
                              onClick={(e) => handleDeleteAnonymous(conv.id, e)}
                            />
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )
        ) : conversations.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-8">
            {t('sidebar.noConversations')}
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(conversationGroups).map(([group, convs]) => {
              if (convs.length === 0) return null;
              
              return (
                <div key={group} className="space-y-2">
                  <div className="text-xs text-muted-foreground px-2 py-1 font-semibold">
                    {t(`chat.${group.toLowerCase()}`)}
                  </div>
                  {convs.map((conv) => (
                    <div
                      key={conv.id}
                      className={`w-full text-sm hover:bg-secondary group flex flex-col h-auto py-2 px-3 rounded-md cursor-pointer ${
                        currentConversationId === conv.id ? "bg-secondary" : ""
                      }`}
                      onClick={() => {
                        if (editingId !== conv.id) {
                          onSelectConversation(conv.id);
                          onClose?.();
                        }
                      }}
                    >
                      <div className="flex items-center w-full">
                        <MessageSquare className="w-4 h-4 mr-2 flex-shrink-0" />
                        {editingId === conv.id ? (
                          <div className="flex-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Input
                              ref={editInputRef}
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, conv.id, false)}
                              onBlur={() => handleRename(conv.id)}
                              className="h-6 text-sm py-0 px-1"
                            />
                          </div>
                        ) : (
                          <>
                            <span className="flex-1 truncate text-left">{conv.title}</span>
                            <Pencil
                              className="w-3 h-3 opacity-0 group-hover:opacity-50 hover:opacity-100 flex-shrink-0 mr-1"
                              onClick={(e) => startEditing(conv.id, conv.title, e)}
                            />
                            <Trash2
                              className="w-3 h-3 opacity-0 group-hover:opacity-50 hover:opacity-100 flex-shrink-0"
                              onClick={(e) => handleDelete(conv.id, e)}
                            />
                          </>
                        )}
                      </div>
                      {conv.uploaded_files && conv.uploaded_files.length > 0 && (
                        <div className="ml-6 mt-1">
                          <ConversationThumbnail files={conv.uploaded_files} maxDisplay={2} compact />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
      
      {/* Hidden file input for import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileImport}
        accept=".json"
        className="hidden"
      />
      
      <div className="p-4 border-t border-border space-y-3">
        {/* Export/Import for anonymous users */}
        {isAnonymous && anonymousConversations.length > 0 && (
          <div className="flex gap-2">
            <Button
              onClick={exportConversations}
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
            >
              <Download className="w-3 h-3 mr-1" />
              Export
            </Button>
            <Button
              onClick={handleImportClick}
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
            >
              <Upload className="w-3 h-3 mr-1" />
              Import
            </Button>
          </div>
        )}
        
        {/* Import only button when no conversations */}
        {isAnonymous && anonymousConversations.length === 0 && (
          <Button
            onClick={handleImportClick}
            variant="outline"
            size="sm"
            className="w-full text-xs"
          >
            <Upload className="w-3 h-3 mr-2" />
            Import Conversations
          </Button>
        )}
        
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
            {t('sidebar.upgradeToPremium')}
          </Button>
        )}

        {/* Navigation Links */}
        <Collapsible open={isNavOpen} onOpenChange={setIsNavOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between text-muted-foreground hover:text-foreground h-8 text-xs"
              size="sm"
            >
              <div className="flex items-center">
                <Settings className="w-3 h-3 mr-2" />
                {t('settings.title')}
              </div>
              <ChevronDown className={`w-3 h-3 transition-transform ${isNavOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 pt-1">
            <Button
              onClick={() => navigate("/usage")}
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-foreground h-8 text-xs pl-7"
              size="sm"
            >
              <BarChart3 className="w-3 h-3 mr-2" />
              {t('usage.title')}
            </Button>
            <Button
              onClick={() => navigate("/help")}
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-foreground h-8 text-xs pl-7"
              size="sm"
            >
              <HelpCircle className="w-3 h-3 mr-2" />
              {t('help.title')}
            </Button>
            <Button
              onClick={() => navigate("/learn-more")}
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-foreground h-8 text-xs pl-7"
              size="sm"
            >
              <BookOpen className="w-3 h-3 mr-2" />
              {t('learnMore.title')}
            </Button>
            <Button
              onClick={() => navigate("/privacy")}
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-foreground h-8 text-xs pl-7"
              size="sm"
            >
              <Shield className="w-3 h-3 mr-2" />
              {t('privacy.title')}
            </Button>
            <Button
              onClick={() => navigate("/terms")}
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-foreground h-8 text-xs pl-7"
              size="sm"
            >
              <FileText className="w-3 h-3 mr-2" />
              {t('terms.title')}
            </Button>
          </CollapsibleContent>
        </Collapsible>

        {/* Logout/Login Button */}
        {user ? (
          <Button
            onClick={handleSignOut}
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            size="sm"
          >
            <LogOut className="w-4 h-4 mr-2" />
            {t('sidebar.signOut')}
          </Button>
        ) : (
          <Button
            onClick={() => navigate("/auth")}
            className="w-full bg-gradient-primary hover:opacity-90 text-white"
            size="sm"
          >
            <User className="w-4 h-4 mr-2" />
            Sign In / Sign Up
          </Button>
        )}
      </div>
    </div>

    {/* Migration Dialog */}
    {user && (
      <MigrationDialog
        open={showMigrationDialog}
        onOpenChange={setShowMigrationDialog}
        conversations={pendingMigration}
        onMigrationComplete={handleMigrationComplete}
        userId={user.id}
      />
    )}
    </>
  );
};

export default Sidebar;
