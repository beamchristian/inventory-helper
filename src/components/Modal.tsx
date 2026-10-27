// src/components/Modal.tsx
import React, { useRef, useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close modal on escape key press
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    } else {
      document.removeEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  // Close modal if clicking outside the content
  const handleClickOutside = (event: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]'
      onClick={handleClickOutside}
    >
      <div
        ref={modalRef}
        className='relative w-full max-w-md rounded-lg border border-border bg-card p-6 text-card-foreground shadow-xl'
        role='dialog'
        aria-modal='true'
        aria-labelledby='modal-title'
      >
        <div className='mb-5 flex items-start justify-between gap-4'>
          <div>
            <h2
              id='modal-title'
              className='text-lg font-semibold text-foreground'
            >
              {title}
            </h2>
            {description && (
              <p className='mt-1 text-sm text-muted-foreground'>
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className='rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
            aria-label='Close modal'
          >
            <X className='size-4' />
          </button>
        </div>
        <div className='modal-content'>{children}</div>
      </div>
    </div>
  );
};

export default Modal;
