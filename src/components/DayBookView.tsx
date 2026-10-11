import React, { useState } from 'react';
import { Voucher } from '../core/types';

interface DayBookViewProps {
  vouchers: Voucher[];
  onBack: () => void;
  onSelectVoucher: (voucher: Voucher) => void;
}

export const DayBookView: React.FC<DayBookViewProps> = ({
  vouchers,
  onBack,
  onSelectVoucher,
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');

  const filteredVouchers = vouchers
    .filter((v) => !v.isCancelled)
    .filter((v) => (filterType === 'ALL' ? true : v.voucherType === filterType))
    .sort((a, b) => b.date.localeCompare(a.date));

  const totalAmount = filteredVouchers.reduce((sum, v) => sum + v.totalVoucherAmount, 0);

  return (
    <div className="flex-1 flex flex-col bg-[#0b1f28] overflow-hidden text-xs font-mono">
      {/* View Header */}
      <div className="bg-[#144353] border-b border-[#246076] px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[#fbbf24] font-bold text-sm">Day Book</span>
          <span className="text-[#88a9b7] text-[11px]">
            (Total {filteredVouchers.length} Transactions)
          </span>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="tally-input py-0.5 px-2 text-xs rounded-xs ml-4"
          >
            <option value="ALL">All Voucher Types</option>
            <option value="SALES">Sales</option>
            <option value="PURCHASE">Purchase</option>
            <option value="RECEIPT">Receipt</option>
            <option value="PAYMENT">Payment</option>
            <option value="CONTRA">Contra</option>
            <option value="JOURNAL">Journal</option>
            <option value="STOCK_JOURNAL">Stock Journal</option>
            <option value="PAYROLL">Payroll</option>
          </select>
        </div>

        <button
          onClick={onBack}
          className="px-3 py-1 bg-[#17485a] hover:bg-[#1f5f76] text-[#d6e3e8] rounded-xs font-semibold"
        >
          Esc: Gateway
        </button>
      </div>

      {/* Register Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <table className="tally-table">
          <thead>
            <tr>
              <th className="w-28">Date</th>
              <th>Particulars (Party / Counter Ledger)</th>
              <th className="w-32">Vch Type</th>
              <th className="w-36">Vch No.</th>
              <th className="w-36 text-right">Debit (₹)</th>
              <th className="w-36 text-right">Credit (₹)</th>
            </tr>
          </thead>
          <tbody>
            {filteredVouchers.map((vch) => {
              const debitEntry = vch.ledgerEntries.find((e) => e.amount > 0);
              const creditEntry = vch.ledgerEntries.find((e) => e.amount < 0);
              const isSalesOrRcpt = vch.voucherType === 'SALES' || vch.voucherType === 'RECEIPT';

              return (
                <tr
                  key={vch.id}
                  onClick={() => onSelectVoucher(vch)}
                  className="tally-row cursor-pointer"
                >
                  <td className="text-[#8ba8b6] font-mono">{vch.date}</td>
                  <td className="font-semibold text-[#f1f5f9]">
                    {vch.partyName || (debitEntry ? debitEntry.ledgerName : 'Various')}
                    {vch.narration && (
                      <span className="block text-[10px] text-[#71929f] font-normal italic">
                        {vch.narration}
                      </span>
                    )}
                  </td>
                  <td>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#143d4d] text-[#38bdf8] border border-[#23586d]">
                      {vch.voucherType}
                    </span>
                  </td>
                  <td className="text-[#fbbf24] font-mono">{vch.voucherNumber}</td>
                  <td className="text-right font-mono text-[#f8fafc]">
                    {isSalesOrRcpt
                      ? `₹${vch.totalVoucherAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                      : '-'}
                  </td>
                  <td className="text-right font-mono text-[#f8fafc]">
                    {!isSalesOrRcpt
                      ? `₹${vch.totalVoucherAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                      : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-[#123847] border-t-2 border-[#2b687f] font-bold text-sm">
              <td colSpan={4} className="text-right text-[#f1f5f9] pr-4 py-2">
                Total Transaction Volume:
              </td>
              <td colSpan={2} className="text-right text-[#fbbf24] py-2 pr-2 font-mono">
                ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
