import { useState, useEffect } from "react";

interface AnonymousUsageData {
  messageCount: number;
  imageCount: number;
  lastResetDate: string;
}

const STORAGE_KEY = "khai_anonymous_usage";
const MESSAGE_LIMIT = 5; // Anonymous users get 5 messages
const IMAGE_LIMIT = 2; // Anonymous users get 2 images

export const useAnonymousUsage = () => {
  const [usage, setUsage] = useState<AnonymousUsageData>({
    messageCount: 0,
    imageCount: 0,
    lastResetDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadUsage();
  }, []);

  const loadUsage = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored) as AnonymousUsageData;
      const today = new Date().toISOString().split('T')[0];
      
      // Reset if it's a new day
      if (data.lastResetDate !== today) {
        const newData = {
          messageCount: 0,
          imageCount: 0,
          lastResetDate: today,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
        setUsage(newData);
      } else {
        setUsage(data);
      }
    }
  };

  const incrementMessageCount = () => {
    const today = new Date().toISOString().split('T')[0];
    const newUsage = {
      ...usage,
      messageCount: usage.messageCount + 1,
      lastResetDate: today,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newUsage));
    setUsage(newUsage);
    return newUsage.messageCount;
  };

  const incrementImageCount = () => {
    const today = new Date().toISOString().split('T')[0];
    const newUsage = {
      ...usage,
      imageCount: usage.imageCount + 1,
      lastResetDate: today,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newUsage));
    setUsage(newUsage);
    return newUsage.imageCount;
  };

  const hasMessageQuota = () => {
    return usage.messageCount < MESSAGE_LIMIT;
  };

  const hasImageQuota = () => {
    return usage.imageCount < IMAGE_LIMIT;
  };

  const getResetDate = () => {
    const resetDate = new Date();
    resetDate.setDate(resetDate.getDate() + 1);
    resetDate.setHours(0, 0, 0, 0);
    return resetDate;
  };

  return {
    usage,
    messageLimit: MESSAGE_LIMIT,
    imageLimit: IMAGE_LIMIT,
    remaining: Math.max(0, MESSAGE_LIMIT - usage.messageCount),
    imageRemaining: Math.max(0, IMAGE_LIMIT - usage.imageCount),
    incrementMessageCount,
    incrementImageCount,
    hasMessageQuota,
    hasImageQuota,
    resetDate: getResetDate(),
    refetch: loadUsage,
  };
};