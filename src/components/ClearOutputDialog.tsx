
import React from 'react';
import { Trash2 } from 'lucide-react';

interface ClearOutputDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ClearOutputDialog: React.FC<ClearOutputDialogProps> = ({
  isOpen,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="lyric-surface border lyric-border border-opacity-30 rounded-2xl p-6 max-w-md w-full">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900">
            <Trash2 size={20} className="text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-bold">Clear All Output</h2>
        </div>
        
        <p className="text-sm opacity-80 mb-6 leading-relaxed">
          This will clear all AI-generated output from your workspace, but keep your current settings, 
          prompt sets, and stage configurations untouched. Are you sure?
        </p>
        
        <div className="flex space-x-3">
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            Clear Output
          </button>
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 lyric-surface border lyric-border border-opacity-30 rounded-lg hover:lyric-highlight-bg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
