import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface MessagePart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

interface StoredMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string | MessagePart[];
  timestamp: string;
}

interface StoredConversation {
  id: string;
  title: string;
  messages: StoredMessage[];
  updatedAt: string;
}

const STORAGE_KEY = 'khai_anonymous_conversations';
const MAX_CONVERSATIONS = 10;

export const useAnonymousConversations = () => {
  const [conversations, setConversations] = useState<StoredConversation[]>([]);

  // Load conversations from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as StoredConversation[];
        setConversations(parsed);
      }
    } catch (error) {
      console.error('Failed to load anonymous conversations:', error);
    }
  }, []);

  // Save conversations to localStorage
  const saveToStorage = useCallback((convs: StoredConversation[]) => {
    try {
      // Keep only last MAX_CONVERSATIONS
      const trimmed = convs.slice(0, MAX_CONVERSATIONS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      setConversations(trimmed);
    } catch (error) {
      console.error('Failed to save anonymous conversations:', error);
    }
  }, []);

  // Save or update a conversation
  const saveConversation = useCallback((
    conversationId: string,
    messages: StoredMessage[],
    title?: string
  ) => {
    setConversations(prev => {
      const existingIndex = prev.findIndex(c => c.id === conversationId);
      const firstUserMsg = messages.find(m => m.role === 'user');
      const msgContent = firstUserMsg?.content;
      const titleFromContent = typeof msgContent === 'string' 
        ? msgContent.slice(0, 50) 
        : Array.isArray(msgContent) 
          ? msgContent.find(p => p.type === 'text')?.text?.slice(0, 50) || 'New conversation'
          : 'New conversation';
      
      const newConv: StoredConversation = {
        id: conversationId,
        title: title || titleFromContent,
        messages,
        updatedAt: new Date().toISOString(),
      };

      let updated: StoredConversation[];
      if (existingIndex >= 0) {
        updated = [...prev];
        updated[existingIndex] = newConv;
        // Move to top
        updated.unshift(updated.splice(existingIndex, 1)[0]);
      } else {
        updated = [newConv, ...prev];
      }

      saveToStorage(updated);
      return updated;
    });
  }, [saveToStorage]);

  // Load a specific conversation
  const loadConversation = useCallback((conversationId: string): StoredConversation | null => {
    return conversations.find(c => c.id === conversationId) || null;
  }, [conversations]);

  // Delete a conversation
  const deleteConversation = useCallback((conversationId: string) => {
    setConversations(prev => {
      const updated = prev.filter(c => c.id !== conversationId);
      saveToStorage(updated);
      return updated;
    });
  }, [saveToStorage]);

  // Clear all conversations
  const clearAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setConversations([]);
  }, []);

  // Export conversations as JSON file
  const exportConversations = useCallback(() => {
    try {
      const dataStr = JSON.stringify(conversations, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `khai-conversations-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Conversations exported successfully');
    } catch (error) {
      console.error('Failed to export conversations:', error);
      toast.error('Failed to export conversations');
    }
  }, [conversations]);

  // Import conversations from JSON file
  const importConversations = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const imported = JSON.parse(content) as StoredConversation[];
        
        // Validate structure
        if (!Array.isArray(imported)) {
          throw new Error('Invalid file format');
        }
        
        // Merge with existing (avoid duplicates by ID)
        setConversations(prev => {
          const existingIds = new Set(prev.map(c => c.id));
          const newConvs = imported.filter(c => !existingIds.has(c.id));
          const merged = [...newConvs, ...prev].slice(0, MAX_CONVERSATIONS);
          saveToStorage(merged);
          return merged;
        });
        
        toast.success(`Imported ${imported.length} conversations`);
      } catch (error) {
        console.error('Failed to import conversations:', error);
        toast.error('Failed to import conversations. Invalid file format.');
      }
    };
    reader.readAsText(file);
  }, [saveToStorage]);

  return {
    conversations,
    saveConversation,
    loadConversation,
    deleteConversation,
    clearAll,
    exportConversations,
    importConversations,
  };
};

export type { StoredConversation, StoredMessage };
