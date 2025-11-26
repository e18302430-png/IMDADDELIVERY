import React from 'react';
import { useTranslation } from '../hooks/useTranslation';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  confirmButtonColor?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmButtonText,
  cancelButtonText,
  confirmButtonColor = 'bg-red-600 hover:bg-red-700',
}) => {
  const { t } = useTranslation();

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50"
      onClick={onClose}
    >
      <div
        className="glass-card p-8 w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-4 text-center text-yellow-400">
          <i className="fas fa-exclamation-triangle ltr:mr-2 rtl:ml-2"></i>
          {title}
        </h2>
        <p className="text-gray-300 mb-6 text-center">{message}</p>
        <div className="flex justify-center ltr:space-x-4 rtl:space-x-reverse rtl:space-x-4">
          <button
            onClick={onClose}
            className="py-2 px-6 text-sm font-medium text-gray-300 bg-gray-600/50 rounded-lg hover:bg-gray-700/50 border border-gray-600"
          >
            {cancelButtonText || t('cancel')}
          </button>
          <button
            onClick={onConfirm}
            className={`py-2 px-6 text-sm font-medium text-white rounded-lg ${confirmButtonColor}`}
          >
            {confirmButtonText || t('confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;