import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Save, Download } from "lucide-react";
import { useState, useEffect } from "react";

interface CodexFile {
  id: string;
  file_name: string;
  file_content: string;
  file_type: string;
  is_modified: boolean;
}

interface CodeEditorProps {
  file: CodexFile | null;
  onSave: (id: string, content: string) => void;
  onDownload: (fileId: string) => void;
}

export const CodeEditor = ({ file, onSave, onDownload }: CodeEditorProps) => {
  const [content, setContent] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (file) {
      setContent(file.file_content);
      setHasChanges(false);
    }
  }, [file]);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setHasChanges(newContent !== file?.file_content);
  };

  const handleSave = () => {
    if (file && hasChanges) {
      onSave(file.id, content);
      setHasChanges(false);
    }
  };

  if (!file) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px] md:min-h-[400px]">
        <p className="text-sm md:text-base text-muted-foreground">Select a file to view and edit</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full border border-border rounded-lg overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 md:p-4 border-b border-border gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm md:text-base truncate">{file.file_name}</h3>
          <p className="text-xs text-muted-foreground">{file.file_type}</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges}
            className="flex-1 sm:flex-none text-xs"
          >
            <Save className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
            Save
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDownload(file.id)}
            className="flex-1 sm:flex-none text-xs"
          >
            <Download className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
            Download
          </Button>
        </div>
      </div>
      
      <div className="flex-1 p-3 md:p-4">
        <Textarea
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          className="h-full min-h-[300px] md:min-h-[400px] font-mono text-xs md:text-sm resize-none border-0 focus-visible:ring-0"
          placeholder="// Your code here..."
        />
      </div>
    </div>
  );
};