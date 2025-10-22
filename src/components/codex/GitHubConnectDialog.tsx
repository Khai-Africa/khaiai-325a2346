import { useState } from "react";
import { Github, ExternalLink, CheckCircle2, AlertCircle, Upload, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";

interface GitHubConnectDialogProps {
  open: boolean;
  onClose: () => void;
  onConnect: (repoUrl: string) => void;
  isConnected: boolean;
  currentRepo?: string;
  projectId?: string;
  files?: any[];
}

export const GitHubConnectDialog = ({
  open,
  onClose,
  onConnect,
  isConnected,
  currentRepo,
  projectId,
  files = [],
}: GitHubConnectDialogProps) => {
  const [repoUrl, setRepoUrl] = useState(currentRepo || "");
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");

  const handleConnect = async () => {
    if (!repoUrl.trim()) {
      toast.error("Please enter a GitHub repository URL");
      return;
    }

    // Validate GitHub URL format
    const githubUrlPattern = /^https:\/\/github\.com\/[\w-]+\/[\w-]+$/;
    if (!githubUrlPattern.test(repoUrl.trim())) {
      toast.error("Please enter a valid GitHub repository URL (e.g., https://github.com/username/repo)");
      return;
    }

    setConnecting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to connect GitHub");
        return;
      }

      // Store GitHub connection in user metadata or separate table
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          github_repo_url: repoUrl.trim(),
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast.success("GitHub repository connected successfully!");
      onConnect(repoUrl.trim());
      onClose();
    } catch (error: any) {
      console.error("Error connecting GitHub:", error);
      toast.error(error.message || "Failed to connect GitHub repository");
    } finally {
      setConnecting(false);
    }
  };

  const handlePush = async () => {
    if (!projectId || !isConnected || files.length === 0) {
      toast.error("No files to push");
      return;
    }

    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const filesToPush = files.map(f => ({
        path: f.file_path || f.file_name,
        content: f.file_content,
      }));

      const { data, error } = await supabase.functions.invoke('github-sync', {
        body: {
          action: 'push',
          projectId,
          files: filesToPush,
          commitMessage: commitMessage || "Update from Codex",
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(data.message || "Files pushed to GitHub successfully!");
        setCommitMessage("");
      } else {
        toast.error("Failed to push files to GitHub");
      }
    } catch (error: any) {
      console.error("Error pushing to GitHub:", error);
      toast.error(error.message || "Failed to push to GitHub. Make sure you have authenticated with GitHub.");
    } finally {
      setSyncing(false);
    }
  };

  const handlePull = async () => {
    if (!projectId || !isConnected) {
      toast.error("Cannot pull: No GitHub connection");
      return;
    }

    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const filePaths = files.map(f => f.file_path || f.file_name);

      const { data, error } = await supabase.functions.invoke('github-sync', {
        body: {
          action: 'pull',
          projectId,
          files: filePaths,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.success && data.files) {
        toast.success(`Pulled ${data.files.length} files from GitHub`);
        // Note: You'd need to handle updating local files here
      } else {
        toast.error("No files pulled from GitHub");
      }
    } catch (error: any) {
      console.error("Error pulling from GitHub:", error);
      toast.error(error.message || "Failed to pull from GitHub");
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    setConnecting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_profiles')
        .update({
          github_repo_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success("GitHub repository disconnected");
      setRepoUrl("");
      onConnect("");
      onClose();
    } catch (error: any) {
      console.error("Error disconnecting GitHub:", error);
      toast.error("Failed to disconnect GitHub repository");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="w-5 h-5" />
            Connect to GitHub
          </DialogTitle>
          <DialogDescription>
            Sync your Coda House projects with a GitHub repository for version control and collaboration
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isConnected && currentRepo ? (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">Connected to GitHub</p>
                  <p className="text-sm text-muted-foreground break-all">{currentRepo}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(currentRepo, '_blank')}
                className="w-full"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View Repository
              </Button>
            </div>
          ) : (
            <div className="bg-muted/50 border rounded-lg p-4 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Not Connected</p>
                  <p className="text-sm text-muted-foreground">
                    Connect a GitHub repository to enable sync and version control
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="repo-url">GitHub Repository URL</Label>
            <Input
              id="repo-url"
              placeholder="https://github.com/username/repository"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              disabled={connecting}
            />
            <p className="text-xs text-muted-foreground">
              Enter the full URL of your GitHub repository
            </p>
          </div>

          <div className="bg-muted/30 rounded-lg p-3 space-y-2 text-sm">
            <p className="font-medium">How it works:</p>
            <ul className="space-y-1 text-muted-foreground ml-4 list-disc">
              <li>Connect your GitHub repository to enable sync</li>
              <li>Push: Upload your Codex files to GitHub</li>
              <li>Pull: Download files from GitHub to Codex</li>
              <li>Requires GitHub authentication in Settings</li>
            </ul>
          </div>

          {isConnected && projectId && (
            <>
              <div className="space-y-2">
                <Label htmlFor="commit-message">Commit Message (for push)</Label>
                <Textarea
                  id="commit-message"
                  placeholder="Update files via Codex"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  disabled={syncing}
                  className="h-20"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={handlePush}
                  disabled={syncing || files.length === 0}
                  className="w-full"
                >
                  {syncing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  Push to GitHub
                </Button>
                <Button
                  variant="outline"
                  onClick={handlePull}
                  disabled={syncing}
                  className="w-full"
                >
                  {syncing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Pull from GitHub
                </Button>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2">
          {isConnected ? (
            <>
              <Button
                variant="destructive"
                onClick={handleDisconnect}
                disabled={connecting}
                className="flex-1"
              >
                {connecting ? "Disconnecting..." : "Disconnect"}
              </Button>
              <Button variant="outline" onClick={onClose} className="flex-1">
                Close
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleConnect}
                disabled={connecting || !repoUrl.trim()}
                className="flex-1"
              >
                <Github className="w-4 h-4 mr-2" />
                {connecting ? "Connecting..." : "Connect"}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
