-- Create voice sessions table
CREATE TABLE public.voice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  session_title TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  total_turns INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create voice recordings table (optional - for playback/review)
CREATE TABLE public.voice_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.voice_sessions(id) ON DELETE CASCADE NOT NULL,
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  audio_url TEXT,
  duration_seconds INTEGER,
  speaker TEXT CHECK (speaker IN ('user', 'assistant')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.voice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_recordings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for voice_sessions
CREATE POLICY "Users can view their own voice sessions"
  ON public.voice_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own voice sessions"
  ON public.voice_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own voice sessions"
  ON public.voice_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own voice sessions"
  ON public.voice_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for voice_recordings
CREATE POLICY "Users can view their own voice recordings"
  ON public.voice_recordings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.voice_sessions
      WHERE voice_sessions.id = voice_recordings.session_id
      AND voice_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own voice recordings"
  ON public.voice_recordings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.voice_sessions
      WHERE voice_sessions.id = voice_recordings.session_id
      AND voice_sessions.user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_voice_sessions_user_id ON public.voice_sessions(user_id);
CREATE INDEX idx_voice_sessions_conversation_id ON public.voice_sessions(conversation_id);
CREATE INDEX idx_voice_recordings_session_id ON public.voice_recordings(session_id);