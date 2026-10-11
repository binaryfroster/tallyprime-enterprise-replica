import { Voucher, LedgerMaster, AccountGroup } from './types';
import { AccountingEngine } from './accountingEngine';

export interface MonthlyBreakdown {
  monthName: string;
  monthIndex: number; // 0-11
  year: number;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  voucherCount: number;
}

export class DrilldownEngine {
  /**
   * Drills into a group: returns immediate child groups and direct ledgers with balances
   */
  public static drillIntoGroup(params: {
    groupId: string;
    engine: AccountingEngine;
    vouchers: Voucher[];
  }): {
    group: AccountGroup | undefined;
    childGroups: { group: AccountGroup; debit: number; credit: number; balance: number }[];
    ledgers: { ledger: LedgerMaster; debit: number; credit: number; balance: number }[];
  } {
    const allGroups = params.engine.getAllGroups();
    const allLedgers = params.engine.getAllLedgers();
    const balances = params.engine.calculateLedgerBalances(params.vouchers);

    const targetGroup = allGroups.find((g) => g.id === params.groupId);
    const childGroups = allGroups.filter((g) => g.parentGroupId === params.groupId);
    const groupLedgers = allLedgers.filter((l) => l.groupId === params.groupId);

    const childGroupSummaries = childGroups.map((cg) => {
      // recursively aggregate ledgers in this child group and all its descendant sub-groups
      const descendantGroupIds = new Set<string>([cg.id]);
      const addChildren = (parentId: string) => {
        allGroups
          .filter((g) => g.parentGroupId === parentId)
          .forEach((child) => {
            descendantGroupIds.add(child.id);
            addChildren(child.id);
          });
      };
      addChildren(cg.id);

      const cLedgers = allLedgers.filter((l) => descendantGroupIds.has(l.groupId));
      let dr = 0, cr = 0, bal = 0;
      cLedgers.forEach((cl) => {
        const b = balances.get(cl.id);
        if (b) {
          dr += b.totalDebit;
          cr += b.totalCredit;
          bal += b.closingBalance;
        }
      });
      return {
        group: cg,
        debit: Math.round(dr * 100) / 100,
        credit: Math.round(cr * 100) / 100,
        balance: Math.round(bal * 100) / 100,
      };
    });

    const ledgerSummaries = groupLedgers.map((l) => {
      const b = balances.get(l.id) || {
        totalDebit: 0,
        totalCredit: 0,
        closingBalance: l.openingBalance,
      };
      return {
        ledger: l,
        debit: b.totalDebit,
        credit: b.totalCredit,
        balance: b.closingBalance,
      };
    });

    return {
      group: targetGroup,
      childGroups: childGroupSummaries,
      ledgers: ledgerSummaries,
    };
  }

  /**
   * Drills into a ledger: returns monthly breakdown (April to March in Indian Fiscal Year)
   */
  public static drillIntoLedgerMonthly(params: {
    ledgerId: string;
    vouchers: Voucher[];
    financialYear: number; // e.g. 2026 for 2026-2027
    openingBalance: number;
  }): MonthlyBreakdown[] {
    const monthNames = [
      'April', 'May', 'June', 'July', 'August', 'September',
      'October', 'November', 'December', 'January', 'February', 'March'
    ];
    // Month indices in calendar year: [3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2]
    const calendarMonthIndices = [3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2];

    let runningBalance = params.openingBalance;
    const result: MonthlyBreakdown[] = [];

    const activeVouchers = params.vouchers.filter((v) => !v.isCancelled);

    for (let i = 0; i < 12; i++) {
      const mIdx = calendarMonthIndices[i];
      const yr = mIdx >= 3 ? params.financialYear : params.financialYear + 1;

      let monthDebit = 0;
      let monthCredit = 0;
      let count = 0;

      for (const vch of activeVouchers) {
        const parts = vch.date.split('-');
        const vYr = parseInt(parts[0], 10);
        const vMIdx = parseInt(parts[1], 10) - 1;
        if (vMIdx === mIdx && vYr === yr) {
          const entry = vch.ledgerEntries.find((e) => e.ledgerId === params.ledgerId);
          if (entry) {
            count++;
            if (entry.amount > 0) {
              monthDebit += entry.amount;
              runningBalance += entry.amount;
            } else {
              monthCredit += Math.abs(entry.amount);
              runningBalance += entry.amount;
            }
          }
        }
      }

      result.push({
        monthName: monthNames[i],
        monthIndex: mIdx,
        year: yr,
        totalDebit: Math.round(monthDebit * 100) / 100,
        totalCredit: Math.round(monthCredit * 100) / 100,
        closingBalance: Math.round(runningBalance * 100) / 100,
        voucherCount: count,
      });
    }

    return result;
  }

  /**
   * Drills into a specific month for a ledger: returns chronological voucher register
   */
  public static drillIntoMonthVouchers(params: {
    ledgerId: string;
    vouchers: Voucher[];
    monthIndex: number;
    year: number;
  }): {
    voucher: Voucher;
    particulars: string;
    voucherType: string;
    voucherNo: string;
    debit: number;
    credit: number;
  }[] {
    const list: any[] = [];
    const active = params.vouchers
      .filter((v) => !v.isCancelled)
      .sort((a, b) => a.date.localeCompare(b.date));

    for (const vch of active) {
      const parts = vch.date.split('-');
      const vYr = parseInt(parts[0], 10);
      const vMIdx = parseInt(parts[1], 10) - 1;
      if (vMIdx === params.monthIndex && vYr === params.year) {
        const entry = vch.ledgerEntries.find((e) => e.ledgerId === params.ledgerId);
        if (entry) {
          // Counter-party particulars (e.g. Sales, Cash, Bank)
          const other = vch.ledgerEntries.find((e) => e.ledgerId !== params.ledgerId);
          list.push({
            voucher: vch,
            particulars: other ? other.ledgerName : (vch.partyName || 'Journal Adjustment'),
            voucherType: vch.voucherType,
            voucherNo: vch.voucherNumber,
            debit: entry.amount > 0 ? entry.amount : 0,
            credit: entry.amount < 0 ? Math.abs(entry.amount) : 0,
          });
        }
      }
    }

    return list;
  }
}
