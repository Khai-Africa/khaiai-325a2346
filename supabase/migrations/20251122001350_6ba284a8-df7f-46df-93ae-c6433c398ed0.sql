-- Create codex_file_versions table for version history
CREATE TABLE codex_file_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid REFERENCES codex_files(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES codex_projects(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  file_content text NOT NULL,
  file_name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(file_id, version_number)
);

-- Enable RLS
ALTER TABLE codex_file_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own file versions"
  ON codex_file_versions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create file versions"
  ON codex_file_versions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_codex_file_versions_file_id ON codex_file_versions(file_id);
CREATE INDEX idx_codex_file_versions_created_at ON codex_file_versions(created_at DESC);
CREATE INDEX idx_codex_file_versions_project_id ON codex_file_versions(project_id);