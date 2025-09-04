// src/components/projects/ConfirmationDialog.jsx
import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';



export const ConfirmationDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false
}) => {
  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="space-y-6">
        {/* Icon */}
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-gray-100 rounded-full">
          <svg 
            className="w-6 h-6 text-gray-600" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
            />
          </svg>
        </div>

        {/* Content */}
        <div className="text-center space-y-2">
          <h3 className="text-lg font-medium text-gray-900">
            {title}
          </h3>
          <p className="text-sm text-gray-600">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex space-x-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            variant={variant}
            className="flex-1"
            onClick={handleConfirm}
            loading={loading}
            disabled={loading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};