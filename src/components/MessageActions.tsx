import { Copy, ThumbsUp, ThumbsDown, Share2, RotateCw, MoreHorizontal, Flag, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface MessageActionsProps {
  content: string;
  conversationId?: string | null;
  onRegenerate?: () => void;
  onSpeak?: (text: string) => void;
}

const MessageActions = ({ content, conversationId, onRegenerate, onSpeak }: MessageActionsProps) => {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [dislikeAnimating, setDislikeAnimating] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy");
    }
  };

  const handleLike = async () => {
    if (!user) {
      toast.info("Sign up to save your feedback");
      return;
    }

    // Trigger animation
    setLikeAnimating(true);
    setTimeout(() => setLikeAnimating(false), 600);

    try {
      await supabase.from("message_feedback").insert({
        user_id: user.id,
        message_content: content,
        conversation_id: conversationId,
        feedback_type: "like",
      });
      setLiked(true);
      setDisliked(false);
      toast.success("Thanks for your feedback!", {
        icon: "👍",
      });
    } catch (error) {
      console.error("Error saving feedback:", error);
    }
  };

  const handleDislike = async () => {
    if (!user) {
      toast.info("Sign up to save your feedback");
      return;
    }

    // Trigger animation
    setDislikeAnimating(true);
    setTimeout(() => setDislikeAnimating(false), 600);

    try {
      await supabase.from("message_feedback").insert({
        user_id: user.id,
        message_content: content,
        conversation_id: conversationId,
        feedback_type: "dislike",
      });
      setDisliked(true);
      setLiked(false);
      toast.success("Thanks for your feedback!", {
        icon: "👎",
      });
    } catch (error) {
      console.error("Error saving feedback:", error);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ text: content });
      } catch (error) {
        // User cancelled share
      }
    } else {
      handleCopy();
    }
  };

  const handleReport = () => {
    toast.info("Report feature coming soon");
  };

  return (
    <div className="flex items-center gap-1 mt-2">
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-foreground transition-colors"
        onClick={handleCopy}
      >
        <Copy className="h-4 w-4" />
      </Button>
      {onSpeak && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => onSpeak(content)}
        >
          <Volume2 className="h-4 w-4" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-7 w-7 transition-all duration-200",
          liked 
            ? "text-primary bg-primary/10" 
            : "text-muted-foreground hover:text-primary hover:bg-primary/5",
          likeAnimating && "scale-125"
        )}
        onClick={handleLike}
      >
        <ThumbsUp 
          className={cn(
            "h-4 w-4 transition-all duration-300",
            liked && "fill-primary",
            likeAnimating && "animate-bounce"
          )} 
        />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-7 w-7 transition-all duration-200",
          disliked 
            ? "text-destructive bg-destructive/10" 
            : "text-muted-foreground hover:text-destructive hover:bg-destructive/5",
          dislikeAnimating && "scale-125"
        )}
        onClick={handleDislike}
      >
        <ThumbsDown 
          className={cn(
            "h-4 w-4 transition-all duration-300",
            disliked && "fill-destructive",
            dislikeAnimating && "animate-bounce"
          )} 
        />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-foreground transition-colors"
        onClick={handleShare}
      >
        <Share2 className="h-4 w-4" />
      </Button>
      {onRegenerate && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground transition-colors"
          onClick={onRegenerate}
        >
          <RotateCw className="h-4 w-4" />
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground transition-colors"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 bg-card border-border">
          <DropdownMenuItem onClick={handleReport} className="cursor-pointer">
            <Flag className="h-4 w-4 mr-2" />
            Report issue
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default MessageActions;