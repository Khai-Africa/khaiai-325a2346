import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

interface CodexFile {
  id: string;
  project_id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_content: string;
  file_type: string;
  file_size: number;
  is_modified: boolean;
  created_at: string;
  updated_at: string;
}

export const useCodexFiles = (projectId: string | null) => {
  const { user } = useAuth();
  const [files, setFiles] = useState<CodexFile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFiles = async () => {
    if (!user || !projectId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('codex_files')
        .select('*')
        .eq('project_id', projectId)
        .order('file_path');

      if (error) throw error;

      setFiles(data || []);
    } catch (error) {
      console.error('Error fetching files:', error);
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file: File, projectId: string) => {
    if (!user) return null;

    try {
      const content = await file.text();
      const fileType = file.name.split('.').pop() || 'txt';

      const { data, error } = await supabase
        .from('codex_files')
        .insert({
          project_id: projectId,
          user_id: user.id,
          file_name: file.name,
          file_path: file.name,
          file_content: content,
          file_type: fileType,
          file_size: file.size,
        })
        .select()
        .single();

      if (error) throw error;

      setFiles([...files, data]);
      toast.success('File uploaded');
      return data;
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
      return null;
    }
  };

  const updateFile = async (id: string, content: string) => {
    try {
      const { error } = await supabase
        .from('codex_files')
        .update({ 
          file_content: content,
          is_modified: true,
        })
        .eq('id', id);

      if (error) throw error;

      setFiles(files.map(f => f.id === id ? { ...f, file_content: content, is_modified: true } : f));
      toast.success('File saved');
    } catch (error) {
      console.error('Error updating file:', error);
      toast.error('Failed to save file');
    }
  };

  const deleteFile = async (id: string) => {
    try {
      const { error } = await supabase
        .from('codex_files')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setFiles(files.filter(f => f.id !== id));
      toast.success('File deleted');
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [user, projectId]);

  return {
    files,
    loading,
    uploadFile,
    updateFile,
    deleteFile,
    refetch: fetchFiles,
  };
};