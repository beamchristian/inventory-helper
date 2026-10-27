import * as React from "react";

import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className='min-w-0'>
        <h1 className='truncate text-2xl font-semibold tracking-tight text-foreground'>
          {title}
        </h1>
        {description && (
          <div className='mt-1 text-sm text-muted-foreground'>
            {description}
          </div>
        )}
      </div>
      {actions && (
        <div className='flex shrink-0 flex-wrap items-center gap-2'>
          {actions}
        </div>
      )}
    </div>
  );
}

// Standard page width and padding wrapper
export function PageContainer({
  className,
  ...props
}: React.ComponentProps<"main">) {
  return (
    <main
      className={cn("mx-auto w-full max-w-6xl px-4 py-8 sm:px-6", className)}
      {...props}
    />
  );
}
