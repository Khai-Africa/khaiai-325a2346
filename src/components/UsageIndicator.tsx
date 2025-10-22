import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Sparkles, Info } from "lucide-react";
import { useUsage } from "@/hooks/useUsage";
import { useAnonymousUsage } from "@/hooks/useAnonymousUsage";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const UsageIndicator = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { usage, loading } = useUsage();
  const anonymousUsage = useAnonymousUsage();
  
  const isAnonymous = !user;

  // Anonymous users
  if (isAnonymous) {
    const messagePercentage = (anonymousUsage.usage.messageCount / anonymousUsage.messageLimit) * 100;
    const imagePercentage = (anonymousUsage.usage.imageCount / anonymousUsage.imageLimit) * 100;
    const isLimitApproaching = anonymousUsage.remaining <= 2 || anonymousUsage.imageRemaining <= 1;

    return (
      <div className="space-y-2">
        {/* Messages Usage */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {anonymousUsage.remaining} messages left (Free Trial)
            </span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-3 h-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Create a free account to get 10 messages/day</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          {isLimitApproaching && (
            <Button
              onClick={() => navigate("/auth?redirect=premium")}
              size="sm"
              variant="ghost"
              className="h-6 text-xs gap-1 text-primary hover:text-primary"
            >
              Sign Up
            </Button>
          )}
        </div>
        <Progress value={messagePercentage} className="h-1" />

        {/* Images Usage */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {anonymousUsage.imageRemaining} images left (Free Trial)
            </span>
          </div>
        </div>
        <Progress value={imagePercentage} className="h-1" />

        {(anonymousUsage.remaining === 0 || anonymousUsage.imageRemaining === 0) && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            <p className="text-sm text-destructive font-medium mb-2">
              Free trial limit reached
            </p>
            <Button
              onClick={() => navigate("/auth?redirect=premium")}
              size="sm"
              className="w-full bg-gradient-primary hover:opacity-90 text-white"
            >
              Create Free Account
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Authenticated users
  if (loading || !usage) {
    return null;
  }

  // Premium users (unlimited)
  if (usage.limit === -1) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gradient-primary/10 border border-primary/20 rounded-lg">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-primary">Premium - Unlimited</span>
      </div>
    );
  }

  // Free users (authenticated)
  const percentage = (usage.messageCount / usage.limit) * 100;
  const isNearLimit = usage.remaining <= 2;
  const imagePercentage = (usage.imageCount / usage.imageLimit) * 100;
  const isNearImageLimit = usage.imageRemaining <= 1;

  return (
    <div className="space-y-2">
      {/* Messages Usage */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {usage.remaining} messages left today
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-3 h-3 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Resets daily at midnight</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {isNearLimit && (
          <Button
            onClick={() => navigate("/premium")}
            size="sm"
            variant="ghost"
            className="h-6 text-xs gap-1 text-primary hover:text-primary"
          >
            <Sparkles className="w-3 h-3" />
            Upgrade
          </Button>
        )}
      </div>
      <Progress 
        value={percentage} 
        className="h-1"
      />

      {/* Images Usage */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {usage.imageRemaining} images left today
          </span>
        </div>
        {isNearImageLimit && (
          <Button
            onClick={() => navigate("/premium")}
            size="sm"
            variant="ghost"
            className="h-6 text-xs gap-1 text-primary hover:text-primary"
          >
            <Sparkles className="w-3 h-3" />
            Upgrade
          </Button>
        )}
      </div>
      <Progress 
        value={imagePercentage} 
        className="h-1"
      />

      {(usage.remaining === 0 || usage.imageRemaining === 0) && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
          <p className="text-sm text-destructive font-medium mb-2">
            {usage.remaining === 0 && usage.imageRemaining === 0 
              ? "Daily limits reached"
              : usage.remaining === 0
              ? "Message limit reached"
              : "Image limit reached"
            }
          </p>
          <Button
            onClick={() => navigate("/premium")}
            size="sm"
            className="w-full bg-gradient-primary hover:opacity-90"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Go Premium
          </Button>
        </div>
      )}
    </div>
  );
};
