import { Loader2 } from "lucide-react";

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = "Loading..." }: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6">
        {/* Logo/Brand */}
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-lg">
            <span className="text-2xl font-bold text-primary-foreground">FI</span>
          </div>
        </div>

        {/* Loading indicator */}
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm font-medium text-muted-foreground">{message}</span>
        </div>

        {/* Progress bar */}
        <div className="h-1 w-48 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-full animate-shimmer bg-shimmer" style={{ backgroundSize: '200% 100%' }} />
        </div>
      </div>
    </div>
  );
}
