import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { cn } from "@/lib/utils";

interface MarkdownMessageProps {
  content: string;
  className?: string;
}

// Strip stray decorative asterisks while preserving valid markdown bold/italic.
// - Removes lines that are just ***/---/asterisk separators that aren't valid HR
// - Removes leftover single asterisks at start of lines used as bullets without space
// - Collapses runs of 3+ asterisks not used for bold/italic
function preprocess(raw: string): string {
  if (!raw) return raw;
  let text = raw;
  // Convert "* " bullet variants with stray surrounding asterisks like "**Item**:" left intact.
  // Remove lines that are pure asterisk decoration (e.g. "*****", "* * *")
  text = text.replace(/^\s*(?:\*\s*){3,}\s*$/gm, "");
  // Strip leading "* " bullets that some models emit with extra asterisks like "** "
  text = text.replace(/^\s*\*{2,}\s+/gm, "- ");
  // Replace standalone single "*" lines
  text = text.replace(/^\s*\*\s*$/gm, "");
  return text;
}

export const MarkdownMessage = ({ content, className }: MarkdownMessageProps) => {
  const cleaned = preprocess(content);
  return (
    <div
      className={cn(
        "prose prose-sm md:prose-base dark:prose-invert max-w-none",
        "prose-p:leading-relaxed prose-p:my-2",
        "prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2",
        "prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg",
        "prose-ul:my-2 prose-ol:my-2 prose-li:my-1",
        "prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none",
        "prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-xl prose-pre:p-4",
        "prose-a:text-primary prose-a:underline-offset-4 hover:prose-a:underline",
        "prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground",
        "prose-table:text-sm prose-th:border prose-th:border-border prose-th:px-3 prose-th:py-2 prose-td:border prose-td:border-border prose-td:px-3 prose-td:py-2",
        "prose-strong:text-foreground prose-strong:font-semibold",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          a: ({ node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
        }}
      >
        {cleaned}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownMessage;