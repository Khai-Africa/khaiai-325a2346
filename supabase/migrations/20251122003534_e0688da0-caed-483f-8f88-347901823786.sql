-- Add attachments support to codex_chat_messages
ALTER TABLE codex_chat_messages 
ADD COLUMN attachments jsonb DEFAULT '[]'::jsonb;

-- Create index for faster queries on attachments
CREATE INDEX idx_codex_chat_messages_attachments 
ON codex_chat_messages USING gin (attachments);

COMMENT ON COLUMN codex_chat_messages.attachments IS 'Array of file attachments with metadata (type, url, name, size)';