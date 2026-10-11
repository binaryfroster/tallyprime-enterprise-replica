import React, { useState } from 'react';
import { LedgerMaster, Voucher, BankStatementTransaction } from '../core/types';
import { BankingEngine } from '../core/bankingEngine';

interface BankingViewProps {
  ledgers: LedgerMaster[];
  vouchers: Voucher[];
  bankStatements: BankStatementTransaction[];
  onBack: () => void;
}

export const BankingView: React.FC<BankingViewProps> = ({
  ledgers,
  vouchers,
  bankStatements,
  onBack,
}) => {
  const bankLedgers = ledgers.filter((l) => l.groupId === 'grp_bank_accounts');
  const [selectedBankId, setSelectedBankId] = useState<string>(bankLedgers[0]?.id || '');

  const selectedBank = bankLedgers.find((l) => l.id === selectedBankId);

  const brs = selectedBank
    ? BankingEngine.generateBRS({
        bankLedger: selectedBank,
        vouchers,
        statementTransactions: bankStatements,
      })
    : null;

  return (
    <div className="flex-1 flex flex-col bg-[#0b1f28] overflow-hidden text-xs font-mono">
      {/* View Header */}
      <div className="bg-[#144353] border-b border-[#246076] px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[#fbbf24] font-bold text-sm">Bank Reconciliation Statement (BRS)</span>

          <select
            value={selectedBankId}
            onChange={(e) => setSelectedBankId(e.target.value)}
            className="tally-input py-0.5 px-2 text-xs rounded-xs font-mono ml-4"
          >
            {bankLedgers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.bankAccountNo})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={onBack}
          className="px-3 py-1 bg-[#17485a] hover:bg-[#1f5f76] text-[#d6e3e8] rounded-xs font-semibold"
        >
          Esc: Gateway
        </button>
      </div>

      {/* Main Reconciliation Summary */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {brs && (
          <>
            {/* Top Balances Bar */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#0e2c38] tally-panel-border p-4 rounded-xs">
                <div className="text-[#7ea0af] text-[11px] uppercase font-bold">
                  Balance as per Company Books:
                </div>
                <div className="text-xl font-black text-[#fbbf24] mt-1 font-mono">
                  ₹{brs.balanceAsPerCompanyBooks.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="bg-[#0e2c38] tally-panel-border p-4 rounded-xs">
                <div className="text-[#7ea0af] text-[11px] uppercase font-bold">
                  Balance as per Bank Statement:
                </div>
                <div className="text-xl font-black text-[#38bdf8] mt-1 font-mono">
                  ₹{brs.balanceAsPerBank.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Unpresented / Uncleared Transactions */}
            <div className="bg-[#0e2c38] tally-panel-border p-3 space-y-2">
              <div className="text-[#fbbf24] font-bold flex justify-between">
                <span>Amounts Not Reflected in Bank Statement (Unpresented / In-Transit)</span>
                <span className="text-[#8ba8b6] font-normal">
                  {brs.amountsNotReflectedInBank.length} Items Pending Clearing
                </span>
              </div>

              {brs.amountsNotReflectedInBank.length === 0 ? (
                <div className="p-4 text-center text-[#10b981] font-bold">
                  ✓ All company book vouchers are 100% cleared in bank statement!
                </div>
              ) : (
                <table className="tally-table">
                  <thead>
                    <tr>
                      <th className="w-28">Date</th>
                      <th className="w-36">Voucher No</th>
                      <th>Party / Particulars</th>
                      <th className="w-48">Clearing Status</th>
                      <th className="w-36 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {brs.amountsNotReflectedInBank.map((item) => (
                      <tr key={item.voucherId} className="tally-row">
                        <td className="text-[#8ba8b6] font-mono">{item.date}</td>
                        <td className="font-mono text-[#fbbf24]">{item.voucherNo}</td>
                        <td className="font-semibold text-[#f1f5f9]">{item.party}</td>
                        <td>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#3b1717] text-[#f87171] border border-[#7f1d1d]">
                            {item.type === 'PAYMENT_NOT_CLEARED'
                              ? 'Cheque Issued But Not Cleared'
                              : 'Deposit In Transit'}
                          </span>
                        </td>
                        <td className="text-right font-mono font-bold text-[#f8fafc]">
                          ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Bank Statement Transactions */}
            <div className="bg-[#0e2c38] tally-panel-border p-3 space-y-2">
              <div className="text-[#38bdf8] font-bold">Imported Bank Statement Feed (MT940 / CSV)</div>
              <table className="tally-table">
                <thead>
                  <tr>
                    <th className="w-28">Date</th>
                    <th className="w-40">Cheque / Ref No</th>
                    <th>Narration / Bank Description</th>
                    <th className="w-32 text-right">Debit (₹)</th>
                    <th className="w-32 text-right">Credit (₹)</th>
                    <th className="w-32 text-right">Running Balance (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {bankStatements.map((stmt) => (
                    <tr key={stmt.id} className="tally-row">
                      <td className="text-[#8ba8b6] font-mono">{stmt.date}</td>
                      <td className="font-mono text-[#fbbf24]">{stmt.chequeOrRefNo}</td>
                      <td className="text-[#cbd5e1]">{stmt.description}</td>
                      <td className="text-right font-mono text-[#f87171]">
                        {stmt.debit > 0 ? `₹${stmt.debit.toLocaleString('en-IN')}` : '-'}
                      </td>
                      <td className="text-right font-mono text-[#10b981]">
                        {stmt.credit > 0 ? `₹${stmt.credit.toLocaleString('en-IN')}` : '-'}
                      </td>
                      <td className="text-right font-mono font-bold text-[#f8fafc]">
                        ₹{stmt.balance.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
