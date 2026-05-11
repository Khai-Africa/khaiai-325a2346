import { useEffect, useRef, useState } from "react";
import { ExternalLink, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface MessagePart {
  type: "text" | "image_url";
  text?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string | MessagePart[];
}

interface QuickLink {
  title: string;
  description: string;
  url: string;
  source?: string;
}

interface RelatedLinksPanelProps {
  messages: Message[];
  isLoading: boolean;
  className?: string;
}

function getText(m: Message): string {
  if (typeof m.content === "string") return m.content;
  if (Array.isArray(m.content)) {
    return m.content.filter((p) => p?.type === "text").map((p) => p.text || "").join(" ");
  }
  return "";
}

function fingerprint(messages: Message[]): string {
  const tail = messages.slice(-6).map((m) => `${m.role}:${getText(m).slice(0, 200)}`).join("|");
  return tail;
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export const RelatedLinksPanel = ({ messages, isLoading, className }: RelatedLinksPanelProps) => {
  const [links, setLinks] = useState<QuickLink[]>([]);
  const [fetching, setFetching] = useState(false);
  const lastFingerprintRef = useRef<string>("");
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    // Only refresh when conversation has at least 1 user msg + 1 assistant msg, and AI is not generating.
    if (isLoading) return;
    const hasAssistant = messages.some((m) => m.role === "assistant" && getText(m).trim().length > 0);
    if (!hasAssistant) {
      setLinks([]);
      lastFingerprintRef.current = "";
      return;
    }
    const fp = fingerprint(messages);
    if (fp === lastFingerprintRef.current) return;

    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      lastFingerprintRef.current = fp;
      setFetching(true);
      try {
        const trimmed = messages.slice(-6).map((m) => ({ role: m.role, content: getText(m) }));
        const { data, error } = await supabase.functions.invoke("related-links", {
          body: { messages: trimmed },
        });
        if (error) throw error;
        const next: QuickLink[] = Array.isArray(data?.links) ? data.links.slice(0, 4) : [];
        setLinks(next);
      } catch (e) {
        console.warn("related-links failed", e);
      } finally {
        setFetching(false);
      }
    }, 800);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [messages, isLoading]);

  const showEmpty = !fetching && links.length === 0;

  return (
    <aside
      className={cn(
        "w-80 shrink-0 border-l border-border bg-card/30 backdrop-blur-sm overflow-y-auto",
        className,
      )}
      aria-label="Related quick links"
    >
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-primary flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Quick links</h2>
            <p className="text-xs text-muted-foreground">Top resources for this chat</p>
          </div>
          {fetching && <Loader2 className="w-4 h-4 ml-auto animate-spin text-muted-foreground" />}
        </div>

        {showEmpty ? (
          <p className="text-xs text-muted-foreground leading-relaxed">
            Ask Khai a question and curated quick links will appear here based on your conversation.
          </p>
        ) : (
          <ul className="space-y-3">
            {(fetching && links.length === 0
              ? Array.from({ length: 4 }).map((_, i) => ({ skeleton: true, i }))
              : links.map((l, i) => ({ skeleton: false, i, ...l }))
            ).map((item: any) => (
              <li key={item.i}>
                {item.skeleton ? (
                  <div className="rounded-2xl border border-border bg-background/40 p-3 animate-pulse space-y-2">
                    <div className="h-3 w-3/4 bg-muted rounded" />
                    <div className="h-2 w-full bg-muted rounded" />
                    <div className="h-2 w-2/3 bg-muted rounded" />
                  </div>
                ) : (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block rounded-2xl border border-border bg-background/60 hover:bg-background hover:border-foreground/30 transition-colors p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-medium text-foreground leading-snug line-clamp-2">
                        {item.title}
                      </h3>
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground shrink-0 mt-0.5" />
                    </div>
                    {item.description && (
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-3">
                        {item.description}
                      </p>
                    )}
                    <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground/80">
                      {item.source || hostnameOf(item.url)}
                    </p>
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
};

export default RelatedLinksPanel;