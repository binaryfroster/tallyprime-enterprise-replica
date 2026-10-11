import React from 'react';
import { ProfitLossData } from '../core/accountingEngine';

interface ProfitLossViewProps {
  pnl: ProfitLossData;
  onBack: () => void;
  onDrillIntoLedger: (groupId: string) => void;
}

export const ProfitLossView: React.FC<ProfitLossViewProps> = ({
  pnl,
  onBack,
  onDrillIntoLedger,
}) => {
  return (
    <div className="flex-1 flex flex-col bg-[#0b1f28] overflow-hidden text-xs font-mono">
      {/* View Header */}
      <div className="bg-[#144353] border-b border-[#246076] px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[#fbbf24] font-bold text-sm">Profit & Loss Account</span>
          <span className="text-[#88a9b7] text-[11px]">
            ({pnl.periodFrom} to {pnl.periodTo})
          </span>
        </div>

        <button
          onClick={onBack}
          className="px-3 py-1 bg-[#17485a] hover:bg-[#1f5f76] text-[#d6e3e8] rounded-xs font-semibold"
        >
          Esc: Gateway
        </button>
      </div>

      {/* Main Grid */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* I. Trading Account */}
        <div className="bg-[#0e2c38] tally-panel-border">
          <div className="bg-[#17485a] text-[#fbbf24] px-4 py-1.5 font-bold flex justify-between border-b border-[#246177]">
            <span>I. Trading Account (Manufacturing & Direct Operations)</span>
            <span>Amounts in INR (₹)</span>
          </div>

          <div className="grid grid-cols-2 divide-x divide-[#184252] p-2 text-xs">
            {/* Debits: Opening Stock, Purchases, Direct Expenses */}
            <div className="p-2 space-y-2">
              <div className="text-[10px] text-[#7198a8] font-bold uppercase">Expenses & Debits</div>
              <div className="flex justify-between py-1 text-[#cbd5e1]">
                <span>To Opening Stock</span>
                <span>₹{pnl.trading.openingStock.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div
                onClick={() => onDrillIntoLedger('grp_purchase_accounts')}
                className="flex justify-between py-1 hover:bg-[#154658] cursor-pointer text-[#f1f5f9] font-medium"
              >
                <span>To Purchase Accounts</span>
                <span className="text-[#fbbf24]">
                  ₹{pnl.trading.purchases.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-1 text-[#cbd5e1]">
                <span>To Direct Expenses</span>
                <span>₹{pnl.trading.directExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              {pnl.trading.grossProfit > 0 && (
                <div className="flex justify-between py-1.5 px-2 bg-[#0a2732] border border-[#1d5b70] rounded-xs font-bold text-[#10b981] mt-4">
                  <span>To Gross Profit c/o</span>
                  <span>₹{pnl.trading.grossProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>

            {/* Credits: Sales, Direct Incomes, Closing Stock */}
            <div className="p-2 space-y-2">
              <div className="text-[10px] text-[#7198a8] font-bold uppercase">Income & Credits</div>
              <div
                onClick={() => onDrillIntoLedger('grp_sales_accounts')}
                className="flex justify-between py-1 hover:bg-[#154658] cursor-pointer text-[#f1f5f9] font-medium"
              >
                <span>By Sales Accounts</span>
                <span className="text-[#fbbf24]">
                  ₹{pnl.trading.sales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-1 text-[#cbd5e1]">
                <span>By Direct Incomes</span>
                <span>₹{pnl.trading.directIncomes.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between py-1 text-[#38bdf8]">
                <span>By Closing Stock</span>
                <span>₹{pnl.trading.closingStock.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              {pnl.trading.grossLoss > 0 && (
                <div className="flex justify-between py-1.5 px-2 bg-[#2a1318] border border-[#ef4444] rounded-xs font-bold text-[#ef4444] mt-4">
                  <span>By Gross Loss c/o</span>
                  <span>₹{pnl.trading.grossLoss.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* II. Profit & Loss Statement */}
        <div className="bg-[#0e2c38] tally-panel-border">
          <div className="bg-[#17485a] text-[#fbbf24] px-4 py-1.5 font-bold flex justify-between border-b border-[#246177]">
            <span>II. Income Statement (Indirect Overheads & Net Profit)</span>
            <span>Amounts in INR (₹)</span>
          </div>

          <div className="grid grid-cols-2 divide-x divide-[#184252] p-2 text-xs">
            {/* Debits: Indirect Expenses */}
            <div className="p-2 space-y-2">
              <div className="text-[10px] text-[#7198a8] font-bold uppercase">Indirect Expenses</div>
              <div
                onClick={() => onDrillIntoLedger('grp_indirect_expenses')}
                className="flex justify-between py-1 hover:bg-[#154658] cursor-pointer text-[#f1f5f9]"
              >
                <span>To Indirect Expenses</span>
                <span className="text-[#fbbf24]">
                  ₹{pnl.incomeStatement.indirectExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {pnl.incomeStatement.netProfit > 0 && (
                <div className="flex justify-between py-2 px-3 bg-[#0a2f26] border-2 border-[#10b981] rounded-xs font-black text-sm text-[#34d399] mt-6">
                  <span>To Net Profit (Carried to Balance Sheet)</span>
                  <span>₹{pnl.incomeStatement.netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>

            {/* Credits: Gross Profit b/d + Indirect Incomes */}
            <div className="p-2 space-y-2">
              <div className="text-[10px] text-[#7198a8] font-bold uppercase">Incomes</div>
              <div className="flex justify-between py-1 text-[#10b981] font-semibold">
                <span>By Gross Profit b/f</span>
                <span>
                  ₹{pnl.incomeStatement.grossProfitBroughtDown.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div
                onClick={() => onDrillIntoLedger('grp_indirect_incomes')}
                className="flex justify-between py-1 hover:bg-[#154658] cursor-pointer text-[#f1f5f9]"
              >
                <span>By Indirect Incomes</span>
                <span className="text-[#fbbf24]">
                  ₹{pnl.incomeStatement.indirectIncomes.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {pnl.incomeStatement.netLoss > 0 && (
                <div className="flex justify-between py-2 px-3 bg-[#2f0a14] border-2 border-[#ef4444] rounded-xs font-black text-sm text-[#f87171] mt-6">
                  <span>By Net Loss</span>
                  <span>₹{pnl.incomeStatement.netLoss.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
