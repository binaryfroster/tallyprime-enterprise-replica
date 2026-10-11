import React, { useState, useEffect, useRef } from 'react';

interface DateChangeModalProps {
  isOpen: boolean;
  currentDate: string;
  onSave: (date: string) => void;
  onClose: () => void;
}

export const DateChangeModal: React.FC<DateChangeModalProps> = ({
  isOpen,
  currentDate,
  onSave,
  onClose,
}) => {
  const [date, setDate] = useState(currentDate);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setDate(currentDate);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, currentDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (date) {
      onSave(date);
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="w-[380px] max-w-[95vw] bg-[#0c2733] border-2 border-[#fbbf24] shadow-2xl rounded-sm flex flex-col overflow-hidden font-mono text-xs">
        <div className="bg-[#fbbf24] text-[#0c2733] px-4 py-1.5 font-bold flex justify-between items-center text-sm">
          <span>Change Current Date</span>
          <span className="text-[11px] font-normal">[F2]</span>
        </div>

        <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="p-5 space-y-4 bg-[#081e28]">
          <div>
            <label className="text-[#7ea0af] block mb-1.5 text-xs font-semibold">
              Current Date (YYYY-MM-DD):
            </label>
            <input
              ref={inputRef}
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full tally-input py-1.5 text-sm font-bold text-[#f8fafc]"
            />
          </div>

          <div className="text-[10px] text-[#7192a0] bg-[#0c242e] p-2 border border-[#173e4f] rounded-xs">
            Financial Year: 01-Apr-2026 to 31-Mar-2027<br />
            Books Beginning: 01-Apr-2026
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-[#173e4e] hover:bg-[#205267] text-[#d6e3e8] font-bold rounded-xs cursor-pointer"
            >
              Esc: Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-1.5 bg-[#0284c7] hover:bg-[#0396e3] text-white font-bold rounded-xs shadow cursor-pointer"
            >
              Enter: Accept
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
