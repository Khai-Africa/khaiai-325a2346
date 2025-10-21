import { Crown, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/useSubscription";

export const SubscriptionBadge = () => {
  const { isPremium, loading } = useSubscription();

  if (loading) {
    return (
      <Badge variant="outline" className="gap-1">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Loading...</span>
      </Badge>
    );
  }

  if (isPremium) {
    return (
      <Badge className="gap-1 bg-gradient-primary text-white">
        <Crown className="w-3 h-3" />
        <span>Premium</span>
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="gap-1">
      <span>Free</span>
    </Badge>
  );
};
