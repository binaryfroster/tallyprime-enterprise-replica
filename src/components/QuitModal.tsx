import React, { useEffect } from 'react';

interface QuitModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const QuitModal: React.FC<QuitModalProps> = ({ isOpen, onConfirm, onCancel }) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'y' || e.key === 'Y' || e.key === 'Enter') {
        e.preventDefault();
        onConfirm();
      } else if (e.key === 'n' || e.key === 'N' || e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onConfirm, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="w-[340px] max-w-[95vw] bg-[#0c2733] border-2 border-[#fbbf24] shadow-2xl rounded-sm flex flex-col overflow-hidden font-mono text-xs">
        <div className="bg-[#fbbf24] text-[#0c2733] px-4 py-1.5 font-bold text-center text-sm">
          Quit?
        </div>
        <div className="p-6 text-center space-y-4 bg-[#081e28]">
          <div className="text-[#f1f5f9] font-medium text-sm">
            Yes or No?
          </div>
          <div className="flex justify-center gap-4">
            <button
              onClick={onConfirm}
              className="px-5 py-1.5 bg-[#0284c7] hover:bg-[#0396e3] text-white font-bold rounded-xs shadow transition cursor-pointer"
            >
              <u>Y</u>: Yes
            </button>
            <button
              onClick={onCancel}
              className="px-5 py-1.5 bg-[#173e4e] hover:bg-[#205267] text-[#d6e3e8] font-bold rounded-xs shadow transition cursor-pointer"
            >
              <u>N</u>: No
            </button>
          </div>
          <div className="text-[10px] text-[#7192a0]">
            Press Y or Enter to Confirm • Esc or N to Cancel
          </div>
        </div>
      </div>
    </div>
  );
};
