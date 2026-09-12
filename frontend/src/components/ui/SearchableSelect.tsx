'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  subLabel?: string;
  icon?: React.ReactNode;
}

interface SearchableSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
  position?: 'bottom' | 'top' | 'auto';
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  searchPlaceholder = 'Search...',
  className = '',
  disabled = false,
  position = 'bottom',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  const filteredOptions = options.filter(
    (o) =>
      o.label.toLowerCase().includes(search.toLowerCase()) ||
      (o.subLabel && o.subLabel.toLowerCase().includes(search.toLowerCase())) ||
      o.value.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const positionClasses =
    position === 'top'
      ? 'bottom-full mb-1.5'
      : 'top-full mt-1.5';

  return (
    <div ref={containerRef} className={`relative inline-block w-full ${isOpen ? 'z-40' : 'z-10'} ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 flex items-center justify-between gap-2 focus:outline-none focus:ring-1 focus:ring-zinc-800 dark:focus:ring-zinc-200 transition-all ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-zinc-400 dark:hover:border-zinc-600'
        }`}
      >
        <span className="truncate flex items-center gap-1.5 font-medium">
          {selectedOption ? (
            <>
              {selectedOption.icon && <span>{selectedOption.icon}</span>}
              <span>{selectedOption.label}</span>
              {selectedOption.subLabel && (
                <span className="text-zinc-400 text-[11px]">({selectedOption.subLabel})</span>
              )}
            </>
          ) : (
            <span className="text-zinc-400">{placeholder}</span>
          )}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className={`absolute z-50 left-0 ${positionClasses} w-full min-w-[200px] max-h-60 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-modal overflow-hidden flex flex-col font-sans`}
        >
          {/* Search Box */}
          <div className="p-2 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center gap-1.5 shrink-0">
            <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0 ml-1" />
            <input
              type="text"
              autoFocus
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none placeholder:text-zinc-400"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="p-1 hover:text-zinc-900 text-zinc-400">
                ×
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="overflow-y-auto max-h-48 divide-y divide-zinc-50 dark:divide-zinc-800/50 no-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-zinc-400">No matching options found</div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`w-full px-3 py-2 text-xs flex items-center justify-between gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left ${
                      isSelected ? 'bg-zinc-50 dark:bg-zinc-800/80 font-bold text-zinc-900 dark:text-zinc-100' : 'text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      {opt.icon && <span>{opt.icon}</span>}
                      <span className="truncate">{opt.label}</span>
                      {opt.subLabel && <span className="text-[10px] text-zinc-400 font-normal">({opt.subLabel})</span>}
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
