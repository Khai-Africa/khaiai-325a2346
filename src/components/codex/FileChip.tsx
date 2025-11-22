import { X, FileText, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileChipProps {
  file: File;
  onRemove: () => void;
}

export const FileChip = ({ file, onRemove }: FileChipProps) => {
  const isImage = file.type.startsWith('image/');
  
  return (
    <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-1.5">
      {isImage ? (
        <ImageIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      ) : (
        <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      )}
      <span className="text-xs truncate max-w-[120px]">{file.name}</span>
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-5 w-5 p-0 hover:bg-destructive/10" 
        onClick={onRemove}
      >
        <X className="w-3 h-3" />
      </Button>
    </div>
  );
};
