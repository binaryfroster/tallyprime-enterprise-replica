import React, { useState, useEffect } from 'react';
import { LedgerMaster, Voucher } from '../core/types';
import { DrilldownEngine, MonthlyBreakdown } from '../core/drilldownEngine';

interface LedgerMonthlyViewProps {
  ledger: LedgerMaster;
  vouchers: Voucher[];
  financialYear?: number;
  onSelectMonth: (monthIndex: number, year: number, monthName: string) => void;
  onBack: () => void;
}

export const LedgerMonthlyView: React.FC<LedgerMonthlyViewProps> = ({
  ledger,
  vouchers,
  financialYear = 2026,
  onSelectMonth,
  onBack,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const monthlyData: MonthlyBreakdown[] = DrilldownEngine.drillIntoLedgerMonthly({
    ledgerId: ledger.id,
    vouchers,
    financialYear,
    openingBalance: ledger.openingBalance,
  });

  const totalDebit = monthlyData.reduce((sum, m) => sum + m.totalDebit, 0);
  const totalCredit = monthlyData.reduce((sum, m) => sum + m.totalCredit, 0);
  const finalBalance = monthlyData[monthlyData.length - 1]?.closingBalance ?? ledger.openingBalance;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % monthlyData.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + monthlyData.length) % monthlyData.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const m = monthlyData[selectedIndex];
        if (m) {
          onSelectMonth(m.monthIndex, m.year, m.monthName);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, monthlyData, onSelectMonth, onBack]);

  return (
    <div className="flex-1 flex flex-col bg-[#0b1f28] overflow-hidden text-xs font-mono select-none">
      {/* View Header */}
      <div className="bg-[#144353] border-b border-[#246076] px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[#fbbf24] font-bold text-sm">Ledger Monthly Summary:</span>
          <span className="text-[#f1f5f9] font-bold text-sm">{ledger.name}</span>
          <span className="text-[#88a9b7] text-[11px]">
            [Opening Bal: ₹{Math.abs(ledger.openingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}{' '}
            {ledger.openingBalance >= 0 ? 'Dr' : 'Cr'}]
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
        <table className="tally-table">
          <thead>
            <tr>
              <th className="w-40">Month (FY {financialYear}-{financialYear + 1})</th>
              <th className="w-40 text-right">Debit (₹)</th>
              <th className="w-40 text-right">Credit (₹)</th>
              <th className="w-44 text-right">Closing Balance (₹)</th>
              <th className="w-28 text-center">Vouchers</th>
            </tr>
          </thead>
          <tbody>
            {monthlyData.map((m, idx) => (
              <tr
                key={m.monthName}
                onClick={() => {
                  setSelectedIndex(idx);
                  onSelectMonth(m.monthIndex, m.year, m.monthName);
                }}
                className={`tally-row cursor-pointer ${
                  selectedIndex === idx ? 'bg-[#154658] border-l-4 border-l-[#fbbf24]' : ''
                }`}
              >
                <td className="font-semibold text-[#f1f5f9] flex items-center gap-1.5">
                  <span className="text-[#38bdf8]">📅</span> {m.monthName} {m.year}
                </td>
                <td className="text-right font-mono text-[#f8fafc]">
                  {m.totalDebit > 0
                    ? `₹${m.totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                    : '-'}
                </td>
                <td className="text-right font-mono text-[#f8fafc]">
                  {m.totalCredit > 0
                    ? `₹${m.totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                    : '-'}
                </td>
                <td className="text-right font-mono font-bold text-[#fbbf24]">
                  ₹{Math.abs(m.closingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}{' '}
                  {m.closingBalance >= 0 ? 'Dr' : 'Cr'}
                </td>
                <td className="text-center font-mono text-[#8ba8b6]">
                  {m.voucherCount > 0 ? (
                    <span className="px-1.5 py-0.5 rounded bg-[#103a49] text-[#38bdf8] font-bold">
                      {m.voucherCount}
                    </span>
                  ) : (
                    '-'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-[#123847] border-t-2 border-[#2b687f] font-black text-sm">
              <td className="text-left text-[#f1f5f9] px-3 py-2">Grand Total / Net Position:</td>
              <td className="text-right text-[#fbbf24] py-2 font-mono">
                ₹{totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
              <td className="text-right text-[#fbbf24] py-2 font-mono">
                ₹{totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
              <td className="text-right text-[#34d399] py-2 font-mono font-black">
                ₹{Math.abs(finalBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}{' '}
                {finalBalance >= 0 ? 'Dr' : 'Cr'}
              </td>
              <td className="text-center py-2 text-[#8ba8b6]">
                {monthlyData.reduce((sum, m) => sum + m.voucherCount, 0)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="bg-[#081b22] px-4 py-1.5 border-t border-[#183e4d] text-[11px] flex justify-between text-[#72929e]">
        <span>Press <u>Enter</u> to Drill into Month's Voucher Register</span>
        <span>Press <u>Esc</u> to return to previous report</span>
      </div>
    </div>
  );
};
