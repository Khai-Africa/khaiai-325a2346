-- Create codex_projects table
CREATE TABLE public.codex_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  github_repo_url TEXT,
  github_branch TEXT DEFAULT 'main',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create codex_files table
CREATE TABLE public.codex_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.codex_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_content TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  is_modified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create codex_tasks table
CREATE TABLE public.codex_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.codex_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  lines_added INTEGER DEFAULT 0,
  lines_removed INTEGER DEFAULT 0,
  affected_files JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create codex_downloads table
CREATE TABLE public.codex_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.codex_projects(id) ON DELETE CASCADE,
  file_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  download_type TEXT NOT NULL,
  amount_charged NUMERIC DEFAULT 0,
  currency TEXT NOT NULL,
  payment_provider TEXT NOT NULL,
  payment_reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_codex_usage table
CREATE TABLE public.user_codex_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  free_downloads_used INTEGER DEFAULT 0,
  total_downloads INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.codex_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.codex_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.codex_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.codex_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_codex_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for codex_projects
CREATE POLICY "Users can view their own projects"
  ON public.codex_projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects"
  ON public.codex_projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON public.codex_projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON public.codex_projects FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for codex_files
CREATE POLICY "Users can view their own files"
  ON public.codex_files FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own files"
  ON public.codex_files FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own files"
  ON public.codex_files FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own files"
  ON public.codex_files FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for codex_tasks
CREATE POLICY "Users can view their own tasks"
  ON public.codex_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tasks"
  ON public.codex_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
  ON public.codex_tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
  ON public.codex_tasks FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for codex_downloads
CREATE POLICY "Users can view their own downloads"
  ON public.codex_downloads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own downloads"
  ON public.codex_downloads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_codex_usage
CREATE POLICY "Users can view their own usage"
  ON public.user_codex_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage"
  ON public.user_codex_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage"
  ON public.user_codex_usage FOR UPDATE
  USING (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_codex_projects_updated_at
  BEFORE UPDATE ON public.codex_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_codex_files_updated_at
  BEFORE UPDATE ON public.codex_files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_codex_usage_updated_at
  BEFORE UPDATE ON public.user_codex_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();