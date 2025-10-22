import { useState, useEffect } from "react";
import Hero from "@/components/Hero";
import ChatInterface from "@/components/ChatInterface";
import { InstallPrompt } from "@/components/InstallPrompt";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { user } = useAuth();
  const [showChat, setShowChat] = useState(false);
  const [skipLanding, setSkipLanding] = useState(false);
  const [initialMessage, setInitialMessage] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Check if user has conversations on mount
  useEffect(() => {
    const checkConversations = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from("conversations")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);
      
      if (!error && data && data.length > 0) {
        setSkipLanding(true);
        setShowChat(true);
      }
    };
    
    checkConversations();
  }, [user]);

  const handleSuggestionSelect = (suggestion: string) => {
    setInitialMessage(suggestion);
  };

  const handleSelectConversation = (convId: string) => {
    setConversationId(convId);
    setShowChat(true);
    setInitialMessage("");
  };

  if (showChat) {
    return (
      <ChatInterface 
        onBack={() => {
          // Go to new chat instead of landing page if user has seen landing
          if (skipLanding) {
            setConversationId(null);
            setInitialMessage("");
          } else {
            setShowChat(false);
            setInitialMessage("");
            setConversationId(null);
          }
        }}
        initialMessage={initialMessage}
        conversationId={conversationId}
        onSelectConversation={handleSelectConversation}
      />
    );
  }

  return (
    <Hero 
      onStartChat={() => {
        setShowChat(true);
        setSkipLanding(true);
      }}
      onSuggestionSelect={handleSuggestionSelect}
    />
  );
};

export default Index;
