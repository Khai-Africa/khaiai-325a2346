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
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Select a file to view and edit</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h3 className="font-semibold">{file.file_name}</h3>
          <p className="text-xs text-muted-foreground">{file.file_type}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges}
          >
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDownload(file.id)}
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>
      </div>
      
      <div className="flex-1 p-4">
        <Textarea
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          className="h-full font-mono text-sm resize-none"
          placeholder="// Your code here..."
        />
      </div>
    </div>
  );
};