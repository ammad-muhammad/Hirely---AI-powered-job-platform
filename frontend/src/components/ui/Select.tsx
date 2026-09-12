'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  label?: string;
  error?: string;
  helperText?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (e: { target: { value: string; name?: string } }) => void;
  name?: string;
  placeholder?: string;
  options?: SelectOption[];
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  id?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  helperText,
  value,
  defaultValue = '',
  onChange,
  name,
  placeholder = 'Select an option...',
  options: propOptions,
  children,
  className,
  disabled = false,
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [internalValue, setInternalValue] = useState<string>(value ?? defaultValue);
  const containerRef = useRef<HTMLDivElement>(null);

  // Synchronize value if controlled
  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
    }
  }, [value]);

  // Parse options from prop or JSX children (<option>)
  const parsedOptions: SelectOption[] = React.useMemo(() => {
    if (propOptions && propOptions.length > 0) {
      return propOptions;
    }
    const opts: SelectOption[] = [];
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child) && child.type === 'option') {
        const val = child.props.value !== undefined ? String(child.props.value) : String(child.props.children);
        const lbl = child.props.children ? String(child.props.children) : val;
        opts.push({ value: val, label: lbl });
      }
    });
    return opts;
  }, [propOptions, children]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const selectedOption = parsedOptions.find((opt) => opt.value === internalValue);

  const handleSelect = (optionValue: string) => {
    setInternalValue(optionValue);
    setIsOpen(false);
    if (onChange) {
      onChange({ target: { value: optionValue, name } });
    }
  };

  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={cn('w-full flex flex-col gap-1.5 font-sans relative', isOpen ? 'z-[9999]' : 'z-0')} ref={containerRef}>
      {label && (
        <label htmlFor={selectId} className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 tracking-wide">
          {label}
        </label>
      )}

      {/* Custom Styled Select Trigger Button */}
      <button
        id={selectId}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={cn(
          'w-full px-3.5 py-2.5 text-xs rounded-xl border transition-colors duration-150 focus:outline-none focus:ring-2 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 flex items-center justify-between shadow-subtle text-left select-none',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
          error
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20 text-red-900 dark:text-red-300'
            : 'border-zinc-300 dark:border-zinc-700 focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10',
          className
        )}
      >
        <span className={cn('truncate font-medium', !selectedOption && 'text-zinc-400 dark:text-zinc-500')}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0 transition-transform duration-150 ml-2',
            isOpen && 'rotate-180 text-zinc-900 dark:text-zinc-100'
          )}
        />
      </button>

      {/* Fully Styled Popover Options Menu */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1.5 z-[9999] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-modal overflow-hidden py-1 max-h-60 overflow-y-auto font-sans animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {parsedOptions.length === 0 ? (
            <div className="px-3.5 py-2.5 text-xs text-zinc-400">No options available</div>
          ) : (
            parsedOptions.map((opt) => {
              const isSelected = opt.value === internalValue;
              return (
                <div
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(opt.value)}
                  className={cn(
                    'px-3.5 py-2 text-xs font-medium cursor-pointer flex items-center justify-between transition-colors select-none',
                    isSelected
                      ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-100'
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100 shrink-0 ml-2" />}
                </div>
              );
            })
          )}
        </div>
      )}

      {error ? (
        <span className="text-xs font-medium text-red-600 dark:text-red-400">{error}</span>
      ) : helperText ? (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">{helperText}</span>
      ) : null}
    </div>
  );
};
