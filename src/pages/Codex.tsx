import { useState, useEffect } from "react";
import { CodexHeader } from "@/components/codex/CodexHeader";
import { CodexPromptInput } from "@/components/codex/CodexPromptInput";
import { FileTree } from "@/components/codex/FileTree";
import { CodeEditor } from "@/components/codex/CodeEditor";
import { TaskList } from "@/components/codex/TaskList";
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
import { Plus, Crown, Github } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent } from "@/components/ui/sheet";

export default function Codex() {
  const navigate = useNavigate();
  const { user, session, loading: authLoading } = useAuth();
  const { isPremium, canDownload, freeDownloadsRemaining, refetch: refetchUsage } = useCodexUsage();
  const { projects, activeProject, createProject, setActiveProject } = useCodexProjects();
  const { files, uploadFile, updateFile, deleteFile, refetch: refetchFiles } = useCodexFiles(activeProject?.id || null);
  
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [previewCode, setPreviewCode] = useState({ code: "", language: "html" });
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [pendingDownloadFileId, setPendingDownloadFileId] = useState<string | null>(null);
  const [showGitHubDialog, setShowGitHubDialog] = useState(false);
  const [gitHubRepoUrl, setGitHubRepoUrl] = useState<string>("");
  const [isGitHubConnected, setIsGitHubConnected] = useState(false);
  const [mobileEditorOpen, setMobileEditorOpen] = useState(false);

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


  // Load tasks for active project
  useEffect(() => {
    const loadTasks = async () => {
      if (!activeProject?.id) return;
      
      try {
        const { data: tasksData } = await supabase
          .from('codex_tasks')
          .select('*')
          .eq('project_id', activeProject.id)
          .order('created_at', { ascending: false })
          .limit(10);
        
        setTasks(tasksData || []);
      } catch (error) {
        console.error('Error loading tasks:', error);
      }
    };

    loadTasks();
  }, [activeProject?.id]);

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

  const handlePromptSubmit = async (prompt: string, mode: 'ask' | 'code') => {
    // Ensure we have a project before proceeding
    let project = activeProject;
    if (!project) {
      project = await createProject("My Project", "Auto-created project");
      if (!project) {
        toast.error("Failed to create project");
        return;
      }
    }

    setLoading(true);
    try {
      const functionName = mode === 'ask' ? 'codex-analyze-code' : 'codex-generate-code';
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          prompt,
          files: mode === 'ask' ? files : [],
          context: mode === 'code' ? files.map((f: any) => f.file_content).join('\n\n') : null,
          projectId: project.id, // Use the guaranteed project ID
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw error;

      // If code was generated, save it as a file
      if (mode === 'code' && data?.code) {
        const timestamp = new Date().getTime();
        const fileName = `generated_${timestamp}.txt`;
        
        const { error: fileError } = await supabase
          .from('codex_files')
          .insert({
            user_id: user!.id,
            project_id: project.id,
            file_name: fileName,
            file_path: `/${fileName}`,
            file_type: 'text',
            file_content: data.code,
            file_size: new Blob([data.code]).size,
          });

        if (fileError) {
          console.error('Error saving generated code:', fileError);
          toast.error('Code generated but failed to save as file');
        } else {
          toast.success('Code generated and saved');
          // Refresh the files list to show the new file
          refetchFiles();
        }
      } else if (mode === 'ask') {
        toast.success('Analysis complete');
      }
      
      // Fetch updated tasks and files
      const { data: tasksData } = await supabase
        .from('codex_tasks')
        .select('*')
        .eq('project_id', project.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      setTasks(tasksData || []);
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to process request');
    } finally {
      setLoading(false);
    }
  };

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
            <CodexPromptInput
              onSubmit={handlePromptSubmit}
              onFileUpload={handleFileUpload}
              loading={loading}
            />
          </div>
        ) : (
          <Tabs defaultValue="chat" className="flex-1">
            <TabsList className="w-full grid grid-cols-3 h-auto">
              <TabsTrigger value="chat" className="text-xs md:text-sm">Chat + Preview</TabsTrigger>
              <TabsTrigger value="editor" className="text-xs md:text-sm">Editor</TabsTrigger>
              <TabsTrigger value="tasks" className="text-xs md:text-sm">Tasks</TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="mt-3 md:mt-4">
              <div className="flex flex-col lg:grid lg:grid-cols-2 gap-3 md:gap-4 h-[calc(100vh-200px)] md:h-[calc(100vh-230px)]">
                <div className="border border-border rounded-lg h-[50vh] lg:h-full overflow-hidden">
                  <CodexChat 
                    projectId={activeProject?.id || null} 
                    onFilesCreated={refetchFiles}
                    onCodeGenerated={(code, language) => setPreviewCode({ code, language })}
                  />
                </div>
                <div className="h-[50vh] lg:h-full overflow-hidden">
                  <CodePreview 
                    code={previewCode.code || selectedFile?.file_content || ""} 
                    language={previewCode.language || selectedFile?.file_type || "html"} 
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="editor" className="flex-1 mt-3 md:mt-4">
              {/* Desktop Layout */}
              <div className="hidden lg:grid lg:grid-cols-12 gap-3 md:gap-4 h-[calc(100vh-250px)]">
                <div className="lg:col-span-3 h-full">
                  <FileTree
                    files={files}
                    selectedFile={selectedFile}
                    onFileSelect={setSelectedFile}
                    onFileDelete={deleteFile}
                    onFileDownload={handleDownload}
                  />
                </div>
                <div className="lg:col-span-9 h-full">
                  <CodeEditor
                    file={selectedFile}
                    onSave={updateFile}
                    onDownload={handleDownload}
                  />
                </div>
              </div>

              {/* Mobile Layout */}
              <div className="lg:hidden">
                <FileTree
                  files={files}
                  selectedFile={selectedFile}
                  onFileSelect={(file) => {
                    setSelectedFile(file);
                    setMobileEditorOpen(true);
                  }}
                  onFileDelete={deleteFile}
                  onFileDownload={handleDownload}
                />
                
                <Sheet open={mobileEditorOpen} onOpenChange={setMobileEditorOpen}>
                  <SheetContent side="bottom" className="h-[85vh] p-0">
                    <CodeEditor
                      file={selectedFile}
                      onSave={updateFile}
                      onDownload={handleDownload}
                    />
                  </SheetContent>
                </Sheet>
              </div>
            </TabsContent>

            <TabsContent value="tasks" className="mt-3 md:mt-4">
              <TaskList tasks={tasks} />
            </TabsContent>
          </Tabs>
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