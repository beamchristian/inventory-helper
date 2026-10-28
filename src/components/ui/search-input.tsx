import * as React from "react";
import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface SearchInputProps
  extends Omit<React.ComponentProps<"input">, "value" | "onChange"> {
  value: string;
  onValueChange: (value: string) => void;
}

// Text input with a search icon and a button to clear it
export function SearchInput({
  value,
  onValueChange,
  className,
  placeholder = "Search…",
  ...props
}: SearchInputProps) {
  return (
    <div className={cn("relative", className)}>
      <Search className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
      <Input
        type='search'
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && onValueChange("")}
        placeholder={placeholder}
        aria-label={placeholder}
        className='pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden'
        {...props}
      />
      {value && (
        <button
          type='button'
          onClick={() => onValueChange("")}
          className='absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground'
          aria-label='Clear search'
        >
          <X className='size-3.5' />
        </button>
      )}
    </div>
  );
}
