import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingProps {
  className?: string;
  message?: string;
  fullPage?: boolean;
}

export function Loading({ className, message, fullPage = false }: LoadingProps) {
  if (fullPage) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        {message && (
          <p className="text-sm text-muted-foreground animate-pulse">
            {message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-center gap-2 py-4", className)}>
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
      {message && (
        <span className="text-sm text-muted-foreground">{message}</span>
      )}
    </div>
  );
}
