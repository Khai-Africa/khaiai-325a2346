import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import "highlight.js/styles/github-dark.css";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

  const handleHeadingClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest("a.heading-anchor") as HTMLAnchorElement | null;
    if (!anchor) return;
    e.preventDefault();
    const id = anchor.getAttribute("href")?.replace(/^#/, "");
    if (!id) return;
    const url = `${window.location.origin}${window.location.pathname}${window.location.search}#${id}`;
    navigator.clipboard
      .writeText(url)
      .then(() => toast.success("Link copied to clipboard"))
      .catch(() => toast.error("Failed to copy link"));
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
  };

  return (
    <div
      onClick={handleHeadingClick}
      className={cn(
        "prose prose-sm md:prose-base dark:prose-invert max-w-none",
        "text-foreground",
        "prose-p:text-foreground prose-li:text-foreground prose-ul:text-foreground prose-ol:text-foreground",
        "prose-p:leading-relaxed prose-p:my-2",
        "prose-headings:text-foreground prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2",
        "prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg",
        "prose-ul:my-2 prose-ol:my-2 prose-li:my-1",
        "prose-code:text-foreground prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-medium prose-code:before:content-none prose-code:after:content-none",
        "prose-pre:text-foreground prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-xl prose-pre:p-4 [&_pre_code]:text-foreground [&_pre_code]:bg-transparent [&_pre_code]:p-0",
        "prose-a:text-foreground prose-a:font-medium prose-a:underline prose-a:decoration-foreground/40 prose-a:underline-offset-4 hover:prose-a:decoration-foreground",
        "prose-blockquote:text-foreground prose-blockquote:bg-muted/40 prose-blockquote:border-l-4 prose-blockquote:border-l-foreground/30 prose-blockquote:rounded-r-lg prose-blockquote:px-4 prose-blockquote:py-2 prose-blockquote:not-italic [&_blockquote_p]:text-foreground",
        "prose-table:text-sm prose-th:text-foreground prose-th:border prose-th:border-border prose-th:px-3 prose-th:py-2 prose-td:text-foreground prose-td:border prose-td:border-border prose-td:px-3 prose-td:py-2",
        "prose-strong:text-foreground prose-strong:font-semibold prose-em:text-foreground",
        "[&_h1,&_h2,&_h3,&_h4,&_h5,&_h6]:scroll-mt-20 [&_h1,&_h2,&_h3,&_h4,&_h5,&_h6]:group",
        "[&_a.heading-anchor]:ml-2 [&_a.heading-anchor]:text-muted-foreground [&_a.heading-anchor]:no-underline [&_a.heading-anchor]:opacity-0 [&_a.heading-anchor]:transition-opacity [&_h1:hover_a.heading-anchor]:opacity-100 [&_h2:hover_a.heading-anchor]:opacity-100 [&_h3:hover_a.heading-anchor]:opacity-100 [&_h4:hover_a.heading-anchor]:opacity-100 [&_h5:hover_a.heading-anchor]:opacity-100 [&_h6:hover_a.heading-anchor]:opacity-100 hover:[&_a.heading-anchor]:text-foreground",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          rehypeHighlight,
          rehypeSlug,
          [
            rehypeAutolinkHeadings,
            {
              behavior: "append",
              properties: {
                className: ["heading-anchor"],
                ariaLabel: "Copy link to section",
                title: "Copy link to section",
              },
              content: { type: "text", value: "#" },
            },
          ],
        ]}
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