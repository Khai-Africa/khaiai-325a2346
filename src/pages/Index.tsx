import { useState, useEffect } from "react";
import Hero from "@/components/Hero";
import ChatInterface from "@/components/ChatInterface";
import { InstallPrompt } from "@/components/InstallPrompt";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSearchParams } from "react-router-dom";

const Index = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showChat, setShowChat] = useState(false);
  const [skipLanding, setSkipLanding] = useState(false);
  const [initialMessage, setInitialMessage] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Check if user has conversations on mount or chat param is present
  useEffect(() => {
    const chatParam = searchParams.get("chat");
    const conversationParam = searchParams.get("conversation");
    
    if (chatParam === "true") {
      setShowChat(true);
      setSkipLanding(true);
      return;
    }
    
    if (conversationParam) {
      setConversationId(conversationParam);
      setShowChat(true);
      setSkipLanding(true);
      return;
    }
    
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
  }, [user, searchParams]);

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
