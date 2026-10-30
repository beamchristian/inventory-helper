// src/components/DialogProvider.tsx
// App-wide replacements for window.alert / confirm / prompt, built on Modal.
// Each call returns a promise, so callers can simply `await` the answer:
//
//   const { confirm } = useDialog();
//   if (await confirm({ title: "Delete item?", destructive: true })) { ... }
"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface BaseOptions {
  title: string;
  message?: React.ReactNode;
}

export interface AlertOptions extends BaseOptions {
  okLabel?: string;
}

export interface ConfirmOptions extends BaseOptions {
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button red, for deleting or other irreversible actions. */
  destructive?: boolean;
}

export interface PromptOptions extends BaseOptions {
  label?: string;
  defaultValue?: string;
  inputType?: "text" | "number";
  /** Extra attributes for number inputs, e.g. step="1" min="0". */
  step?: string;
  min?: string;
  confirmLabel?: string;
  /** Return an error message to keep the dialog open, or null when valid. */
  validate?: (value: string) => string | null;
}

interface DialogApi {
  alert: (options: AlertOptions) => Promise<void>;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  /** Resolves with the entered text, or null if cancelled. */
  prompt: (options: PromptOptions) => Promise<string | null>;
}

type DialogRequest = { id: number } & (
  | { kind: "alert"; options: AlertOptions; resolve: () => void }
  | { kind: "confirm"; options: ConfirmOptions; resolve: (ok: boolean) => void }
  | {
      kind: "prompt";
      options: PromptOptions;
      resolve: (value: string | null) => void;
    }
);

// Distributes Omit over the union so each variant keeps its own fields
type NewDialogRequest = DialogRequest extends infer R
  ? R extends DialogRequest
    ? Omit<R, "id">
    : never
  : never;

const DialogContext = createContext<DialogApi | null>(null);

export function useDialog(): DialogApi {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error("useDialog must be used inside <DialogProvider>.");
  }
  return context;
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
  // Requests wait in line, so two dialogs never open on top of each other
  const [queue, setQueue] = useState<DialogRequest[]>([]);
  const current = queue[0];

  const nextId = useRef(0);
  const enqueue = useCallback((request: NewDialogRequest) => {
    const id = nextId.current++;
    setQueue((q) => [...q, { ...request, id } as DialogRequest]);
  }, []);

  const api = useMemo<DialogApi>(
    () => ({
      alert: (options) =>
        new Promise<void>((resolve) =>
          enqueue({ kind: "alert", options, resolve }),
        ),
      confirm: (options) =>
        new Promise<boolean>((resolve) =>
          enqueue({ kind: "confirm", options, resolve }),
        ),
      prompt: (options) =>
        new Promise<string | null>((resolve) =>
          enqueue({ kind: "prompt", options, resolve }),
        ),
    }),
    [enqueue],
  );

  // Answer the open dialog and move on to the next one in line
  const settle = useCallback(
    (answer: boolean | string | null) => {
      if (!current) return;
      if (current.kind === "alert") current.resolve();
      else if (current.kind === "confirm") current.resolve(answer === true);
      else current.resolve(typeof answer === "string" ? answer : null);
      setQueue((q) => q.slice(1));
    },
    [current],
  );

  return (
    <DialogContext.Provider value={api}>
      {children}
      {current && (
        // A fresh dialog (and empty prompt input) for each request
        <DialogView key={current.id} request={current} onSettle={settle} />
      )}
    </DialogContext.Provider>
  );
}

function DialogView({
  request,
  onSettle,
}: {
  request: DialogRequest;
  onSettle: (answer: boolean | string | null) => void;
}) {
  const { kind, options } = request;
  const primaryRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(
    kind === "prompt" ? (request.options.defaultValue ?? "") : "",
  );
  const [error, setError] = useState<string | null>(null);

  const isDestructive = kind === "confirm" && request.options.destructive;
  // Destructive confirms start on Cancel so Enter can't delete by accident
  const initialFocusRef =
    kind === "prompt" ? inputRef : isDestructive ? cancelRef : primaryRef;

  const cancelAnswer = kind === "confirm" ? false : null;

  const submitPrompt = () => {
    if (kind !== "prompt") return;
    const problem = request.options.validate?.(value) ?? null;
    if (problem) {
      setError(problem);
      inputRef.current?.focus();
      return;
    }
    onSettle(value);
  };

  return (
    <Modal
      isOpen
      onClose={() => onSettle(kind === "alert" ? null : cancelAnswer)}
      title={options.title}
      description={options.message}
      initialFocusRef={initialFocusRef}
    >
      {kind === "prompt" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitPrompt();
          }}
          className="space-y-4"
        >
          <div>
            {request.options.label && (
              <label
                htmlFor="dialog-prompt-input"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                {request.options.label}
              </label>
            )}
            <Input
              id="dialog-prompt-input"
              ref={inputRef}
              type={request.options.inputType ?? "text"}
              inputMode={
                request.options.inputType === "number" ? "decimal" : undefined
              }
              step={request.options.step}
              min={request.options.min}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
              }}
              aria-invalid={error ? true : undefined}
              aria-label={request.options.label ?? options.title}
            />
            {error && (
              <p className="mt-1.5 text-sm text-destructive">{error}</p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onSettle(null)}
            >
              Cancel
            </Button>
            <Button type="submit" ref={primaryRef}>
              {request.options.confirmLabel ?? "Save"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex justify-end gap-2">
          {kind === "confirm" && (
            <Button
              ref={cancelRef}
              variant="outline"
              onClick={() => onSettle(false)}
            >
              {request.options.cancelLabel ?? "Cancel"}
            </Button>
          )}
          <Button
            ref={primaryRef}
            variant={isDestructive ? "destructive" : "default"}
            onClick={() => onSettle(kind === "confirm" ? true : null)}
          >
            {kind === "confirm"
              ? (request.options.confirmLabel ?? "Confirm")
              : (request.options.okLabel ?? "OK")}
          </Button>
        </div>
      )}
    </Modal>
  );
}
