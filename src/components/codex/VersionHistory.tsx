import { RotateCcw, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { formatDistanceToNow } from "date-fns";
import { useFileVersions } from "@/hooks/useFileVersions";

interface VersionHistoryProps {
  fileId: string | null;
  projectId: string | null;
  currentFileContent: string;
  onRestore?: () => void;
}

export const VersionHistory = ({ fileId, projectId, currentFileContent, onRestore }: VersionHistoryProps) => {
  const { versions, loading, restoreVersion } = useFileVersions(fileId, projectId);

  const handleRestore = async (version: any) => {
    const success = await restoreVersion(version, currentFileContent);
    if (success && onRestore) {
      onRestore();
    }
  };

  if (!fileId) {
    return (
      <div className="p-3 text-center text-xs text-muted-foreground">
        Select a file to view version history
      </div>
    );
  }

  return (
    <Accordion type="single" collapsible className="border-t">
      <AccordionItem value="versions" className="border-0">
        <AccordionTrigger className="px-3 py-2 text-xs font-medium hover:no-underline">
          <div className="flex items-center gap-2">
            <History className="w-3 h-3" />
            <span>Version History ({versions.length})</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-0 pb-0">
          {loading ? (
            <div className="p-3 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : versions.length === 0 ? (
            <div className="p-3 text-center text-xs text-muted-foreground">
              No version history yet
            </div>
          ) : (
            <ScrollArea className="h-[200px]">
              <div className="space-y-1 px-2 pb-2">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className="group hover:bg-accent p-2 rounded-md transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{version.file_name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          v{version.version_number} • {formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
                        </p>
                        {version.description && (
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                            {version.description}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        onClick={() => handleRestore(version)}
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Restore
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};
