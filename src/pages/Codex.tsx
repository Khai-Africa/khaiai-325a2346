import { useState, useEffect } from "react";
import { CodexHeader } from "@/components/codex/CodexHeader";
import { CodexPromptInput } from "@/components/codex/CodexPromptInput";
import { FileTreeSidebar } from "@/components/codex/FileTreeSidebar";
import { DownloadCounter } from "@/components/codex/DownloadCounter";
import { DownloadPaymentDialog } from "@/components/codex/DownloadPaymentDialog";
import { GitHubConnectDialog } from "@/components/codex/GitHubConnectDialog";
import { CodexChat } from "@/components/codex/CodexChat";
import { CodePreview } from "@/components/codex/CodePreview";
import { useCodexUsage } from "@/hooks/useCodexUsage";
import { useCodexProjects } from "@/hooks/useCodexProjects";
import { useCodexFiles } from "@/hooks/useCodexFiles";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Plus, Github, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export default function Codex() {
  const navigate = useNavigate();
  const { user, session, loading: authLoading } = useAuth();
  const { isPremium, canDownload, freeDownloadsRemaining, refetch: refetchUsage } = useCodexUsage();
  const { projects, activeProject, createProject, setActiveProject } = useCodexProjects();
  const { files, uploadFile, updateFile, deleteFile, refetch: refetchFiles } = useCodexFiles(activeProject?.id || null);
  
  const isMobile = useIsMobile();
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [previewCode, setPreviewCode] = useState({ code: "", language: "html" });
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [pendingDownloadFileId, setPendingDownloadFileId] = useState<string | null>(null);
  const [showGitHubDialog, setShowGitHubDialog] = useState(false);
  const [gitHubRepoUrl, setGitHubRepoUrl] = useState<string>("");
  const [isGitHubConnected, setIsGitHubConnected] = useState(false);

  // Redirect if not logged in (wrapped in useEffect)
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Handle payment success
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const paymentStatus = searchParams.get('payment');
    const fileIdsParam = searchParams.get('fileIds');
    const projectIdParam = searchParams.get('projectId');

    if (paymentStatus === 'success' && fileIdsParam && projectIdParam) {
      toast.success('Payment successful! Starting download...');
      
      // Process downloads
      const fileIds = fileIdsParam.split(',');
      fileIds.forEach(async (fileId) => {
        await performDownload(fileId);
      });

      // Update usage
      refetchUsage();

      // Clean URL
      window.history.replaceState({}, '', '/codex');
    } else if (paymentStatus === 'canceled') {
      toast.info('Payment canceled');
      window.history.replaceState({}, '', '/codex');
    }
  }, []);


  // Toggle sidebar based on screen size
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  // Load GitHub connection status
  useEffect(() => {
    const loadGitHubConnection = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('github_repo_url')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (data && data.github_repo_url) {
          setGitHubRepoUrl(data.github_repo_url);
          setIsGitHubConnected(true);
        }
      } catch (error) {
        console.error('Error loading GitHub connection:', error);
      }
    };

    loadGitHubConnection();
  }, [user]);

  const handleGitHubConnect = (repoUrl: string) => {
    setGitHubRepoUrl(repoUrl);
    setIsGitHubConnected(!!repoUrl);
  };

  const handleVersionRestore = () => {
    refetchFiles();
    if (selectedFile) {
      // Refresh selected file content
      const updatedFile = files.find(f => f.id === selectedFile.id);
      if (updatedFile) {
        setSelectedFile(updatedFile);
      }
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!user) {
    return null;
  }


  const handleFileUpload = async (fileList: FileList) => {
    // Ensure we have a project before uploading
    let project = activeProject;
    if (!project) {
      project = await createProject("My Project", "Auto-created project");
      if (!project) {
        toast.error("Failed to create project");
        return;
      }
    }

    const uploadPromises = Array.from(fileList).map(file => {
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 20MB limit`);
        return null;
      }
      return uploadFile(file, project!.id);
    });

    await Promise.all(uploadPromises.filter(p => p !== null));
  };

  const handleDownload = async (fileId: string) => {
    if (!canDownload && !isPremium) {
      setPendingDownloadFileId(fileId);
      setShowPaymentDialog(true);
      return;
    }

    if (!activeProject) {
      toast.error("No active project");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('codex-download-payment', {
        body: {
          fileIds: [fileId],
          projectId: activeProject.id,
          currency: 'XAF',
          paymentProvider: 'free',
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw error;

      if (data.authorized) {
        await performDownload(fileId);
        refetchUsage();
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Failed to authorize download');
    }
  };

  const performDownload = async (fileId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('codex-prepare-download', {
        body: { fileIds: [fileId] },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw error;

      const file = data.files[0];
      const blob = new Blob([file.file_content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('File downloaded');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Failed to download file');
    }
  };

  const handlePaymentProceed = async (provider: 'stripe' | 'flutterwave') => {
    if (!pendingDownloadFileId || !activeProject) return;

    try {
      toast.loading("Creating payment session...");
      
      const { data, error } = await supabase.functions.invoke('codex-create-payment', {
        body: {
          fileIds: [pendingDownloadFileId],
          projectId: activeProject.id,
          provider,
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Redirect to payment
        window.open(data.url, '_blank');
        setShowPaymentDialog(false);
        toast.success("Redirecting to payment...");
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Failed to create payment session');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CodexHeader />
      
      <div className="container mx-auto px-3 md:px-4 py-3 md:py-6 space-y-3 md:space-y-6 flex-1">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 md:gap-4 w-full sm:w-auto">
            <DownloadCounter 
              isPremium={isPremium} 
              freeDownloadsRemaining={freeDownloadsRemaining} 
            />
            
            {projects.length > 1 && (
              <select
                value={activeProject?.id || ''}
                onChange={(e) => {
                  const project = projects.find(p => p.id === e.target.value);
                  if (project) setActiveProject(project);
                }}
                className="w-full sm:w-auto px-3 py-2 border border-border rounded-md bg-background text-xs md:text-sm"
              >
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            <Button
              variant={isGitHubConnected ? "default" : "outline"}
              size="sm"
              onClick={() => setShowGitHubDialog(true)}
              className="flex-1 sm:flex-none text-xs"
            >
              <Github className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden md:inline">{isGitHubConnected ? "GitHub: Sync" : "Connect GitHub"}</span>
              <span className="md:hidden">{isGitHubConnected ? "Sync" : "GitHub"}</span>
            </Button>
            
            {projects.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => createProject("New Project", "New project")}
                className="flex-1 sm:flex-none text-xs"
              >
                <Plus className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                New Project
              </Button>
            )}
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center space-y-4">
              <div className="text-muted-foreground">
                <p className="text-lg font-medium">No projects yet</p>
                <p className="text-sm">Create a project to get started</p>
              </div>
              <Button onClick={() => createProject("My Project", "New project")}>
                <Plus className="w-4 h-4 mr-2" />
                Create Project
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row h-[calc(100vh-180px)] sm:h-[calc(100vh-200px)] md:h-[calc(100vh-230px)] gap-2 md:gap-3">
            {/* Mobile: Toggle button */}
            {!isMobile && (
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden fixed top-20 left-4 z-30 bg-background border border-border shadow-md"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <Menu className="w-4 h-4" />
              </Button>
            )}

            {/* Mobile: Floating Files Button */}
            {isMobile && (
              <Button
                variant="default"
                size="sm"
                className="fixed bottom-4 left-4 z-30 shadow-lg rounded-full"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-4 h-4 mr-2" />
                Files
              </Button>
            )}

            {/* Mobile: Sidebar Sheet */}
            <Sheet open={sidebarOpen && isMobile} onOpenChange={setSidebarOpen}>
              <SheetContent side="left" className="w-full max-w-sm p-0">
                <FileTreeSidebar
                  files={files}
                  selectedFile={selectedFile}
                  onFileSelect={(file) => {
                    setSelectedFile(file);
                    if (isMobile) setSidebarOpen(false);
                  }}
                  onFileDelete={deleteFile}
                  onFileDownload={handleDownload}
                  onFileUpload={handleFileUpload}
                  projectId={activeProject?.id || null}
                  onVersionRestore={handleVersionRestore}
                  isOpen={true}
                  onClose={() => setSidebarOpen(false)}
                />
              </SheetContent>
            </Sheet>

            {/* Tablet/Desktop: Sidebar */}
            <div className={cn(
              "hidden lg:flex flex-shrink-0 transition-all duration-300",
              sidebarOpen ? "w-64" : "w-0"
            )}>
              <FileTreeSidebar
                files={files}
                selectedFile={selectedFile}
                onFileSelect={setSelectedFile}
                onFileDelete={deleteFile}
                onFileDownload={handleDownload}
                onFileUpload={handleFileUpload}
                projectId={activeProject?.id || null}
                onVersionRestore={handleVersionRestore}
                isOpen={sidebarOpen}
              />
            </div>

            {/* Chat + Preview - Fully Responsive */}
            <div className="flex-1 min-w-0 flex flex-col lg:grid lg:grid-cols-2 gap-2 md:gap-3">
              {/* Chat Section - Responsive */}
              <div className="h-[45vh] sm:h-[48vh] lg:h-auto border border-border rounded-lg overflow-hidden">
                <CodexChat
                  projectId={activeProject?.id || null}
                  onFilesCreated={refetchFiles}
                  onCodeGenerated={(code, language) => setPreviewCode({ code, language })}
                />
              </div>
              
              {/* Preview Section - Responsive */}
              <div className="h-[45vh] sm:h-[48vh] lg:h-auto border border-border rounded-lg overflow-hidden">
                <CodePreview
                  code={previewCode.code || selectedFile?.file_content || ""}
                  language={previewCode.language || selectedFile?.file_type || "html"}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <DownloadPaymentDialog
        open={showPaymentDialog}
        onClose={() => setShowPaymentDialog(false)}
        onProceed={handlePaymentProceed}
        amount={0.83}
      />

      <GitHubConnectDialog
        open={showGitHubDialog}
        onClose={() => setShowGitHubDialog(false)}
        onConnect={handleGitHubConnect}
        isConnected={isGitHubConnected}
        currentRepo={gitHubRepoUrl}
        projectId={activeProject?.id}
        files={files}
      />
    </div>
  );
}