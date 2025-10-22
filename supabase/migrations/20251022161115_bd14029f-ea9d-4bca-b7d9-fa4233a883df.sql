-- Create codex_chat_messages table for storing chat conversations
CREATE TABLE IF NOT EXISTS public.codex_chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.codex_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.codex_chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own chat messages"
  ON public.codex_chat_messages
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chat messages"
  ON public.codex_chat_messages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat messages"
  ON public.codex_chat_messages
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_codex_chat_messages_updated_at
  BEFORE UPDATE ON public.codex_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_codex_chat_messages_project_id ON public.codex_chat_messages(project_id);
CREATE INDEX idx_codex_chat_messages_user_id ON public.codex_chat_messages(user_id);
CREATE INDEX idx_codex_chat_messages_created_at ON public.codex_chat_messages(created_at DESC);