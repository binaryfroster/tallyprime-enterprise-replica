import React from 'react';
import { StockSummaryRow } from '../core/inventoryEngine';

interface StockSummaryViewProps {
  stockSummary: StockSummaryRow[];
  onBack: () => void;
}

export const StockSummaryView: React.FC<StockSummaryViewProps> = ({ stockSummary, onBack }) => {
  const totalClosingValue = stockSummary.reduce((sum, item) => sum + item.closingValue, 0);

  return (
    <div className="flex-1 flex flex-col bg-[#0b1f28] overflow-hidden text-xs font-mono">
      {/* View Header */}
      <div className="bg-[#144353] border-b border-[#246076] px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[#fbbf24] font-bold text-sm">Stock Summary</span>
          <span className="text-[#88a9b7] text-[11px]">(Real-Time 10-Method Valuation)</span>
        </div>

        <button
          onClick={onBack}
          className="px-3 py-1 bg-[#17485a] hover:bg-[#1f5f76] text-[#d6e3e8] rounded-xs font-semibold"
        >
          Esc: Gateway
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto p-4">
        <table className="tally-table">
          <thead>
            <tr>
              <th>Item Name</th>
              <th className="w-28 text-right">Inward Qty</th>
              <th className="w-32 text-right">Inward Val (₹)</th>
              <th className="w-28 text-right">Outward Qty</th>
              <th className="w-28 text-right">Closing Qty</th>
              <th className="w-32 text-right">Valuation Rate (₹)</th>
              <th className="w-36 text-right">Closing Value (₹)</th>
            </tr>
          </thead>
          <tbody>
            {stockSummary.map((row) => (
              <tr key={row.stockItemId} className="tally-row">
                <td className="font-semibold text-[#f1f5f9]">{row.name}</td>
                <td className="text-right text-[#8ba8b6] font-mono">
                  {row.inwardQty} {row.unit}
                </td>
                <td className="text-right text-[#8ba8b6] font-mono">
                  ₹{row.inwardValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="text-right text-[#f87171] font-mono">
                  {row.outwardQty} {row.unit}
                </td>
                <td className="text-right font-bold text-[#38bdf8] font-mono">
                  {row.closingQty} {row.unit}
                </td>
                <td className="text-right text-[#cbd5e1] font-mono">
                  ₹{row.closingRate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="text-right font-black text-[#fbbf24] font-mono">
                  ₹{row.closingValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-[#123847] border-t-2 border-[#2b687f] font-bold text-sm">
              <td colSpan={6} className="text-right text-[#f1f5f9] pr-4 py-2">
                Total Closing Stock Valuation:
              </td>
              <td className="text-right text-[#fbbf24] py-2 font-mono">
                ₹{totalClosingValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
