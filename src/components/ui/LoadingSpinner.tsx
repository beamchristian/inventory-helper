import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

export const LoadingSpinner: React.FC<{ className?: string }> = ({
  className,
}) => (
  <div className={cn("flex h-20 items-center justify-center", className)}>
    <Loader2 className='size-6 animate-spin text-muted-foreground' />
  </div>
);
