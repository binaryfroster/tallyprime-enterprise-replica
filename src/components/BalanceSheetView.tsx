import React, { useState } from 'react';
import { BalanceSheetData, AccountingEngine } from '../core/accountingEngine';
import { DrilldownEngine } from '../core/drilldownEngine';
import { Voucher } from '../core/types';

interface BalanceSheetViewProps {
  balanceSheet: BalanceSheetData;
  accountingEngine: AccountingEngine;
  vouchers: Voucher[];
  onBack: () => void;
  onDrillIntoLedger: (ledgerId: string) => void;
}

export const BalanceSheetView: React.FC<BalanceSheetViewProps> = ({
  balanceSheet,
  accountingEngine,
  vouchers,
  onBack,
  onDrillIntoLedger,
}) => {
  const [selectedSide, setSelectedSide] = useState<'liab' | 'assets'>('liab');
  const [drilledGroupId, setDrilledGroupId] = useState<string | null>(null);

  // If user drilled into a specific group
  const drillResult = drilledGroupId
    ? DrilldownEngine.drillIntoGroup({
        groupId: drilledGroupId,
        engine: accountingEngine,
        vouchers,
      })
    : null;

  return (
    <div className="flex-1 flex flex-col bg-[#0b1f28] overflow-hidden text-xs font-mono">
      {/* View Header */}
      <div className="bg-[#144353] border-b border-[#246076] px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[#fbbf24] font-bold text-sm">
            {drillResult ? `Group Drill-Down: ${drillResult.group?.name}` : 'Balance Sheet'}
          </span>
          <span className="text-[#88a9b7] text-[11px]">
            (as on {balanceSheet.asOfDate})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {drilledGroupId ? (
            <button
              onClick={() => setDrilledGroupId(null)}
              className="px-3 py-1 bg-[#17485a] hover:bg-[#1f5f76] text-[#fbbf24] rounded-xs font-semibold"
            >
              ↑ Back to Primary Summary (Esc)
            </button>
          ) : (
            <button
              onClick={onBack}
              className="px-3 py-1 bg-[#17485a] hover:bg-[#1f5f76] text-[#d6e3e8] rounded-xs font-semibold"
            >
              Esc: Gateway
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {drillResult ? (
          /* Drilled-down Group View */
          <div className="bg-[#0e2c38] tally-panel-border p-4 space-y-4">
            <div className="text-[#38bdf8] font-bold text-sm border-b border-[#1b4e61] pb-2 flex justify-between">
              <span>Particulars</span>
              <span>Closing Balance (₹)</span>
            </div>

            {drillResult.childGroups.length > 0 && (
              <div className="space-y-1">
                <div className="text-[10px] text-[#7198a8] font-bold uppercase">Sub-Groups</div>
                {drillResult.childGroups.map((cg) => (
                  <div
                    key={cg.group.id}
                    onClick={() => setDrilledGroupId(cg.group.id)}
                    className="flex justify-between px-3 py-2 bg-[#0a2029] hover:bg-[#154658] cursor-pointer rounded-xs border border-[#1b4b5d]"
                  >
                    <span className="font-semibold text-[#f1f5f9] flex items-center gap-1.5">
                      <span className="text-[#fbbf24]">📁</span> {cg.group.name}
                    </span>
                    <span className="font-bold text-[#fbbf24]">
                      ₹{Math.abs(cg.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {drillResult.ledgers.length > 0 && (
              <div className="space-y-1">
                <div className="text-[10px] text-[#7198a8] font-bold uppercase">Ledgers</div>
                {drillResult.ledgers.map((l) => (
                  <div
                    key={l.ledger.id}
                    onClick={() => onDrillIntoLedger(l.ledger.id)}
                    className="flex justify-between px-3 py-2 bg-[#091b23] hover:bg-[#143e4f] cursor-pointer rounded-xs border border-[#173f50]"
                  >
                    <span className="text-[#cbd5e1] flex items-center gap-1.5">
                      <span className="text-[#38bdf8]">📄</span> {l.ledger.name}
                    </span>
                    <span className="font-mono text-[#f8fafc]">
                      ₹{Math.abs(l.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}{' '}
                      {l.balance >= 0 ? 'Dr' : 'Cr'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Classic Horizontal T-Shape Balance Sheet */
          <div className="grid grid-cols-2 gap-4 h-full">
            {/* Left Side: Liabilities & Capital */}
            <div className="bg-[#0e2c38] tally-panel-border flex flex-col">
              <div className="bg-[#17485a] text-[#fbbf24] px-4 py-2 font-bold flex justify-between border-b border-[#246177]">
                <span>Liabilities</span>
                <span>Amount (₹)</span>
              </div>

              <div className="p-3 flex-1 space-y-2 overflow-y-auto">
                <div
                  onClick={() => setDrilledGroupId('grp_capital_account')}
                  className="flex justify-between py-1.5 px-2 hover:bg-[#154658] cursor-pointer rounded-xs"
                >
                  <span className="font-bold text-[#f1f5f9]">Capital Account</span>
                  <span className="text-[#fbbf24] font-semibold">
                    ₹{balanceSheet.liabilities.capitalAccount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div
                  onClick={() => setDrilledGroupId('grp_reserves_surplus')}
                  className="flex justify-between py-1 px-4 hover:bg-[#154658] cursor-pointer text-[#cbd5e1]"
                >
                  <span>Reserves & Surplus</span>
                  <span>
                    ₹{balanceSheet.liabilities.reservesAndSurplus.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between py-1 px-4 text-[#10b981] bg-[#0c242e] rounded-xs border border-[#174252]">
                  <span>+ Profit & Loss A/c (Net Profit Carried)</span>
                  <span className="font-bold">
                    ₹{balanceSheet.liabilities.netProfitCarried.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div
                  onClick={() => setDrilledGroupId('grp_loans_liability')}
                  className="flex justify-between py-1.5 px-2 hover:bg-[#154658] cursor-pointer rounded-xs border-t border-[#1b4b5d] pt-2"
                >
                  <span className="font-bold text-[#f1f5f9]">Loans (Liability)</span>
                  <span className="text-[#fbbf24] font-semibold">
                    ₹{balanceSheet.liabilities.loansLiability.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div
                  onClick={() => setDrilledGroupId('grp_current_liabilities')}
                  className="flex justify-between py-1.5 px-2 hover:bg-[#154658] cursor-pointer rounded-xs border-t border-[#1b4b5d] pt-2"
                >
                  <span className="font-bold text-[#f1f5f9]">Current Liabilities</span>
                  <span className="text-[#fbbf24] font-semibold">
                    ₹{balanceSheet.liabilities.currentLiabilities.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div
                  onClick={() => setDrilledGroupId('grp_sundry_creditors')}
                  className="flex justify-between py-1 px-4 hover:bg-[#154658] cursor-pointer text-[#cbd5e1]"
                >
                  <span>Sundry Creditors</span>
                  <span>
                    ₹{balanceSheet.liabilities.sundryCreditors.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div
                  onClick={() => setDrilledGroupId('grp_duties_taxes')}
                  className="flex justify-between py-1 px-4 hover:bg-[#154658] cursor-pointer text-[#cbd5e1]"
                >
                  <span>Duties & Taxes</span>
                  <span>
                    ₹{balanceSheet.liabilities.dutiesAndTaxes.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="bg-[#123847] border-t-2 border-[#2b687f] px-4 py-2 flex justify-between font-black text-sm text-[#f8fafc]">
                <span>Total Liabilities</span>
                <span className="text-[#fbbf24]">
                  ₹{balanceSheet.liabilities.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Right Side: Assets */}
            <div className="bg-[#0e2c38] tally-panel-border flex flex-col">
              <div className="bg-[#17485a] text-[#fbbf24] px-4 py-2 font-bold flex justify-between border-b border-[#246177]">
                <span>Assets</span>
                <span>Amount (₹)</span>
              </div>

              <div className="p-3 flex-1 space-y-2 overflow-y-auto">
                <div
                  onClick={() => setDrilledGroupId('grp_fixed_assets')}
                  className="flex justify-between py-1.5 px-2 hover:bg-[#154658] cursor-pointer rounded-xs"
                >
                  <span className="font-bold text-[#f1f5f9]">Fixed Assets</span>
                  <span className="text-[#fbbf24] font-semibold">
                    ₹{balanceSheet.assets.fixedAssets.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div
                  onClick={() => setDrilledGroupId('grp_investments')}
                  className="flex justify-between py-1.5 px-2 hover:bg-[#154658] cursor-pointer rounded-xs border-t border-[#1b4b5d] pt-2"
                >
                  <span className="font-bold text-[#f1f5f9]">Investments</span>
                  <span className="text-[#fbbf24] font-semibold">
                    ₹{balanceSheet.assets.investments.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div
                  onClick={() => setDrilledGroupId('grp_current_assets')}
                  className="flex justify-between py-1.5 px-2 hover:bg-[#154658] cursor-pointer rounded-xs border-t border-[#1b4b5d] pt-2"
                >
                  <span className="font-bold text-[#f1f5f9]">Current Assets</span>
                  <span className="text-[#fbbf24] font-semibold">
                    ₹{balanceSheet.assets.currentAssets.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div
                  onClick={() => setDrilledGroupId('grp_stock_in_hand')}
                  className="flex justify-between py-1 px-4 hover:bg-[#154658] cursor-pointer text-[#cbd5e1]"
                >
                  <span>Closing Stock (Valuated)</span>
                  <span className="text-[#38bdf8]">
                    ₹{balanceSheet.assets.closingStock.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div
                  onClick={() => setDrilledGroupId('grp_sundry_debtors')}
                  className="flex justify-between py-1 px-4 hover:bg-[#154658] cursor-pointer text-[#cbd5e1]"
                >
                  <span>Sundry Debtors</span>
                  <span>
                    ₹{balanceSheet.assets.sundryDebtors.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div
                  onClick={() => setDrilledGroupId('grp_bank_accounts')}
                  className="flex justify-between py-1 px-4 hover:bg-[#154658] cursor-pointer text-[#cbd5e1]"
                >
                  <span>Bank Accounts</span>
                  <span>
                    ₹{balanceSheet.assets.bankAccounts.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div
                  onClick={() => setDrilledGroupId('grp_cash_in_hand')}
                  className="flex justify-between py-1 px-4 hover:bg-[#154658] cursor-pointer text-[#cbd5e1]"
                >
                  <span>Cash-in-hand</span>
                  <span>
                    ₹{balanceSheet.assets.cashInHand.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="bg-[#123847] border-t-2 border-[#2b687f] px-4 py-2 flex justify-between font-black text-sm text-[#f8fafc]">
                <span>Total Assets</span>
                <span className="text-[#fbbf24]">
                  ₹{balanceSheet.assets.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Invariant Verification Bar */}
      <div className="bg-[#081b22] px-4 py-2 border-t border-[#183e4d] flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-2">
          {balanceSheet.isBalanced ? (
            <span className="text-[#10b981] font-bold flex items-center gap-1">
              ✓ Continuous Double-Entry Balancing: EXACT MATCH (Zero Difference)
            </span>
          ) : (
            <span className="text-[#ef4444] font-bold">
              ⚠ Difference in Balancing: ₹{balanceSheet.difference.toLocaleString('en-IN')}
            </span>
          )}
        </div>
        <div className="text-[#72929e]">Click any row or press Enter to recursively drill down</div>
      </div>
    </div>
  );
};
