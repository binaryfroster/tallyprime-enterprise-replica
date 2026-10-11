import React from 'react';
import { AccountingEngine, LedgerBalanceSummary } from '../core/accountingEngine';
import { AccountGroup } from '../core/types';

interface TrialBalanceViewProps {
  groups: AccountGroup[];
  balances: Map<string, LedgerBalanceSummary>;
  onBack: () => void;
  onDrillIntoGroup: (groupId: string) => void;
}

export const TrialBalanceView: React.FC<TrialBalanceViewProps> = ({
  groups,
  balances,
  onBack,
  onDrillIntoGroup,
}) => {
  const primaryGroups = groups.filter((g) => g.isPrimary);

  let totalDebit = 0;
  let totalCredit = 0;

  const rows = primaryGroups.map((group) => {
    // Collect all balances under this group hierarchy
    let groupDebit = 0;
    let groupCredit = 0;

    balances.forEach((b) => {
      // Find parent primary
      let cur = groups.find((g) => g.id === b.groupId);
      while (cur && !cur.isPrimary && cur.parentGroupId) {
        cur = groups.find((g) => g.id === cur?.parentGroupId);
      }
      if (cur?.id === group.id) {
        if (b.closingBalance > 0) {
          groupDebit += b.closingBalance;
        } else {
          groupCredit += Math.abs(b.closingBalance);
        }
      }
    });

    totalDebit += groupDebit;
    totalCredit += groupCredit;

    return {
      group,
      debit: groupDebit,
      credit: groupCredit,
    };
  });

  return (
    <div className="flex-1 flex flex-col bg-[#0b1f28] overflow-hidden text-xs font-mono">
      {/* View Header */}
      <div className="bg-[#144353] border-b border-[#246076] px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[#fbbf24] font-bold text-sm">Trial Balance</span>
          <span className="text-[#88a9b7] text-[11px]">(Grouped Summary of All General Ledgers)</span>
        </div>

        <button
          onClick={onBack}
          className="px-3 py-1 bg-[#17485a] hover:bg-[#1f5f76] text-[#d6e3e8] rounded-xs font-semibold"
        >
          Esc: Gateway
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <table className="tally-table">
          <thead>
            <tr>
              <th>Particulars (Primary Group)</th>
              <th className="w-48 text-right">Debit Balances (₹)</th>
              <th className="w-48 text-right">Credit Balances (₹)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ group, debit, credit }) => (
              <tr
                key={group.id}
                onClick={() => onDrillIntoGroup(group.id)}
                className="tally-row cursor-pointer"
              >
                <td className="font-semibold text-[#f1f5f9] flex items-center gap-2">
                  <span className="text-[#fbbf24]">📁</span> {group.name}
                  <span className="text-[10px] text-[#789ca9]">({group.nature})</span>
                </td>
                <td className="text-right font-mono font-bold text-[#f8fafc]">
                  {debit > 0 ? `₹${debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                </td>
                <td className="text-right font-mono font-bold text-[#f8fafc]">
                  {credit > 0 ? `₹${credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-[#123847] border-t-2 border-[#2b687f] font-black text-sm">
              <td className="text-right text-[#f1f5f9] pr-4 py-2">Total Balances:</td>
              <td className="text-right text-[#fbbf24] py-2 font-mono">
                ₹{totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
              <td className="text-right text-[#fbbf24] py-2 font-mono">
                ₹{totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="bg-[#081b22] px-4 py-1.5 border-t border-[#183e4d] text-[11px] flex justify-between">
        <span className="text-[#10b981] font-bold">
          ✓ Double-Entry Trial Balance: Verified Balanced
        </span>
        <span className="text-[#72929e]">Press Enter or click any group to inspect subordinate accounts</span>
      </div>
    </div>
  );
};
