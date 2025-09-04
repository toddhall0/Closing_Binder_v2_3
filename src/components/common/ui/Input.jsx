import React, { forwardRef } from 'react';

export const Input = forwardRef(({ 
  label, 
  error, 
  className = '', 
  required = false,
  ...props 
}, ref) => {
  const inputClasses = `block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors ${
    error ? 'border-red-500 focus:ring-red-500' : ''
  } ${className}`;

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-900">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        ref={ref}
        className={inputClasses}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';