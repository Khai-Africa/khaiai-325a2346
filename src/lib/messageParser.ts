export interface MessageSegment {
  type: 'text' | 'code';
  content: string;
  language?: string;
}

export function parseMessageContent(content: string): MessageSegment[] {
  const segments: MessageSegment[] = [];
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      const textContent = content.slice(lastIndex, match.index).trim();
      if (textContent) {
        segments.push({
          type: 'text',
          content: textContent,
        });
      }
    }

    // Add code block
    segments.push({
      type: 'code',
      content: match[2].trim(),
      language: match[1] || 'text',
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last code block
  if (lastIndex < content.length) {
    const textContent = content.slice(lastIndex).trim();
    if (textContent) {
      segments.push({
        type: 'text',
        content: textContent,
      });
    }
  }

  // If no code blocks found, return content as text
  if (segments.length === 0) {
    segments.push({
      type: 'text',
      content: content,
    });
  }

  return segments;
}
