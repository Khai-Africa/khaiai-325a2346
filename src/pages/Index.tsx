import { useState } from "react";
import Hero from "@/components/Hero";
import ChatInterface from "@/components/ChatInterface";

const Index = () => {
  const [showChat, setShowChat] = useState(false);
  const [initialMessage, setInitialMessage] = useState("");

  const handleSuggestionSelect = (suggestion: string) => {
    setInitialMessage(suggestion);
  };

  if (showChat) {
    return (
      <ChatInterface 
        onBack={() => {
          setShowChat(false);
          setInitialMessage("");
        }}
        initialMessage={initialMessage}
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
