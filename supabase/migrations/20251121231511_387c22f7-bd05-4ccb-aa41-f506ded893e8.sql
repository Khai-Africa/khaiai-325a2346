-- Add foreign key relationship between uploaded_files and conversations
ALTER TABLE uploaded_files
ADD CONSTRAINT uploaded_files_conversation_id_fkey 
FOREIGN KEY (conversation_id) 
REFERENCES conversations(id) 
ON DELETE CASCADE;