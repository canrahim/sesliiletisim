import React from 'react';
import clsx from 'clsx';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, type = 'text', ...props }, ref) => {
    const inputId = React.useId();

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          type={type}
          className={clsx(
            'w-full px-4 py-2 border rounded-lg bg-white dark:bg-dark-800 text-dark-900 dark:text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:border-transparent transition-colors',
            error
              ? 'border-red-500 focus:ring-red-500'
              : 'border-dark-300 dark:border-dark-700 focus:ring-primary-500',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-dark-500 dark:text-dark-400">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
