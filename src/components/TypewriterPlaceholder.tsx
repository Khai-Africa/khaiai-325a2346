import { useState, useEffect } from "react";
import { useTranslation } from "@/hooks/useTranslation";

export const TypewriterPlaceholder = () => {
  const { t, language } = useTranslation();
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [promptIndex, setPromptIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const prompts = [
    t('typewriter.askKmer'),
    t('typewriter.writeCode'),
    t('typewriter.farmGuide'),
    t('typewriter.createImage'),
    t('typewriter.howToFind'),
    t('typewriter.calculate'),
  ];

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
  }, [charIndex, isDeleting, promptIndex, language]);

  return <span className="text-muted-foreground">{currentPrompt}</span>;
};
