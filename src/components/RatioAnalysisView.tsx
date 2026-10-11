import React from 'react';
import { RatioAnalysisData } from '../core/accountingEngine';

interface RatioAnalysisViewProps {
  ratios: RatioAnalysisData;
  onBack: () => void;
}

export const RatioAnalysisView: React.FC<RatioAnalysisViewProps> = ({ ratios, onBack }) => {
  return (
    <div className="flex-1 flex flex-col bg-[#0b1f28] overflow-hidden text-xs font-mono">
      {/* View Header */}
      <div className="bg-[#144353] border-b border-[#246076] px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[#fbbf24] font-bold text-sm">Ratio Analysis</span>
          <span className="text-[#88a9b7] text-[11px]">(Financial Health & Performance)</span>
        </div>

        <button
          onClick={onBack}
          className="px-3 py-1 bg-[#17485a] hover:bg-[#1f5f76] text-[#d6e3e8] rounded-xs font-semibold"
        >
          Esc: Gateway
        </button>
      </div>

      {/* Grid of Ratios */}
      <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-4">
        {/* Liquidity Ratios */}
        <div className="bg-[#0e2c38] tally-panel-border p-4 space-y-3">
          <div className="text-[#fbbf24] font-bold border-b border-[#1b4b5d] pb-1 text-sm">
            I. Liquidity Ratios
          </div>

          <div className="flex justify-between py-1.5 border-b border-[#143d4d]">
            <div>
              <div className="font-semibold text-[#f1f5f9]">Current Ratio</div>
              <div className="text-[10px] text-[#789ca9]">Current Assets : Current Liabilities (Benchmark: 2.0)</div>
            </div>
            <div className="text-right">
              <span className="text-base font-bold text-[#38bdf8] font-mono">{ratios.currentRatio} : 1</span>
            </div>
          </div>

          <div className="flex justify-between py-1.5 border-b border-[#143d4d]">
            <div>
              <div className="font-semibold text-[#f1f5f9]">Quick Ratio (Acid Test)</div>
              <div className="text-[10px] text-[#789ca9]">(Current Assets - Stock) : Current Liabilities (Benchmark: 1.0)</div>
            </div>
            <div className="text-right">
              <span className="text-base font-bold text-[#38bdf8] font-mono">{ratios.quickRatio} : 1</span>
            </div>
          </div>

          <div className="flex justify-between py-1.5">
            <div>
              <div className="font-semibold text-[#f1f5f9]">Working Capital</div>
              <div className="text-[10px] text-[#789ca9]">Current Assets - Current Liabilities</div>
            </div>
            <div className="text-right">
              <span className="text-base font-bold text-[#10b981] font-mono">
                ₹{ratios.workingCapital.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Profitability & Solvency */}
        <div className="bg-[#0e2c38] tally-panel-border p-4 space-y-3">
          <div className="text-[#fbbf24] font-bold border-b border-[#1b4b5d] pb-1 text-sm">
            II. Profitability & Capital Structure
          </div>

          <div className="flex justify-between py-1.5 border-b border-[#143d4d]">
            <div>
              <div className="font-semibold text-[#f1f5f9]">Gross Profit Margin</div>
              <div className="text-[10px] text-[#789ca9]">(Gross Profit / Sales Turnover) * 100</div>
            </div>
            <div className="text-right">
              <span className="text-base font-bold text-[#fbbf24] font-mono">
                {ratios.grossProfitMarginPercent}%
              </span>
            </div>
          </div>

          <div className="flex justify-between py-1.5 border-b border-[#143d4d]">
            <div>
              <div className="font-semibold text-[#f1f5f9]">Net Profit Margin</div>
              <div className="text-[10px] text-[#789ca9]">(Net Profit / Sales Turnover) * 100</div>
            </div>
            <div className="text-right">
              <span className="text-base font-bold text-[#10b981] font-mono">
                {ratios.netProfitMarginPercent}%
              </span>
            </div>
          </div>

          <div className="flex justify-between py-1.5 border-b border-[#143d4d]">
            <div>
              <div className="font-semibold text-[#f1f5f9]">Debt - Equity Ratio</div>
              <div className="text-[10px] text-[#789ca9]">Total Debt : Net Worth</div>
            </div>
            <div className="text-right">
              <span className="text-base font-bold text-[#38bdf8] font-mono">
                {ratios.debtEquityRatio} : 1
              </span>
            </div>
          </div>

          <div className="flex justify-between py-1.5">
            <div>
              <div className="font-semibold text-[#f1f5f9]">Return on Capital Employed (ROCE)</div>
              <div className="text-[10px] text-[#789ca9]">(Net Profit / Net Worth) * 100</div>
            </div>
            <div className="text-right">
              <span className="text-base font-bold text-[#fbbf24] font-mono">
                {ratios.returnOnCapitalEmployedPercent}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
