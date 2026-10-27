"use client";

import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";

// Define the props the component will accept
interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  onItemsPerPageChange: (value: number) => void;
  prevButtonContent?: React.ReactNode;
  nextButtonContent?: React.ReactNode;
  noun?: string;
  showItemsPerPage?: boolean; // <-- ADDED: New prop to control visibility
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  onItemsPerPageChange,
  prevButtonContent = (
    <>
      <ChevronLeft /> Previous
    </>
  ),
  nextButtonContent = (
    <>
      Next <ChevronRight />
    </>
  ),
  noun = "Page",
  showItemsPerPage = true, // <-- ADDED: Default to true for backward compatibility
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

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className='flex flex-col items-center justify-between gap-3 border-t border-border px-5 py-3 sm:flex-row'>
      {/* Items per page selector is optional */}
      {showItemsPerPage ? (
        <div className='flex items-center gap-2 text-sm text-muted-foreground'>
          <label htmlFor='itemsPerPage'>Rows per page</label>
          <Select
            id='itemsPerPage'
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            className='h-8 w-auto'
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </Select>
        </div>
      ) : (
        <div className='hidden sm:block' />
      )}

      <div className='flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end'>
        <Button
          variant='outline'
          size='sm'
          onClick={handlePreviousPage}
          disabled={currentPage === 1}
        >
          {prevButtonContent}
        </Button>

        {/* Page Info and Jumper */}
        <div className='flex items-center gap-2 text-sm text-muted-foreground'>
          <span>{noun}</span>
          <Input
            type='text'
            inputMode='numeric'
            value={pageNumberInput}
            onChange={(e) => setPageNumberInput(e.target.value)}
            onKeyDown={handlePageJump}
            className='h-8 w-12 px-1 text-center'
            aria-label={`Current ${noun.toLowerCase()}, enter a number to jump to`}
          />
          <span>of {totalPages}</span>
        </div>

        <Button
          variant='outline'
          size='sm'
          onClick={handleNextPage}
          disabled={currentPage === totalPages}
        >
          {nextButtonContent}
        </Button>
      </div>
    </div>
  );
};
