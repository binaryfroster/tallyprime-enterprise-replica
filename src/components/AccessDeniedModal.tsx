import React, { useEffect } from 'react';

interface AccessDeniedModalProps {
  isOpen: boolean;
  reason?: string;
  onClose: () => void;
  onSwitchUser: () => void;
}

export const AccessDeniedModal: React.FC<AccessDeniedModalProps> = ({
  isOpen,
  reason,
  onClose,
  onSwitchUser,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="w-[480px] max-w-[95vw] bg-[#0c2733] border-2 border-[#ef4444] shadow-2xl rounded-sm flex flex-col overflow-hidden font-mono text-xs">
        {/* Header */}
        <div className="bg-[#b91c1c] text-white px-4 py-2 font-bold flex justify-between items-center text-sm">
          <span>Security Alert: Access Denied</span>
          <span className="text-xs font-normal">[Esc]</span>
        </div>

        <div className="p-5 space-y-4 bg-[#081e28]">
          <div className="flex items-start gap-3 bg-[#2a1318] border border-[#7f1d1d] p-3 rounded-xs text-[#fecaca]">
            <span className="text-xl">⛔</span>
            <div className="space-y-1">
              <div className="font-bold text-sm text-[#f87171]">
                Insufficient Privileges
              </div>
              <div className="text-xs">
                {reason || 'You do not have permission to access this screen or perform this operation.'}
              </div>
            </div>
          </div>

          <div className="text-[11px] text-[#7192a0] bg-[#0c242e] p-2.5 border border-[#173e4f] rounded-xs space-y-1">
            <div className="font-bold text-[#fbbf24]">Tally Security Policy:</div>
            <div>• To access management reports or alter masters, log in with an Administrator profile.</div>
            <div>• To alter back-dated transactions, contact your Company Security Administrator.</div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#1b4b5e]">
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-[#173e4e] hover:bg-[#205267] text-[#d6e3e8] font-semibold rounded-xs cursor-pointer"
            >
              Esc: Dismiss
            </button>
            <button
              onClick={() => {
                onClose();
                onSwitchUser();
              }}
              className="px-5 py-1.5 bg-[#0284c7] hover:bg-[#0396e3] text-white font-bold rounded-xs cursor-pointer shadow"
            >
              Switch User (Alt+K)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
