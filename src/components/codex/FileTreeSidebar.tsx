import { useState, useRef } from "react";
import { FileTree } from "./FileTree";
import { VersionHistory } from "./VersionHistory";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Plus, X, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface FileTreeSidebarProps {
  files: any[];
  selectedFile: any;
  onFileSelect: (file: any) => void;
  onFileDelete: (id: string) => void;
  onFileDownload: (id: string) => void;
  onFileUpload?: (files: FileList) => void;
  projectId: string | null;
  onVersionRestore?: () => void;
  isOpen: boolean;
  onClose?: () => void;
}

export const FileTreeSidebar = ({
  files,
  selectedFile,
  onFileSelect,
  onFileDelete,
  onFileDownload,
  onFileUpload,
  projectId,
  onVersionRestore,
  isOpen,
  onClose,
}: FileTreeSidebarProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      if (onFileUpload) {
        // Check file sizes
        const oversizedFiles = Array.from(droppedFiles).filter(f => f.size > 20 * 1024 * 1024);
        if (oversizedFiles.length > 0) {
          toast.error(`Some files exceed 20MB limit: ${oversizedFiles.map(f => f.name).join(', ')}`);
          return;
        }
        onFileUpload(droppedFiles);
        toast.success(`${droppedFiles.length} file(s) uploaded`);
      }
    }
  };

  return (
    <div
      ref={dropZoneRef}
      className={cn(
        "flex flex-col h-full border-r border-border bg-card/50 transition-all duration-300 relative",
        isOpen ? "w-64" : "w-0 border-r-0"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && isOpen && (
        <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="text-center">
            <Upload className="w-12 h-12 mx-auto mb-2 text-primary" />
            <p className="text-sm font-medium">Drop files here</p>
            <p className="text-xs text-muted-foreground">Max 20MB per file</p>
          </div>
        </div>
      )}

      {isOpen && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b">
            <h3 className="text-sm font-semibold">Files</h3>
            <div className="flex items-center gap-1">
              {onFileUpload && (
                <>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => e.target.files && onFileUpload(e.target.files)}
                    className="hidden"
                    id="sidebar-file-upload"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => document.getElementById('sidebar-file-upload')?.click()}
                    className="h-7 w-7 p-0"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </>
              )}
              {onClose && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onClose}
                  className="h-7 w-7 p-0 lg:hidden"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* File Tree */}
          <ScrollArea className="flex-1">
            <div className="p-2">
              {files.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground mb-3">No files yet</p>
                  {onFileUpload && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => document.getElementById('sidebar-file-upload')?.click()}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Upload Files
                    </Button>
                  )}
                </div>
              ) : (
                <FileTree
                  files={files}
                  selectedFile={selectedFile}
                  onFileSelect={onFileSelect}
                  onFileDelete={onFileDelete}
                  onFileDownload={onFileDownload}
                />
              )}
            </div>
          </ScrollArea>

          {/* Version History */}
          <div className="border-t">
            <VersionHistory
              fileId={selectedFile?.id || null}
              projectId={projectId}
              currentFileContent={selectedFile?.file_content || ""}
              onRestore={onVersionRestore}
            />
          </div>
        </>
      )}
    </div>
  );
};
