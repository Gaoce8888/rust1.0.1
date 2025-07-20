import React, { useState, useRef, useEffect } from 'react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

const Select = ({
  options = [],
  value,
  onChange,
  placeholder = 'Select an option',
  label,
  helperText,
  error = false,
  errorMessage,
  disabled = false,
  searchable = false,
  clearable = false,
  multiple = false,
  size = 'medium',
  fullWidth = false,
  required = false,
  className,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const selectRef = useRef(null);
  const inputRef = useRef(null);
  
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (selectRef.current && !selectRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const sizes = {
    small: 'px-3 py-1.5 text-sm',
    medium: 'px-4 py-2 text-base',
    large: 'px-5 py-3 text-lg'
  };
  
  const filteredOptions = searchable
    ? options.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;
  
  const getSelectedLabel = () => {
    if (multiple) {
      if (!value || value.length === 0) return placeholder;
      const selectedLabels = options
        .filter(opt => value.includes(opt.value))
        .map(opt => opt.label);
      return selectedLabels.join(', ');
    } else {
      const selected = options.find(opt => opt.value === value);
      return selected ? selected.label : placeholder;
    }
  };
  
  const handleSelect = (optionValue) => {
    if (multiple) {
      const newValue = value?.includes(optionValue)
        ? value.filter(v => v !== optionValue)
        : [...(value || []), optionValue];
      onChange(newValue);
    } else {
      onChange(optionValue);
      setIsOpen(false);
    }
    setSearchTerm('');
  };
  
  const handleClear = (e) => {
    e.stopPropagation();
    onChange(multiple ? [] : null);
  };
  
  const baseStyles = 'relative bg-white border rounded-lg transition-all duration-200 cursor-pointer';
  
  const selectClasses = twMerge(
    baseStyles,
    sizes[size],
    'flex items-center justify-between',
    error ? 'border-red-500 focus-within:ring-2 focus-within:ring-red-500/20' : 'border-gray-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20',
    disabled && 'opacity-50 cursor-not-allowed bg-gray-50',
    fullWidth && 'w-full',
    className
  );
  
  const dropdownClasses = clsx(
    'absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg',
    'max-h-60 overflow-auto',
    isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none',
    'transition-all duration-200 origin-top'
  );
  
  const labelClasses = twMerge(
    'block mb-1 text-sm font-medium text-gray-700',
    error && 'text-red-600'
  );
  
  const helperTextClasses = twMerge(
    'mt-1 text-sm',
    error ? 'text-red-600' : 'text-gray-500'
  );
  
  const optionClasses = (isSelected) => clsx(
    'px-4 py-2 cursor-pointer transition-colors',
    'hover:bg-gray-100',
    isSelected && 'bg-blue-50 text-blue-600'
  );
  
  const isSelected = (optionValue) => {
    return multiple ? value?.includes(optionValue) : value === optionValue;
  };
  
  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <label className={labelClasses}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div ref={selectRef} className="relative">
        <div
          className={selectClasses}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          {...props}
        >
          <span className={clsx(
            'flex-1 truncate',
            !value && 'text-gray-400'
          )}>
            {getSelectedLabel()}
          </span>
          
          <div className="flex items-center ml-2 space-x-1">
            {clearable && value && !disabled && (
              <button
                onClick={handleClear}
                className="p-1 hover:bg-gray-100 rounded"
                aria-label="Clear selection"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            
            <svg
              className={clsx(
                'w-5 h-5 text-gray-400 transition-transform',
                isOpen && 'rotate-180'
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        
        <div className={dropdownClasses}>
          {searchable && (
            <div className="p-2 border-b border-gray-200">
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
          
          <div className="py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-2 text-sm text-gray-500">No options found</div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  className={optionClasses(isSelected(option.value))}
                  onClick={() => handleSelect(option.value)}
                >
                  {multiple && (
                    <input
                      type="checkbox"
                      checked={isSelected(option.value)}
                      onChange={() => {}}
                      className="mr-2"
                    />
                  )}
                  {option.label}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      {(helperText || errorMessage) && (
        <p className={helperTextClasses}>
          {error ? errorMessage : helperText}
        </p>
      )}
    </div>
  );
};

export default Select;