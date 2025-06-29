// src/components/PaginationControls.tsx
"use client";

import React, { useState, useEffect } from "react";

// Define the props the component will accept
interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  onItemsPerPageChange: (value: number) => void;
  // Change props to accept React Nodes (JSX) instead of strings
  prevButtonContent?: React.ReactNode;
  nextButtonContent?: React.ReactNode;
  noun?: string;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  onItemsPerPageChange,
  // Update the default props to be JSX
  prevButtonContent = <> &larr; Previous</>,
  nextButtonContent = <>Next &rarr; </>,
  noun = "Page",
}) => {
  const [pageNumberInput, setPageNumberInput] = useState(String(currentPage));

  useEffect(() => {
    setPageNumberInput(String(currentPage));
  }, [currentPage]);

  const handlePageJump = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const pageNum = parseInt(pageNumberInput, 10);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
        onPageChange(pageNum);
      } else {
        // Reset to current page if input is invalid
        setPageNumberInput(String(currentPage));
      }
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  // Do not render the controls if there's only one page or less.
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className='mt-8 flex flex-col sm:flex-row justify-between items-center gap-4 pt-6'>
      {/* Previous Button */}
      <button
        onClick={handlePreviousPage}
        disabled={currentPage === 1}
        className='w-full sm:w-auto bg-accent hover:bg-accent/80 text-text-inverse font-bold py-2 px-4 rounded shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
      >
        {prevButtonContent}
      </button>

      {/* Page Info and Jumper */}
      <div className='flex items-center justify-center gap-2 text-lg font-medium text-foreground'>
        <span>{noun}</span>
        <input
          type='text'
          value={pageNumberInput}
          onChange={(e) => setPageNumberInput(e.target.value)}
          onKeyDown={handlePageJump}
          className='w-14 text-center p-2 border border-border-base rounded shadow-sm bg-background-surface text-text-base focus:outline-none focus:ring-2 focus:ring-primary'
          aria-label={`Current ${noun.toLowerCase()}, enter a number to jump to`}
        />
        <span className='text-text-muted'>of {totalPages}</span>
      </div>

      {/* Next Button */}
      <button
        onClick={handleNextPage}
        disabled={currentPage === totalPages}
        className='w-full sm:w-auto bg-accent hover:bg-accent/80 text-text-inverse font-bold py-2 px-4 rounded shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
      >
        {nextButtonContent}
      </button>

      {/* Items per page selector - moved to the side for better layout */}
      <div className='flex items-center gap-2'>
        <label
          htmlFor='itemsPerPage'
          className='text-text-base text-sm font-medium'
        >
          Items/Page:
        </label>
        <select
          id='itemsPerPage'
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          className='border border-border-base rounded py-1 px-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary'
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
      </div>
    </div>
  );
};
