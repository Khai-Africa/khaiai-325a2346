-- Create table for generated images
CREATE TABLE IF NOT EXISTS public.generated_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  image_data text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.generated_images ENABLE ROW LEVEL SECURITY;

-- Users can view their own images
CREATE POLICY "Users can view their own images"
ON public.generated_images
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own images
CREATE POLICY "Users can insert their own images"
ON public.generated_images
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own images
CREATE POLICY "Users can delete their own images"
ON public.generated_images
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_generated_images_user ON public.generated_images(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_conversation ON public.generated_images(conversation_id);

-- Add image generation count to usage tracking
ALTER TABLE public.user_usage ADD COLUMN IF NOT EXISTS image_count integer NOT NULL DEFAULT 0;