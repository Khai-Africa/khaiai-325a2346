import { File, Folder, FolderOpen, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";

interface CodexFile {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  is_modified: boolean;
}

interface FileTreeProps {
  files: CodexFile[];
  selectedFile: CodexFile | null;
  onFileSelect: (file: CodexFile) => void;
  onFileDelete: (id: string) => void;
}

export const FileTree = ({ files, selectedFile, onFileSelect, onFileDelete }: FileTreeProps) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']));

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const getFileIcon = (fileType: string) => {
    return <File className="w-4 h-4" />;
  };

  return (
    <div className="border-r border-border h-full bg-card">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold">Files</h3>
      </div>
      
      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="p-2 space-y-1">
          {files.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 text-center">
              No files yet. Upload files to get started.
            </p>
          ) : (
            files.map((file) => (
              <div
                key={file.id}
                className={`flex items-center justify-between gap-2 p-2 rounded-md cursor-pointer hover:bg-accent group ${
                  selectedFile?.id === file.id ? 'bg-accent' : ''
                }`}
                onClick={() => onFileSelect(file)}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {getFileIcon(file.file_type)}
                  <span className="text-sm truncate">
                    {file.file_name}
                    {file.is_modified && <span className="text-primary ml-1">*</span>}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFileDelete(file.id);
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};