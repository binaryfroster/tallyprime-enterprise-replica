import React, { useEffect } from 'react';

interface FeaturesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FeaturesModal: React.FC<FeaturesModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || (e.ctrlKey && (e.key === 'a' || e.key === 'A'))) {
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
      <div className="w-[620px] max-w-[95vw] max-h-[90vh] bg-[#0c2733] border-2 border-[#fbbf24] shadow-2xl rounded-sm flex flex-col overflow-hidden font-mono text-xs">
        <div className="bg-[#fbbf24] text-[#0c2733] px-4 py-2 font-bold flex justify-between items-center text-sm">
          <span>Company Features Configuration</span>
          <span className="text-[11px] font-normal">[F11: Features]</span>
        </div>

        <div className="p-5 space-y-4 bg-[#081e28] overflow-y-auto">
          {/* Accounting Section */}
          <div className="space-y-2 border-b border-[#1b4b5e] pb-3">
            <div className="text-[#fbbf24] font-bold text-xs uppercase tracking-wide">
              I. Accounting Features
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[11px]">
              <div className="flex justify-between items-center text-[#cbd5e1]">
                <span>Maintain Accounts:</span>
                <span className="font-bold text-[#10b981]">Yes</span>
              </div>
              <div className="flex justify-between items-center text-[#cbd5e1]">
                <span>Maintain Bill-by-Bill:</span>
                <span className="font-bold text-[#10b981]">Yes</span>
              </div>
              <div className="flex justify-between items-center text-[#cbd5e1]">
                <span>Enable Cost Centres:</span>
                <span className="font-bold text-[#10b981]">Yes</span>
              </div>
              <div className="flex justify-between items-center text-[#cbd5e1]">
                <span>Enable Interest Calculation:</span>
                <span className="font-bold text-[#10b981]">Yes</span>
              </div>
            </div>
          </div>

          {/* Inventory Section */}
          <div className="space-y-2 border-b border-[#1b4b5e] pb-3">
            <div className="text-[#fbbf24] font-bold text-xs uppercase tracking-wide">
              II. Inventory Features
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[11px]">
              <div className="flex justify-between items-center text-[#cbd5e1]">
                <span>Integrate Accounts with Inventory:</span>
                <span className="font-bold text-[#10b981]">Yes</span>
              </div>
              <div className="flex justify-between items-center text-[#cbd5e1]">
                <span>Enable Multiple Godowns:</span>
                <span className="font-bold text-[#10b981]">Yes</span>
              </div>
              <div className="flex justify-between items-center text-[#cbd5e1]">
                <span>Enable Batches & Expiry Dates:</span>
                <span className="font-bold text-[#10b981]">Yes</span>
              </div>
              <div className="flex justify-between items-center text-[#cbd5e1]">
                <span>Separate Actual & Billed Qty:</span>
                <span className="font-bold text-[#10b981]">Yes</span>
              </div>
            </div>
          </div>

          {/* Taxation Section */}
          <div className="space-y-2 border-b border-[#1b4b5e] pb-3">
            <div className="text-[#fbbf24] font-bold text-xs uppercase tracking-wide">
              III. Taxation & Compliance Features
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[11px]">
              <div className="flex justify-between items-center text-[#cbd5e1]">
                <span>Enable Goods and Services Tax (GST):</span>
                <span className="font-bold text-[#10b981]">Yes</span>
              </div>
              <div className="flex justify-between items-center text-[#cbd5e1]">
                <span>Enable Tax Deducted at Source (TDS):</span>
                <span className="font-bold text-[#10b981]">Yes</span>
              </div>
              <div className="flex justify-between items-center text-[#cbd5e1]">
                <span>MCA Section 134(5) Audit Trail:</span>
                <span className="font-bold text-[#10b981]">Mandatory (Locked)</span>
              </div>
              <div className="flex justify-between items-center text-[#cbd5e1]">
                <span>Auto Bank Reconciliation (BRS):</span>
                <span className="font-bold text-[#10b981]">Enabled</span>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-[#7192a0] bg-[#0c242e] p-2 border border-[#173e4f] rounded-xs">
            All enterprise features are currently active under TallyPrime Gold multi-user profile.
          </div>

          <div className="flex justify-between items-center pt-2">
            <span className="text-[#8ba8b6] text-[10px]">Press Esc or Ctrl+A to Accept & Close</span>
            <button
              onClick={onClose}
              className="px-5 py-1.5 bg-[#0284c7] hover:bg-[#0396e3] text-white font-bold rounded-xs cursor-pointer shadow"
            >
              Ctrl+A: Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
