import { useState, useEffect } from "react";

export const AITypewriter = () => {
  const [text, setText] = useState("AI");
  const [index, setIndex] = useState(0);
  const words = ["AI", "Agent"];

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIndex((prev) => (prev + 1) % words.length);
      setText(words[(index + 1) % words.length]);
    }, 3000);

    return () => clearTimeout(timeout);
  }, [index]);

  return <span className="inline-block min-w-[80px]">{text}</span>;
};
