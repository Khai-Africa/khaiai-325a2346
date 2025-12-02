import { useState, useEffect, useCallback } from 'react';

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
      const newConv: StoredConversation = {
        id: conversationId,
        title: title || messages[0]?.content?.toString().slice(0, 50) || 'New conversation',
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

  return {
    conversations,
    saveConversation,
    loadConversation,
    deleteConversation,
    clearAll,
  };
};
