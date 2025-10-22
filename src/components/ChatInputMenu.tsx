import { Search, BookOpen, Image, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import FileUpload from "./FileUpload";

interface ChatInputMenuProps {
  onModeSelect: (mode: string) => void;
  selectedFiles: File[];
  onFilesSelect: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
}

const ChatInputMenu = ({ onModeSelect, selectedFiles, onFilesSelect, onRemoveFile }: ChatInputMenuProps) => {
  const navigate = useNavigate();

  const handleSearch = () => {
    onModeSelect("search");
    toast.success("Search mode activated - I can now search the web for you!");
  };

  const handleStudy = () => {
    onModeSelect("study");
    toast.success("Study mode activated - I'll help you learn and understand better!");
  };

  const handleImageGen = () => {
    navigate("/image-gen");
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <FileUpload 
        onFilesSelect={onFilesSelect}
        selectedFiles={selectedFiles}
        onRemoveFile={onRemoveFile}
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={handleImageGen}
        className="h-7 px-2.5 text-xs rounded-full bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border"
      >
        <Image className="w-3.5 h-3.5 mr-1.5" />
        Generate Image
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSearch}
        className="h-7 px-2.5 text-xs rounded-full bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border"
      >
        <Globe className="w-3.5 h-3.5 mr-1.5" />
        Search Web
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleStudy}
        className="h-7 px-2.5 text-xs rounded-full bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border"
      >
        <BookOpen className="w-3.5 h-3.5 mr-1.5" />
        Study Mode
      </Button>
    </div>
  );
};

export default ChatInputMenu;
