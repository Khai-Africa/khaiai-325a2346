import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

interface FileVersion {
  id: string;
  file_id: string;
  user_id: string;
  project_id: string;
  version_number: number;
  file_content: string;
  file_name: string;
  description: string | null;
  created_at: string;
}

export const useFileVersions = (fileId: string | null, projectId: string | null) => {
  const { user } = useAuth();
  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchVersions = async () => {
    if (!user || !fileId) {
      setVersions([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('codex_file_versions')
        .select('*')
        .eq('file_id', fileId)
        .order('version_number', { ascending: false })
        .limit(10);

      if (error) throw error;
      setVersions(data || []);
    } catch (error) {
      console.error('Error fetching versions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVersions();
  }, [fileId, user]);

  const createVersion = async (
    fileId: string,
    fileContent: string,
    fileName: string,
    description?: string
  ) => {
    if (!user || !projectId) return null;

    try {
      // Get the latest version number
      const { data: latestVersion } = await supabase
        .from('codex_file_versions')
        .select('version_number')
        .eq('file_id', fileId)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextVersionNumber = (latestVersion?.version_number || 0) + 1;

      const { data, error } = await supabase
        .from('codex_file_versions')
        .insert({
          file_id: fileId,
          user_id: user.id,
          project_id: projectId,
          version_number: nextVersionNumber,
          file_content: fileContent,
          file_name: fileName,
          description: description || `Version ${nextVersionNumber}`,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchVersions();
      return data;
    } catch (error) {
      console.error('Error creating version:', error);
      toast.error('Failed to create version');
      return null;
    }
  };

  const restoreVersion = async (version: FileVersion, currentFileContent: string) => {
    if (!user) return false;

    try {
      // Create a backup version before restoring
      await createVersion(
        version.file_id,
        currentFileContent,
        version.file_name,
        'Backup before restore'
      );

      // Update the current file with the restored content
      const { error } = await supabase
        .from('codex_files')
        .update({
          file_content: version.file_content,
          is_modified: true,
        })
        .eq('id', version.file_id);

      if (error) throw error;

      toast.success(`Restored to version ${version.version_number}`);
      return true;
    } catch (error) {
      console.error('Error restoring version:', error);
      toast.error('Failed to restore version');
      return false;
    }
  };

  return {
    versions,
    loading,
    createVersion,
    restoreVersion,
    refetch: fetchVersions,
  };
};
