import { BankStatementTransaction, Voucher, LedgerMaster } from './types';

export interface BRSReport {
  bankLedgerName: string;
  balanceAsPerCompanyBooks: number;
  amountsNotReflectedInBank: {
    voucherId: string;
    voucherNo: string;
    date: string;
    amount: number;
    party: string;
    type: 'PAYMENT_NOT_CLEARED' | 'RECEIPT_NOT_DEPOSITED';
  }[];
  amountsInBankNotReflectedInBooks: BankStatementTransaction[];
  balanceAsPerBank: number;
}

export class BankingEngine {
  /**
   * Parses standard CSV / MT940 format bank statement text
   */
  public static parseCsvBankStatement(csvText: string): BankStatementTransaction[] {
    const lines = csvText.trim().split('\n');
    const transactions: BankStatementTransaction[] = [];

    // Simple CSV parser: Date, Cheque/Ref, Description, Debit, Credit, Balance
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const parts = line.split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
      if (parts.length < 5) continue;

      const date = parts[0];
      const chequeOrRefNo = parts[1] || '';
      const description = parts[2] || '';
      const debit = parseFloat(parts[3]) || 0;
      const credit = parseFloat(parts[4]) || 0;
      const balance = parts[5] ? parseFloat(parts[5]) : 0;

      transactions.push({
        id: `stmt_${Date.now()}_${i}`,
        date,
        chequeOrRefNo,
        description,
        debit,
        credit,
        balance,
      });
    }

    return transactions;
  }

  /**
   * Generates real-time Bank Reconciliation Statement (BRS)
   */
  public static generateBRS(params: {
    bankLedger: LedgerMaster;
    vouchers: Voucher[];
    statementTransactions: BankStatementTransaction[];
  }): BRSReport {
    let bookBalance = params.bankLedger.openingBalance;

    const notInBank: BRSReport['amountsNotReflectedInBank'] = [];
    const statementMap = new Map<string, BankStatementTransaction>();
    params.statementTransactions.forEach((st) => {
      if (st.chequeOrRefNo) {
        statementMap.set(st.chequeOrRefNo.toLowerCase(), st);
      }
    });

    for (const vch of params.vouchers) {
      if (vch.isCancelled) continue;
      const entry = vch.ledgerEntries.find((e) => e.ledgerId === params.bankLedger.id);
      if (!entry) continue;

      bookBalance += entry.amount; // positive = Dr (bank balance increases), negative = Cr (bank balance decreases)

      const refNo = (vch.referenceNumber || vch.voucherNumber).toLowerCase();
      const matched = statementMap.get(refNo);

      if (!matched) {
        if (entry.amount < 0) {
          // Outward payment issued but not yet presented/cleared in bank
          notInBank.push({
            voucherId: vch.id,
            voucherNo: vch.voucherNumber,
            date: vch.date,
            amount: Math.abs(entry.amount),
            party: vch.partyName || 'Various',
            type: 'PAYMENT_NOT_CLEARED',
          });
        } else if (entry.amount > 0) {
          // Inward receipt deposited but not yet credited in bank
          notInBank.push({
            voucherId: vch.id,
            voucherNo: vch.voucherNumber,
            date: vch.date,
            amount: entry.amount,
            party: vch.partyName || 'Various',
            type: 'RECEIPT_NOT_DEPOSITED',
          });
        }
      }
    }

    // Amounts in bank not in books
    const unmatchedStmt = params.statementTransactions.filter((st) => {
      const found = params.vouchers.some(
        (v) =>
          (v.referenceNumber && v.referenceNumber.toLowerCase() === st.chequeOrRefNo.toLowerCase()) ||
          v.voucherNumber.toLowerCase() === st.chequeOrRefNo.toLowerCase()
      );
      return !found;
    });

    // Compute expected bank balance
    const uncreditedReceipts = notInBank
      .filter((i) => i.type === 'RECEIPT_NOT_DEPOSITED')
      .reduce((sum, i) => sum + i.amount, 0);
    const unpresentedPayments = notInBank
      .filter((i) => i.type === 'PAYMENT_NOT_CLEARED')
      .reduce((sum, i) => sum + i.amount, 0);

    const balanceAsPerBank = bookBalance - uncreditedReceipts + unpresentedPayments;

    return {
      bankLedgerName: params.bankLedger.name,
      balanceAsPerCompanyBooks: Math.round(bookBalance * 100) / 100,
      amountsNotReflectedInBank: notInBank,
      amountsInBankNotReflectedInBooks: unmatchedStmt,
      balanceAsPerBank: Math.round(balanceAsPerBank * 100) / 100,
    };
  }
}
