import { Button } from "@/components/ui/button";
import { Settings, Book, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { SubscriptionBadge } from "@/components/SubscriptionBadge";
import { useAuth } from "@/hooks/useAuth";

export const CodexHeader = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container flex h-12 md:h-16 items-center justify-between px-3 md:px-4">
        <div className="flex items-center gap-2 md:gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="px-2 md:px-3">
            <ArrowLeft className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
            <span className="text-xs md:text-sm">Back</span>
          </Button>
          <h1 className="text-base md:text-xl font-semibold">Coda House</h1>
        </div>
        
        <div className="flex items-center gap-1 md:gap-3">
          <Button variant="ghost" size="sm" asChild className="px-2 md:px-3">
            <Link to="/help#coda-house">
              <Book className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
              <span className="hidden md:inline text-xs md:text-sm">Docs</span>
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild className="px-2 md:px-3">
            <Link to="/settings">
              <Settings className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
              <span className="hidden md:inline text-xs md:text-sm">Settings</span>
            </Link>
          </Button>
          {user && <SubscriptionBadge />}
        </div>
      </div>
    </header>
  );
};