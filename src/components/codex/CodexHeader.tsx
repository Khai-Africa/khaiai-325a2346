import { Button } from "@/components/ui/button";
import { Settings, Book, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { SubscriptionBadge } from "@/components/SubscriptionBadge";
import { useAuth } from "@/hooks/useAuth";

export const CodexHeader = () => {
  const { user } = useAuth();

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-xl font-semibold">Coda House</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/help#coda-house">
              <Book className="w-4 h-4 mr-2" />
              Docs
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/settings">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Link>
          </Button>
          {user && <SubscriptionBadge />}
        </div>
      </div>
    </header>
  );
};