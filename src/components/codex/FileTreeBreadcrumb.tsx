import { ChevronRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileTreeBreadcrumbProps {
  currentPath: string | null;
  onNavigate: (path: string) => void;
}

export const FileTreeBreadcrumb = ({ currentPath, onNavigate }: FileTreeBreadcrumbProps) => {
  if (!currentPath) return null;
  
  const parts = currentPath.split('/').filter(Boolean);
  
  return (
    <div className="flex items-center gap-1 px-3 py-2 border-b border-border bg-muted/30 overflow-x-auto">
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-xs"
        onClick={() => onNavigate('/')}
      >
        <Home className="w-3 h-3" />
      </Button>
      
      {parts.map((part, index) => {
        const path = '/' + parts.slice(0, index + 1).join('/');
        const isLast = index === parts.length - 1;
        
        return (
          <div key={path} className="flex items-center gap-1">
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
            <Button
              variant="ghost"
              size="sm"
              className={`h-6 px-2 text-xs ${isLast ? 'font-semibold' : ''}`}
              onClick={() => !isLast && onNavigate(path)}
              disabled={isLast}
            >
              {part}
            </Button>
          </div>
        );
      })}
    </div>
  );
};
