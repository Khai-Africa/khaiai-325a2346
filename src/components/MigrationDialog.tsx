import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, X, Loader2 } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { StoredConversation, StoredMessage } from "@/hooks/useAnonymousConversations";

interface MigrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversations: StoredConversation[];
  onMigrationComplete: () => void;
  userId: string;
}

export const MigrationDialog = ({
  open,
  onOpenChange,
  conversations,
  onMigrationComplete,
  userId,
}: MigrationDialogProps) => {
  const { t } = useTranslation();
  const [migrating, setMigrating] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleMigrate = async () => {
    if (conversations.length === 0) {
      onOpenChange(false);
      return;
    }

    setMigrating(true);
    setProgress(0);

    try {
      let successCount = 0;

      for (let i = 0; i < conversations.length; i++) {
        const conv = conversations[i];
        
        // Create conversation in database
        const { data: newConv, error: convError } = await supabase
          .from("conversations")
          .insert({
            user_id: userId,
            title: conv.title,
            created_at: conv.updatedAt,
            updated_at: conv.updatedAt,
          })
          .select()
          .single();

        if (convError) {
          console.error("Failed to migrate conversation:", convError);
          continue;
        }

        // Migrate messages
        const messagesToInsert = conv.messages.map((msg: StoredMessage) => ({
          conversation_id: newConv.id,
          role: msg.role,
          content: typeof msg.content === 'string' 
            ? msg.content 
            : JSON.stringify(msg.content),
          created_at: msg.timestamp,
        }));

        if (messagesToInsert.length > 0) {
          const { error: msgError } = await supabase
            .from("messages")
            .insert(messagesToInsert);

          if (msgError) {
            console.error("Failed to migrate messages:", msgError);
          }
        }

        successCount++;
        setProgress(Math.round(((i + 1) / conversations.length) * 100));
      }

      // Clear local storage after successful migration
      localStorage.removeItem('khai_anonymous_conversations');
      
      toast.success(`Successfully migrated ${successCount} conversation${successCount !== 1 ? 's' : ''}`);
      onMigrationComplete();
      onOpenChange(false);
    } catch (error) {
      console.error("Migration error:", error);
      toast.error("Failed to migrate some conversations");
    } finally {
      setMigrating(false);
    }
  };

  const handleSkip = () => {
    // Clear local storage without migrating
    localStorage.removeItem('khai_anonymous_conversations');
    onMigrationComplete();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={migrating ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Migrate Your Conversations
          </DialogTitle>
          <DialogDescription>
            We found {conversations.length} conversation{conversations.length !== 1 ? 's' : ''} from your previous session. 
            Would you like to save {conversations.length !== 1 ? 'them' : 'it'} to your account?
          </DialogDescription>
        </DialogHeader>

        {migrating && (
          <div className="py-4">
            <div className="flex items-center gap-2 mb-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Migrating conversations... {progress}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleSkip}
            disabled={migrating}
            className="w-full sm:w-auto"
          >
            <X className="w-4 h-4 mr-2" />
            Skip & Discard
          </Button>
          <Button
            onClick={handleMigrate}
            disabled={migrating}
            className="w-full sm:w-auto"
          >
            {migrating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            Migrate to Account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
