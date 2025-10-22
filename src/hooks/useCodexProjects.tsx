import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

interface CodexProject {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  github_repo_url?: string;
  github_branch: string;
  created_at: string;
  updated_at: string;
}

export const useCodexProjects = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<CodexProject[]>([]);
  const [activeProject, setActiveProject] = useState<CodexProject | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProjects = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('codex_projects')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      setProjects(data || []);
      if (data && data.length > 0 && !activeProject) {
        setActiveProject(data[0]);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (name: string, description?: string) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('codex_projects')
        .insert({
          user_id: user.id,
          name,
          description,
        })
        .select()
        .single();

      if (error) throw error;

      setProjects([data, ...projects]);
      setActiveProject(data);
      toast.success('Project created');
      return data;
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
      return null;
    }
  };

  const updateProject = async (id: string, updates: Partial<CodexProject>) => {
    try {
      const { error } = await supabase
        .from('codex_projects')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setProjects(projects.map(p => p.id === id ? { ...p, ...updates } : p));
      if (activeProject?.id === id) {
        setActiveProject({ ...activeProject, ...updates });
      }
      toast.success('Project updated');
    } catch (error) {
      console.error('Error updating project:', error);
      toast.error('Failed to update project');
    }
  };

  const deleteProject = async (id: string) => {
    try {
      const { error } = await supabase
        .from('codex_projects')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setProjects(projects.filter(p => p.id !== id));
      if (activeProject?.id === id) {
        setActiveProject(projects[0] || null);
      }
      toast.success('Project deleted');
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [user]);

  return {
    projects,
    activeProject,
    setActiveProject,
    loading,
    createProject,
    updateProject,
    deleteProject,
    refetch: fetchProjects,
  };
};