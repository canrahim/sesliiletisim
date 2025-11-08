import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}

export const Select: React.FC<SelectProps> = ({ value, onValueChange, children }) => {
  const [open, setOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  // Find the selected item's label
  let selectedLabel: React.ReactNode = 'Seçiniz...';
  const items: Array<{ value: string; label: React.ReactNode }> = [];

  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child)) {
      if (child.type === SelectContent) {
        React.Children.forEach(child.props.children, (item) => {
          if (React.isValidElement(item) && item.props.value !== undefined) {
            items.push({ value: item.props.value, label: item.props.children });
            if (item.props.value === value) {
              selectedLabel = item.props.children;
            }
          }
        });
      }
    }
  });

  return (
    <div ref={selectRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-4 py-2.5 text-sm text-left bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 hover:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
      >
        <span className="text-neutral-700 font-medium">{selectedLabel}</span>
        <ChevronDown className={`w-4 h-4 ml-2 text-neutral-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-neutral-200 rounded-lg shadow-lg max-h-60 overflow-auto">
          {items.map((item, idx) => {
            const isSelected = item.value === value;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  onValueChange(item.value);
                  setOpen(false);
                }}
                className={`w-full px-4 py-2.5 text-sm text-left flex items-center justify-between hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors ${
                  isSelected ? 'bg-blue-50 text-blue-700 font-medium' : 'text-neutral-700'
                }`}
              >
                <span>{item.label}</span>
                {isSelected && <Check className="w-4 h-4 text-blue-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface SelectTriggerProps {
  id?: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const SelectTrigger: React.FC<SelectTriggerProps> = ({ children }) => {
  return <>{children}</>;
};

interface SelectValueProps {
  placeholder?: string;
}

export const SelectValue: React.FC<SelectValueProps> = () => {
  return null;
};

interface SelectContentProps {
  children: React.ReactNode;
}

export const SelectContent: React.FC<SelectContentProps> = ({ children }) => {
  return <>{children}</>;
};

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  onClick?: () => void;
}

export const SelectItem: React.FC<SelectItemProps> = ({ children }) => {
  return <>{children}</>;
};
