// src/hooks/useDebouncedValue.ts
"use client";
import { useEffect, useState } from "react";

/**
 * Returns `value` once it has stopped changing for `delay` ms.
 * Used to avoid a server request on every keystroke while searching.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
