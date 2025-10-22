import { useRef, useState } from "react";
import { Paperclip, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface FileUploadProps {
  onFilesSelect: (files: File[]) => void;
  selectedFiles: File[];
  onRemoveFile: (index: number) => void;
}

const FileUpload = ({ onFilesSelect, selectedFiles, onRemoveFile }: FileUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Check file size (20MB max per file)
    const oversizedFiles = files.filter(f => f.size > 20 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast.error("Some files exceed 20MB limit");
      return;
    }

    // Check total number of files (max 10)
    if (selectedFiles.length + files.length > 10) {
      toast.error("Maximum 10 files allowed");
      return;
    }

    onFilesSelect([...selectedFiles, ...files]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        accept="*/*"
      />
      
      {selectedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 pb-2">
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2 text-sm"
            >
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="max-w-[150px] truncate">{file.name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => onRemoveFile(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        className="h-9 rounded-full bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border"
      >
        <Paperclip className="w-4 h-4 mr-2" />
        Attach {selectedFiles.length > 0 && `(${selectedFiles.length})`}
      </Button>
    </div>
  );
};

export default FileUpload;