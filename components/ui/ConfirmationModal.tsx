import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  confirmButtonVariant?: 'primary' | 'secondary' | 'danger';
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmButtonText = 'Xóa',
  cancelButtonText = 'Hủy',
  confirmButtonVariant = 'danger',
}) => {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div>
        <p className="text-gray-300 mb-6">{message}</p>
        <div className="flex justify-end space-x-3">
          <Button variant="secondary" onClick={onClose}>
            {cancelButtonText}
          </Button>
          <Button variant={confirmButtonVariant} onClick={onConfirm}>
            {confirmButtonText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
