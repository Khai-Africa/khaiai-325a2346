import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Trash2, Edit2, Search, Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ShareDialog } from "@/components/ShareDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export const ConversationList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareData, setShareData] = useState({ text: "", title: "" });

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("user_id", user?.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      toast.error("Failed to load conversations");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("conversations")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      setConversations(conversations.filter(c => c.id !== deleteId));
      toast.success("Conversation deleted");
      setDeleteId(null);
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete conversation");
    }
  };

  const handleRename = async (id: string) => {
    if (!newTitle.trim()) return;

    try {
      const { error } = await supabase
        .from("conversations")
        .update({ title: newTitle })
        .eq("id", id);

      if (error) throw error;

      setConversations(conversations.map(c => 
        c.id === id ? { ...c, title: newTitle } : c
      ));
      toast.success("Conversation renamed");
      setEditingId(null);
      setNewTitle("");
    } catch (error) {
      console.error("Rename error:", error);
      toast.error("Failed to rename conversation");
    }
  };

  const handleExport = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const conversation = conversations.find(c => c.id === id);
      const exportData = {
        title: conversation?.title,
        created_at: conversation?.created_at,
        messages: data,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${conversation?.title || 'conversation'}-${new Date().toISOString().split('T')[0]}.json`;
      link.click();

      toast.success("Conversation exported");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export conversation");
    }
  };

  const handleShare = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const conversation = conversations.find(c => c.id === id);
      const conversationText = data
        ?.map((msg) => `${msg.role === "user" ? "You" : "Khai AI"}: ${msg.content}`)
        .join("\n\n");

      setShareData({
        text: conversationText || "",
        title: conversation?.title || "Conversation",
      });
      setShareDialogOpen(true);
    } catch (error) {
      console.error("Share error:", error);
      toast.error("Failed to load conversation");
    }
  };

  const filteredConversations = conversations.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      ) : filteredConversations.length === 0 ? (
        <Card className="p-8 text-center">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            {searchQuery ? "No conversations found" : "No conversations yet"}
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredConversations.map((conversation) => (
            <Card key={conversation.id} className="p-4 hover:border-primary transition-colors">
              {editingId === conversation.id ? (
                <div className="flex gap-2">
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="New title"
                    autoFocus
                  />
                  <Button size="sm" onClick={() => handleRename(conversation.id)}>
                    Save
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      setEditingId(null);
                      setNewTitle("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div 
                    className="flex-1 cursor-pointer" 
                    onClick={() => navigate(`/?conversation=${conversation.id}`)}
                  >
                    <h3 className="font-medium">{conversation.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {new Date(conversation.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(conversation.id);
                        setNewTitle(conversation.title);
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleShare(conversation.id)}
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleExport(conversation.id)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteId(conversation.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        conversationText={shareData.text}
        conversationTitle={shareData.title}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the conversation and all its messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
