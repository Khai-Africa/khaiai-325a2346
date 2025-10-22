import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  project_id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export const useCodexChat = (projectId: string | null) => {
  const { user, session } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!user || !projectId) return;

    try {
      const { data, error } = await supabase
        .from('codex_chat_messages')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data || []) as ChatMessage[]);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load chat history');
    }
  }, [user, projectId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const sendMessage = async (content: string) => {
    if (!user || !projectId || !session) return;

    setLoading(true);
    setStreaming(true);

    try {
      // Add user message immediately
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        project_id: projectId,
        user_id: user.id,
        role: 'user',
        content,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, userMessage]);

      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/codex-chat`;
      
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ message: content, projectId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let assistantContent = '';
      let assistantMessageId = crypto.randomUUID();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            
            if (delta) {
              assistantContent += delta;
              
              // Update or create assistant message
              setMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg?.role === 'assistant' && lastMsg.id === assistantMessageId) {
                  return prev.map(msg => 
                    msg.id === assistantMessageId 
                      ? { ...msg, content: assistantContent }
                      : msg
                  );
                }
                return [...prev, {
                  id: assistantMessageId,
                  project_id: projectId,
                  user_id: user.id,
                  role: 'assistant' as const,
                  content: assistantContent,
                  created_at: new Date().toISOString(),
                }];
              });
            }
          } catch (e) {
            // Incomplete JSON, buffer it
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Save assistant message to database
      if (assistantContent) {
        await supabase
          .from('codex_chat_messages')
          .insert({
            project_id: projectId,
            user_id: user.id,
            role: 'assistant',
            content: assistantContent,
          });
      }

    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error(error.message || 'Failed to send message');
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  };

  const clearChat = async () => {
    if (!projectId) return;

    try {
      const { error } = await supabase
        .from('codex_chat_messages')
        .delete()
        .eq('project_id', projectId);

      if (error) throw error;

      setMessages([]);
      toast.success('Chat cleared');
    } catch (error) {
      console.error('Error clearing chat:', error);
      toast.error('Failed to clear chat');
    }
  };

  return {
    messages,
    loading,
    streaming,
    sendMessage,
    clearChat,
    refetch: fetchMessages,
  };
};
