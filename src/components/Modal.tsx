// src/components/Modal.tsx
import React, { useRef, useEffect } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
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
      className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'
      onClick={handleClickOutside}
    >
      <div
        ref={modalRef}
        className='bg-white rounded-lg shadow-xl max-w-lg w-full p-6 m-4 relative'
        role='dialog'
        aria-modal='true'
        aria-labelledby='modal-title'
      >
        <div className='flex justify-between items-center mb-4'>
          <h2 id='modal-title' className='text-2xl font-semibold text-gray-900'>
            {title}
          </h2>
          <button
            onClick={onClose}
            className='text-gray-500 hover:text-gray-700 text-3xl leading-none'
            aria-label='Close modal'
          >
            &times;
          </button>
        </div>
        <div className='modal-content'>{children}</div>
      </div>
    </div>
  );
};

export default Modal;
