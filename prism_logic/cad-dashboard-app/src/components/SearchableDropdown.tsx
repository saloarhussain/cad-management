"use client";
import React, { useState, useEffect, useRef } from 'react';

interface Option {
  value: string;
  label: string;
}

interface SearchableDropdownProps {
  name: string;
  options: Option[];
  value?: string;
  placeholder: string;
  required?: boolean;
  onChange?: (value: string) => void;
  disabled?: boolean;
}

export default function SearchableDropdown({
  name,
  options,
  value = "",
  placeholder,
  required = false,
  onChange,
  disabled = false
}: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [prevValue, setPrevValue] = useState(value);
  const [selectedValue, setSelectedValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setSelectedValue(value);
  }

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      // Small timeout to ensure input is rendered before focus
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    option.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = options.find(opt => opt.value === selectedValue);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Hidden input for standard HTML form submission */}
      <input 
        type="hidden" 
        name={name} 
        value={selectedValue} 
        required={required} 
      />

      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          const nextOpen = !isOpen;
          setIsOpen(nextOpen);
          if (!nextOpen) {
            setSearchTerm("");
          }
        }}
        className="w-full bg-surface-container-lowest border border-transparent rounded p-3 text-left flex items-center justify-between transition-all duration-200 text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#fce003] disabled:opacity-50 disabled:cursor-not-allowed text-sm"
      >
        <span className={selectedValue ? "text-white truncate" : "text-stone-500 truncate"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className="material-symbols-outlined text-stone-500 select-none transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}>
          expand_more
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-[100] mt-1 w-full bg-[#1c1912] border border-white/10 rounded shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-2 border-b border-white/5">
            <div className="relative flex items-center">
              <span className="absolute left-2.5 material-symbols-outlined text-stone-500 text-sm select-none">
                search
              </span>
              <input
                ref={inputRef}
                type="text"
                placeholder="Type to search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-stone-950/60 border border-white/10 rounded py-2 pl-8 pr-8 text-xs text-white placeholder:text-stone-600 focus:outline-none focus:ring-1 focus:ring-[#fce003] focus:border-[#fce003] transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 flex items-center justify-center text-stone-500 hover:text-white"
                >
                  <span className="material-symbols-outlined text-xs select-none">
                    close
                  </span>
                </button>
              )}
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto custom-scrollbar py-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const isSelected = option.value === selectedValue;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setSelectedValue(option.value);
                      if (onChange) onChange(option.value);
                      setIsOpen(false);
                      setSearchTerm("");
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                      isSelected 
                        ? 'bg-[#fce003]/10 text-[#fce003] font-bold' 
                        : 'text-stone-300 hover:bg-[#fce003] hover:text-stone-950'
                    }`}
                  >
                    <span className="truncate flex-1 pr-2">{option.label}</span>
                    {isSelected && (
                      <span className="material-symbols-outlined text-xs text-[#fce003] select-none">
                        check
                      </span>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-4 text-center text-stone-600 text-[10px] uppercase tracking-widest select-none">
                No results found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
