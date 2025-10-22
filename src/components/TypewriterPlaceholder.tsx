import { useState, useEffect } from "react";

const prompts = [
  "Ask Khai...",
  "Write code...",
  "Farm guide...",
  "Create image...",
  "How do I find...",
  "10% of 150...",
];

export const TypewriterPlaceholder = () => {
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [promptIndex, setPromptIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const fullPrompt = prompts[promptIndex];

      if (!isDeleting && charIndex < fullPrompt.length) {
        setCurrentPrompt(fullPrompt.substring(0, charIndex + 1));
        setCharIndex(charIndex + 1);
      } else if (!isDeleting && charIndex === fullPrompt.length) {
        setTimeout(() => setIsDeleting(true), 2000);
      } else if (isDeleting && charIndex > 0) {
        setCurrentPrompt(fullPrompt.substring(0, charIndex - 1));
        setCharIndex(charIndex - 1);
      } else if (isDeleting && charIndex === 0) {
        setIsDeleting(false);
        setPromptIndex((promptIndex + 1) % prompts.length);
      }
    }, isDeleting ? 50 : 100);

    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, promptIndex]);

  return <span className="text-muted-foreground">{currentPrompt}</span>;
};
