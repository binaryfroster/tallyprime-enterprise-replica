import React, { useState, useEffect } from 'react';
import { LedgerMaster, Voucher } from '../core/types';
import { DrilldownEngine } from '../core/drilldownEngine';

interface VoucherRegisterViewProps {
  ledger: LedgerMaster;
  monthIndex: number;
  year: number;
  monthName: string;
  vouchers: Voucher[];
  onSelectVoucher: (voucher: Voucher) => void;
  onBack: () => void;
}

export const VoucherRegisterView: React.FC<VoucherRegisterViewProps> = ({
  ledger,
  monthIndex,
  year,
  monthName,
  vouchers,
  onSelectVoucher,
  onBack,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const registerEntries = DrilldownEngine.drillIntoMonthVouchers({
    ledgerId: ledger.id,
    vouchers,
    monthIndex,
    year,
  });

  const totalDebit = registerEntries.reduce((sum, r) => sum + r.debit, 0);
  const totalCredit = registerEntries.reduce((sum, r) => sum + r.credit, 0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (registerEntries.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + registerEntries.length) % (registerEntries.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const entry = registerEntries[selectedIndex];
        if (entry) {
          onSelectVoucher(entry.voucher);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, registerEntries, onSelectVoucher, onBack]);

  return (
    <div className="flex-1 flex flex-col bg-[#0b1f28] overflow-hidden text-xs font-mono select-none">
      {/* View Header */}
      <div className="bg-[#144353] border-b border-[#246076] px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[#fbbf24] font-bold text-sm">Voucher Register:</span>
          <span className="text-[#f1f5f9] font-bold text-sm">{ledger.name}</span>
          <span className="text-[#38bdf8] text-[11px] font-semibold">
            ({monthName} {year})
          </span>
          <span className="text-[#88a9b7] text-[11px]">
            [{registerEntries.length} Transactions]
          </span>
        </div>

        <button
          onClick={onBack}
          className="px-3 py-1 bg-[#17485a] hover:bg-[#1f5f76] text-[#d6e3e8] rounded-xs font-semibold"
        >
          Esc: Back
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {registerEntries.length === 0 ? (
          <div className="text-center py-12 text-[#789ca9]">
            No vouchers recorded for {ledger.name} in {monthName} {year}.
          </div>
        ) : (
          <table className="tally-table">
            <thead>
              <tr>
                <th className="w-28">Date</th>
                <th>Particulars (Counter Account)</th>
                <th className="w-32">Vch Type</th>
                <th className="w-36">Vch No.</th>
                <th className="w-36 text-right">Debit (₹)</th>
                <th className="w-36 text-right">Credit (₹)</th>
              </tr>
            </thead>
            <tbody>
              {registerEntries.map((item, idx) => (
                <tr
                  key={item.voucher.id}
                  onClick={() => {
                    setSelectedIndex(idx);
                    onSelectVoucher(item.voucher);
                  }}
                  className={`tally-row cursor-pointer ${
                    selectedIndex === idx ? 'bg-[#154658] border-l-4 border-l-[#fbbf24]' : ''
                  }`}
                >
                  <td className="text-[#8ba8b6] font-mono">{item.voucher.date}</td>
                  <td className="font-semibold text-[#f1f5f9]">
                    {item.particulars}
                    {item.voucher.narration && (
                      <span className="block text-[10px] text-[#71929f] font-normal italic">
                        {item.voucher.narration}
                      </span>
                    )}
                  </td>
                  <td>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#143d4d] text-[#38bdf8] border border-[#23586d]">
                      {item.voucherType}
                    </span>
                  </td>
                  <td className="text-[#fbbf24] font-mono">{item.voucherNo}</td>
                  <td className="text-right font-mono text-[#f8fafc]">
                    {item.debit > 0
                      ? `₹${item.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                      : '-'}
                  </td>
                  <td className="text-right font-mono text-[#f8fafc]">
                    {item.credit > 0
                      ? `₹${item.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#123847] border-t-2 border-[#2b687f] font-bold text-sm">
                <td colSpan={4} className="text-right text-[#f1f5f9] pr-4 py-2">
                  Total for {monthName} {year}:
                </td>
                <td className="text-right text-[#fbbf24] py-2 font-mono">
                  ₹{totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="text-right text-[#fbbf24] py-2 font-mono">
                  ₹{totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      <div className="bg-[#081b22] px-4 py-1.5 border-t border-[#183e4d] text-[11px] flex justify-between text-[#72929e]">
        <span>Press <u>Enter</u> to Open / Alter Voucher in Edit Mode</span>
        <span>Press <u>Esc</u> to return to Monthly Breakdown</span>
      </div>
    </div>
  );
};
