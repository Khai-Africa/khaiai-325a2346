import { Skeleton } from "@/components/ui/skeleton";

export const ChatSkeleton = () => {
  return (
    <div className="max-w-3xl mx-auto space-y-8 p-4 md:p-6 animate-in fade-in duration-500">
      {/* User message skeleton */}
      <div className="flex justify-end">
        <div className="bg-card border border-border rounded-3xl px-5 py-3 max-w-[70%]">
          <Skeleton className="h-4 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      {/* AI message skeleton */}
      <div className="flex gap-3 md:gap-4">
        <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-4 w-full max-w-md" />
          <Skeleton className="h-4 w-full max-w-lg" />
          <Skeleton className="h-4 w-3/4 max-w-sm" />
        </div>
      </div>

      {/* User message skeleton */}
      <div className="flex justify-end">
        <div className="bg-card border border-border rounded-3xl px-5 py-3 max-w-[60%]">
          <Skeleton className="h-4 w-36" />
        </div>
      </div>

      {/* AI message skeleton */}
      <div className="flex gap-3 md:gap-4">
        <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-4 w-full max-w-lg" />
          <Skeleton className="h-4 w-full max-w-md" />
          <Skeleton className="h-4 w-1/2 max-w-xs" />
          <Skeleton className="h-4 w-2/3 max-w-sm" />
        </div>
      </div>

      {/* User message skeleton */}
      <div className="flex justify-end">
        <div className="bg-card border border-border rounded-3xl px-5 py-3 max-w-[65%]">
          <Skeleton className="h-4 w-40 mb-2" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>

      {/* AI message skeleton */}
      <div className="flex gap-3 md:gap-4">
        <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-4 w-full max-w-md" />
          <Skeleton className="h-4 w-5/6 max-w-lg" />
        </div>
      </div>
    </div>
  );
};
