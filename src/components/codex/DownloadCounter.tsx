import { Crown, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useCurrency } from "@/hooks/useCurrency";

interface DownloadCounterProps {
  isPremium: boolean;
  freeDownloadsRemaining: number;
}

export const DownloadCounter = ({ isPremium, freeDownloadsRemaining }: DownloadCounterProps) => {
  const { formatPrice } = useCurrency();

  if (isPremium) {
    return (
      <Badge className="gap-2 bg-gradient-primary text-white">
        <Crown className="w-4 h-4" />
        Unlimited Downloads
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Badge variant="secondary" className="gap-2">
        <Download className="w-4 h-4" />
        {freeDownloadsRemaining}/3 free downloads
      </Badge>
      
      {freeDownloadsRemaining === 0 && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">
            {formatPrice(0.83)} per download after
          </span>
          <Button variant="outline" size="sm" asChild>
            <Link to="/premium">
              <Crown className="w-4 h-4 mr-2" />
              Go Premium
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
};