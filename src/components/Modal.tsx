// src/components/Modal.tsx
"use client";

import React, { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  /** Set to false to block Escape, outside clicks and the X (e.g. while saving). */
  dismissible?: boolean;
  /** Element to focus when the modal opens; defaults to the first field or button. */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Open modals, newest last. Only the top one reacts to Escape and Tab, and the
// page stays scroll-locked until the last one closes.
const openModals: string[] = [];

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  dismissible = true,
  initialFocusRef,
}) => {
  const id = useId();
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const pressStartedOnOverlay = useRef(false);

  // Keep the latest callbacks without re-running the open/close effect
  const onCloseRef = useRef(onClose);
  const dismissibleRef = useRef(dismissible);
  useEffect(() => {
    onCloseRef.current = onClose;
    dismissibleRef.current = dismissible;
  });

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    openModals.push(id);
    document.body.style.overflow = "hidden";

    // Move focus into the dialog: the requested element, else the first
    // field/button in the content, else the dialog itself.
    const focusTarget =
      initialFocusRef?.current ??
      contentRef.current?.querySelector<HTMLElement>(FOCUSABLE) ??
      modalRef.current;
    focusTarget?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (openModals[openModals.length - 1] !== id) return;

      if (event.key === "Escape" && dismissibleRef.current) {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      // Keep Tab / Shift+Tab inside the dialog
      if (event.key === "Tab" && modalRef.current) {
        const focusable = Array.from(
          modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
        ).filter((el) => el.tabIndex >= 0);
        if (focusable.length === 0) {
          event.preventDefault();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      openModals.splice(openModals.indexOf(id), 1);
      if (openModals.length === 0) document.body.style.overflow = "";
      // Return focus to whatever opened the modal
      previouslyFocused?.focus?.();
    };
    // initialFocusRef is read once when the modal opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, id]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
      // Close only when the click both starts and ends on the backdrop, so
      // dragging a text selection out of an input doesn't close the modal.
      onMouseDown={(e) => {
        pressStartedOnOverlay.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (
          pressStartedOnOverlay.current &&
          e.target === e.currentTarget &&
          dismissible
        ) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="relative w-full max-w-md rounded-lg border border-border bg-card p-6 text-card-foreground shadow-xl outline-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-foreground">
              {title}
            </h2>
            {description && (
              <div
                id={descriptionId}
                className="mt-1 text-sm text-muted-foreground"
              >
                {description}
              </div>
            )}
          </div>
          {dismissible && (
            <button
              type="button"
              onClick={onClose}
              tabIndex={-1}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <div ref={contentRef}>{children}</div>
      </div>
    </div>,
    document.body,
  );
};

export default Modal;
