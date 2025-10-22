import { useState } from "react";
import Hero from "@/components/Hero";
import ChatInterface from "@/components/ChatInterface";
import { InstallPrompt } from "@/components/InstallPrompt";

const Index = () => {
  const [showChat, setShowChat] = useState(false);
  const [initialMessage, setInitialMessage] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);

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
          setShowChat(false);
          setInitialMessage("");
          setConversationId(null);
        }}
        initialMessage={initialMessage}
        conversationId={conversationId}
        onSelectConversation={handleSelectConversation}
      />
    );
  }

  return (
    <Hero 
      onStartChat={() => setShowChat(true)}
      onSuggestionSelect={handleSuggestionSelect}
    />
  );
};

export default Index;
