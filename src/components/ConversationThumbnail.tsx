import { FileIcon } from "lucide-react";

interface UploadedFile {
  id: string;
  file_name: string;
  file_type: string;
  metadata: {
    thumbnail?: string;
    isImage?: boolean;
  } | null;
}

interface Props {
  files: UploadedFile[];
  maxDisplay?: number;
  compact?: boolean;
}

export const ConversationThumbnail = ({ files, maxDisplay = 3, compact = false }: Props) => {
  if (!files || files.length === 0) return null;

  const displayFiles = files.slice(0, maxDisplay);
  const remainingCount = files.length - maxDisplay;
  const size = compact ? "w-6 h-6" : "w-12 h-12";
  const iconSize = compact ? "w-3 h-3" : "w-6 h-6";
  const textSize = compact ? "text-[8px]" : "text-xs";

  return (
    <div className={`flex gap-1 ${compact ? '' : 'mt-2'}`}>
      {displayFiles.map((file) => (
        <div
          key={file.id}
          className={`relative ${size} rounded border border-border overflow-hidden bg-muted/50`}
        >
          {file.metadata?.isImage && file.metadata?.thumbnail ? (
            <img
              src={file.metadata.thumbnail}
              alt={file.file_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FileIcon className={`${iconSize} text-muted-foreground`} />
            </div>
          )}
        </div>
      ))}
      {remainingCount > 0 && (
        <div className={`${size} rounded border border-border bg-muted/50 flex items-center justify-center ${textSize} text-muted-foreground`}>
          +{remainingCount}
        </div>
      )}
    </div>
  );
};
