import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

interface CodexPromptInputProps {
  onSubmit: (prompt: string, mode: 'ask' | 'code') => void;
  onFileUpload: (files: FileList) => void;
  loading: boolean;
}

export const CodexPromptInput = ({ onSubmit, onFileUpload, loading }: CodexPromptInputProps) => {
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<'ask' | 'code'>('ask');

  const handleSubmit = () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }
    onSubmit(prompt, mode);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload(e.target.files);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          What should we code next?
        </h2>
        <p className="text-muted-foreground">
          Describe what you want to build and I'll help you code it
        </p>
      </div>

      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex gap-2 justify-center">
          <Button
            variant={mode === 'ask' ? 'default' : 'outline'}
            onClick={() => setMode('ask')}
            size="sm"
          >
            Ask
          </Button>
          <Button
            variant={mode === 'code' ? 'default' : 'outline'}
            onClick={() => setMode('code')}
            size="sm"
          >
            Code
          </Button>
        </div>

        <Textarea
          placeholder="E.g., Create a React component for a responsive navigation bar..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="min-h-[120px] resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              handleSubmit();
            }
          }}
        />

        <div className="flex gap-2 justify-between">
          <div>
            <input
              type="file"
              id="file-upload"
              multiple
              className="hidden"
              onChange={handleFileChange}
              accept=".js,.jsx,.ts,.tsx,.py,.java,.cpp,.c,.css,.html,.json,.md"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Files
            </Button>
          </div>

          <Button onClick={handleSubmit} disabled={loading || !prompt.trim()}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              'Submit'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};