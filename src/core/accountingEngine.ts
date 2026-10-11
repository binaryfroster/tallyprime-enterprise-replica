import {
  AccountGroup,
  LedgerMaster,
  Voucher,
  BillAllocation,
  LedgerEntryLine,
} from './types';
import { PREDEFINED_GROUPS } from './chartOfAccounts';

export interface LedgerBalanceSummary {
  ledgerId: string;
  name: string;
  groupId: string;
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number; // positive = Dr, negative = Cr
}

export interface GroupBalanceSummary {
  groupId: string;
  name: string;
  parentGroupId: string | null;
  nature: string;
  isPrimary: boolean;
  totalDebit: number;
  totalCredit: number;
  netBalance: number;
  childGroups: GroupBalanceSummary[];
  ledgers: LedgerBalanceSummary[];
}

export interface BalanceSheetData {
  asOfDate: string;
  liabilities: {
    capitalAccount: number;
    reservesAndSurplus: number;
    netProfitCarried: number;
    loansLiability: number;
    currentLiabilities: number;
    sundryCreditors: number;
    dutiesAndTaxes: number;
    provisions: number;
    otherLiabilities: number;
    total: number;
  };
  assets: {
    fixedAssets: number;
    investments: number;
    currentAssets: number;
    closingStock: number;
    sundryDebtors: number;
    bankAccounts: number;
    cashInHand: number;
    deposits: number;
    loansAndAdvances: number;
    miscExpenses: number;
    otherAssets: number;
    total: number;
  };
  isBalanced: boolean;
  difference: number;
}

export interface ProfitLossData {
  periodFrom: string;
  periodTo: string;
  // Trading Account
  trading: {
    openingStock: number;
    purchases: number;
    directExpenses: number;
    sales: number;
    directIncomes: number;
    closingStock: number;
    grossProfit: number;
    grossLoss: number;
  };
  // Profit & Loss Account
  incomeStatement: {
    grossProfitBroughtDown: number;
    indirectIncomes: number;
    totalIncome: number;
    indirectExpenses: number;
    netProfit: number;
    netLoss: number;
  };
}

export interface BillOutstandingItem {
  partyLedgerId: string;
  partyName: string;
  billRef: string;
  billDate: string;
  originalAmount: number;
  clearedAmount: number;
  pendingAmount: number;
  overdueDays: number;
  agingBucket: '0-30' | '31-60' | '61-90' | '>90';
}

export interface RatioAnalysisData {
  currentRatio: number;
  quickRatio: number;
  debtEquityRatio: number;
  grossProfitMarginPercent: number;
  netProfitMarginPercent: number;
  workingCapital: number;
  returnOnCapitalEmployedPercent: number;
}

export class AccountingEngine {
  private groups: Map<string, AccountGroup> = new Map();
  private ledgers: Map<string, LedgerMaster> = new Map();

  constructor(groups: AccountGroup[] = PREDEFINED_GROUPS, ledgers: LedgerMaster[] = []) {
    groups.forEach((g) => this.groups.set(g.id, g));
    ledgers.forEach((l) => this.ledgers.set(l.id, l));
  }

  public registerGroup(group: AccountGroup) {
    this.groups.set(group.id, group);
  }

  public registerLedger(ledger: LedgerMaster) {
    this.ledgers.set(ledger.id, ledger);
  }

  public getLedger(id: string): LedgerMaster | undefined {
    return this.ledgers.get(id);
  }

  public getAllLedgers(): LedgerMaster[] {
    return Array.from(this.ledgers.values());
  }

  public getAllGroups(): AccountGroup[] {
    return Array.from(this.groups.values());
  }

  /**
   * Double-Entry validation rule: Sum(Debits) must equal Sum(Credits)
   */
  public static validateVoucherDoubleEntry(voucher: Voucher): {
    isValid: boolean;
    totalDebit: number;
    totalCredit: number;
    diff: number;
    error?: string;
  } {
    let totalDebit = 0;
    let totalCredit = 0;

    for (const entry of voucher.ledgerEntries) {
      if (entry.amount > 0) {
        totalDebit += entry.amount;
      } else {
        totalCredit += Math.abs(entry.amount);
      }
    }

    const diff = Math.round(Math.abs(totalDebit - totalCredit) * 100) / 100;
    const isValid = diff < 0.01;

    return {
      isValid,
      totalDebit: Math.round(totalDebit * 100) / 100,
      totalCredit: Math.round(totalCredit * 100) / 100,
      diff,
      error: isValid ? undefined : `Double-entry imbalance: Total Dr (${totalDebit}) does not equal Total Cr (${totalCredit})`,
    };
  }

  /**
   * Calculates closing balance for all ledgers up to a given date
   */
  public calculateLedgerBalances(
    vouchers: Voucher[],
    asOfDate?: string
  ): Map<string, LedgerBalanceSummary> {
    const balances = new Map<string, LedgerBalanceSummary>();

    // Initialize with opening balances
    this.ledgers.forEach((l) => {
      balances.set(l.id, {
        ledgerId: l.id,
        name: l.name,
        groupId: l.groupId,
        openingBalance: l.openingBalance,
        totalDebit: 0,
        totalCredit: 0,
        closingBalance: l.openingBalance,
      });
    });

    for (let i = 0; i < vouchers.length; i++) {
      const vch = vouchers[i];
      if (vch.isCancelled) continue;
      if (asOfDate && vch.date > asOfDate) continue;

      const entries = vch.ledgerEntries;
      for (let j = 0; j < entries.length; j++) {
        const entry = entries[j];
        let record = balances.get(entry.ledgerId);
        if (!record) {
          // Dynamic fallback for any ad-hoc ledger
          record = {
            ledgerId: entry.ledgerId,
            name: entry.ledgerName,
            groupId: 'grp_suspense_account',
            openingBalance: 0,
            totalDebit: 0,
            totalCredit: 0,
            closingBalance: 0,
          };
          balances.set(entry.ledgerId, record);
        }

        if (entry.amount > 0) {
          record.totalDebit += entry.amount;
          record.closingBalance += entry.amount;
        } else {
          record.totalCredit += Math.abs(entry.amount);
          record.closingBalance += entry.amount; // entry.amount is negative
        }
      }
    }

    // Clean up floating point rounding
    balances.forEach((rec) => {
      rec.totalDebit = Math.round(rec.totalDebit * 100) / 100;
      rec.totalCredit = Math.round(rec.totalCredit * 100) / 100;
      rec.closingBalance = Math.round(rec.closingBalance * 100) / 100;
    });

    return balances;
  }

  /**
   * Generates real-time Profit and Loss statement
   */
  public generateProfitAndLoss(
    vouchers: Voucher[],
    closingStockValue: number = 0,
    openingStockValue: number = 0,
    periodFrom: string = '2026-04-01',
    periodTo: string = '2027-03-31'
  ): ProfitLossData {
    const balances = this.calculateLedgerBalances(vouchers, periodTo);

    let sales = 0;
    let purchases = 0;
    let directExpenses = 0;
    let directIncomes = 0;
    let indirectExpenses = 0;
    let indirectIncomes = 0;

    balances.forEach((b) => {
      const group = this.groups.get(b.groupId);
      if (!group) return;

      const primary = this.getPrimaryGroup(group.id);
      if (!primary) return;

      // Income groups normally have Credit (negative) closing balances
      // Expense groups normally have Debit (positive) closing balances
      if (primary.id === 'grp_sales_accounts') {
        sales += Math.abs(b.closingBalance);
      } else if (primary.id === 'grp_purchase_accounts') {
        purchases += Math.abs(b.closingBalance);
      } else if (primary.id === 'grp_direct_incomes') {
        directIncomes += Math.abs(b.closingBalance);
      } else if (primary.id === 'grp_direct_expenses') {
        directExpenses += Math.abs(b.closingBalance);
      } else if (primary.id === 'grp_indirect_incomes') {
        indirectIncomes += Math.abs(b.closingBalance);
      } else if (primary.id === 'grp_indirect_expenses') {
        indirectExpenses += Math.abs(b.closingBalance);
      }
    });

    // Trading Account:
    // Credits: Sales + Direct Incomes + Closing Stock
    // Debits: Opening Stock + Purchases + Direct Expenses
    const tradingCredits = sales + directIncomes + closingStockValue;
    const tradingDebits = openingStockValue + purchases + directExpenses;
    const tradingDiff = tradingCredits - tradingDebits;

    const grossProfit = tradingDiff >= 0 ? Math.round(tradingDiff * 100) / 100 : 0;
    const grossLoss = tradingDiff < 0 ? Math.round(Math.abs(tradingDiff) * 100) / 100 : 0;

    // Profit & Loss:
    // Total Income = Gross Profit + Indirect Incomes
    // Total Expenses = Gross Loss + Indirect Expenses
    const totalIncome = grossProfit + indirectIncomes;
    const totalExpenses = grossLoss + indirectExpenses;
    const netDiff = totalIncome - totalExpenses;

    const netProfit = netDiff >= 0 ? Math.round(netDiff * 100) / 100 : 0;
    const netLoss = netDiff < 0 ? Math.round(Math.abs(netDiff) * 100) / 100 : 0;

    return {
      periodFrom,
      periodTo,
      trading: {
        openingStock: Math.round(openingStockValue * 100) / 100,
        purchases: Math.round(purchases * 100) / 100,
        directExpenses: Math.round(directExpenses * 100) / 100,
        sales: Math.round(sales * 100) / 100,
        directIncomes: Math.round(directIncomes * 100) / 100,
        closingStock: Math.round(closingStockValue * 100) / 100,
        grossProfit,
        grossLoss,
      },
      incomeStatement: {
        grossProfitBroughtDown: grossProfit,
        indirectIncomes: Math.round(indirectIncomes * 100) / 100,
        totalIncome: Math.round(totalIncome * 100) / 100,
        indirectExpenses: Math.round(indirectExpenses * 100) / 100,
        netProfit,
        netLoss,
      },
    };
  }

  /**
   * Generates real-time Balance Sheet with dynamic Net Profit injection into Reserves & Surplus
   */
  public generateBalanceSheet(
    vouchers: Voucher[],
    closingStockValue: number = 0,
    asOfDate?: string
  ): BalanceSheetData {
    const balances = this.calculateLedgerBalances(vouchers, asOfDate);
    const pnl = this.generateProfitAndLoss(vouchers, closingStockValue, 0, undefined, asOfDate);
    const netProfitCarried = pnl.incomeStatement.netProfit - pnl.incomeStatement.netLoss;

    let capitalAccount = 0;
    let reservesAndSurplus = 0;
    let loansLiability = 0;
    let currentLiabilities = 0;
    let sundryCreditors = 0;
    let dutiesAndTaxes = 0;
    let provisions = 0;
    let otherLiabilities = 0;

    let fixedAssets = 0;
    let investments = 0;
    let currentAssets = 0;
    let sundryDebtors = 0;
    let bankAccounts = 0;
    let cashInHand = 0;
    let deposits = 0;
    let loansAndAdvances = 0;
    let miscExpenses = 0;
    let otherAssets = 0;

    balances.forEach((b) => {
      const group = this.groups.get(b.groupId);
      if (!group) return;

      const primary = this.getPrimaryGroup(group.id);
      if (!primary) return;

      // Skip P&L accounts from direct balance sheet mapping (they flow via Net Profit)
      if (
        primary.nature === 'Income' ||
        primary.nature === 'Expense' ||
        primary.id === 'grp_sales_accounts' ||
        primary.id === 'grp_purchase_accounts'
      ) {
        return;
      }

      const bal = b.closingBalance;
      if (bal === 0) return;

      // Debit balance (> 0) represents an Asset (or contra-liability reduction)
      // Credit balance (< 0) represents a Liability (or contra-asset reduction)
      if (group.id === 'grp_capital_account') {
        capitalAccount += -bal; // Credit is positive capital, Debit reduces it
      } else if (group.id === 'grp_reserves_surplus') {
        reservesAndSurplus += -bal; // Credit is positive reserve, Debit reduces it
      } else if (group.id === 'grp_sundry_creditors') {
        if (bal < 0) {
          sundryCreditors += Math.abs(bal);
        } else {
          // Debit balance in Creditor = Advance paid to Supplier -> Current Assets
          loansAndAdvances += bal;
        }
      } else if (group.id === 'grp_duties_taxes') {
        if (bal < 0) {
          dutiesAndTaxes += Math.abs(bal);
        } else {
          // Debit balance in Duties & Taxes = Input Tax Credit -> Current Assets
          otherAssets += bal;
        }
      } else if (group.id === 'grp_provisions') {
        if (bal < 0) {
          provisions += Math.abs(bal);
        } else {
          otherAssets += bal;
        }
      } else if (primary.id === 'grp_loans_liability') {
        if (bal < 0) {
          loansLiability += Math.abs(bal);
        } else {
          loansAndAdvances += bal;
        }
      } else if (primary.id === 'grp_current_liabilities') {
        if (bal < 0) {
          otherLiabilities += Math.abs(bal);
        } else {
          otherAssets += bal;
        }
      } else if (primary.id === 'grp_fixed_assets') {
        if (bal > 0) {
          fixedAssets += bal;
        } else {
          // Accumulated depreciation / credit balance
          fixedAssets += bal;
        }
      } else if (primary.id === 'grp_investments') {
        if (bal > 0) {
          investments += bal;
        } else {
          otherLiabilities += Math.abs(bal);
        }
      } else if (group.id === 'grp_sundry_debtors') {
        if (bal > 0) {
          sundryDebtors += bal;
        } else {
          // Credit balance in Debtor = Advance received from Customer -> Current Liabilities
          otherLiabilities += Math.abs(bal);
        }
      } else if (group.id === 'grp_bank_accounts') {
        if (bal > 0) {
          bankAccounts += bal;
        } else {
          // Negative bank balance = Bank Overdraft -> Loans / Liability
          loansLiability += Math.abs(bal);
        }
      } else if (group.id === 'grp_cash_in_hand') {
        if (bal > 0) {
          cashInHand += bal;
        } else {
          otherLiabilities += Math.abs(bal);
        }
      } else if (group.id === 'grp_deposits_asset') {
        if (bal > 0) {
          deposits += bal;
        } else {
          otherLiabilities += Math.abs(bal);
        }
      } else if (group.id === 'grp_loans_advances_asset') {
        if (bal > 0) {
          loansAndAdvances += bal;
        } else {
          otherLiabilities += Math.abs(bal);
        }
      } else if (primary.id === 'grp_misc_expenses') {
        if (bal > 0) {
          miscExpenses += bal;
        } else {
          reservesAndSurplus += -bal;
        }
      } else if (primary.id === 'grp_current_assets') {
        if (bal > 0) {
          otherAssets += bal;
        } else {
          otherLiabilities += Math.abs(bal);
        }
      } else {
        if (bal < 0) {
          otherLiabilities += Math.abs(bal);
        } else {
          otherAssets += bal;
        }
      }
    });

    currentLiabilities = sundryCreditors + dutiesAndTaxes + provisions + otherLiabilities;
    currentAssets =
      closingStockValue +
      sundryDebtors +
      bankAccounts +
      cashInHand +
      deposits +
      loansAndAdvances +
      otherAssets;

    const totalLiabilities =
      capitalAccount + reservesAndSurplus + netProfitCarried + loansLiability + currentLiabilities;
    const totalAssets = fixedAssets + investments + currentAssets + miscExpenses;

    const diff = Math.round(Math.abs(totalLiabilities - totalAssets) * 100) / 100;

    return {
      asOfDate: asOfDate || new Date().toISOString().split('T')[0],
      liabilities: {
        capitalAccount: Math.round(capitalAccount * 100) / 100,
        reservesAndSurplus: Math.round(reservesAndSurplus * 100) / 100,
        netProfitCarried: Math.round(netProfitCarried * 100) / 100,
        loansLiability: Math.round(loansLiability * 100) / 100,
        currentLiabilities: Math.round(currentLiabilities * 100) / 100,
        sundryCreditors: Math.round(sundryCreditors * 100) / 100,
        dutiesAndTaxes: Math.round(dutiesAndTaxes * 100) / 100,
        provisions: Math.round(provisions * 100) / 100,
        otherLiabilities: Math.round(otherLiabilities * 100) / 100,
        total: Math.round(totalLiabilities * 100) / 100,
      },
      assets: {
        fixedAssets: Math.round(fixedAssets * 100) / 100,
        investments: Math.round(investments * 100) / 100,
        currentAssets: Math.round(currentAssets * 100) / 100,
        closingStock: Math.round(closingStockValue * 100) / 100,
        sundryDebtors: Math.round(sundryDebtors * 100) / 100,
        bankAccounts: Math.round(bankAccounts * 100) / 100,
        cashInHand: Math.round(cashInHand * 100) / 100,
        deposits: Math.round(deposits * 100) / 100,
        loansAndAdvances: Math.round(loansAndAdvances * 100) / 100,
        miscExpenses: Math.round(miscExpenses * 100) / 100,
        otherAssets: Math.round(otherAssets * 100) / 100,
        total: Math.round(totalAssets * 100) / 100,
      },
      isBalanced: diff < 0.05,
      difference: diff,
    };
  }

  /**
   * Multi-Currency & Forex Gain/Loss Engine
   */
  public static convertCurrency(
    amount: number,
    fromRate: number,
    toRate: number = 1.0
  ): number {
    if (fromRate <= 0 || toRate <= 0) return amount;
    return Math.round(((amount * fromRate) / toRate) * 100) / 100;
  }

  public static calculateForexGainLoss(params: {
    bookingAmountInBase?: number;
    bookingRate?: number;
    foreignCurrencyAmount?: number;
    foreignAmount?: number;
    settlementExchangeRate?: number;
    settlementRate?: number;
    settlementAmountInBase?: number;
    isReceivable: boolean;
  }): {
    isGain: boolean;
    gainLossAmount: number;
    forexGainLoss: number;
    settlementAmountInBase: number;
    bookingAmountInBase?: number;
  } {
    const foreignAmount = params.foreignAmount ?? params.foreignCurrencyAmount ?? 0;
    const settlementRate = params.settlementRate ?? params.settlementExchangeRate ?? 0;

    const bookingAmountInBase =
      params.bookingRate !== undefined && (params.foreignAmount !== undefined || params.foreignCurrencyAmount !== undefined)
        ? Math.round(foreignAmount * params.bookingRate * 100) / 100
        : (params.bookingAmountInBase ?? Math.round(foreignAmount * (params.bookingRate ?? 0) * 100) / 100);

    const settlementAmountInBase =
      params.settlementAmountInBase !== undefined
        ? params.settlementAmountInBase
        : Math.round(foreignAmount * settlementRate * 100) / 100;

    const diff = Math.round((settlementAmountInBase - bookingAmountInBase) * 100) / 100;

    // For receivables: receiving more base currency than booked is a GAIN
    // For payables: paying more base currency than booked is a LOSS
    const isGain = params.isReceivable ? diff >= 0 : diff <= 0;
    const forexGainLoss = Math.abs(diff) || 0;

    return {
      isGain,
      gainLossAmount: forexGainLoss,
      forexGainLoss,
      settlementAmountInBase,
      bookingAmountInBase,
    };
  }

  /**
   * Generates bill-wise aging analysis for Receivables and Payables
   */
  public generateBillWiseAging(
    vouchers: Voucher[],
    asOfDate?: string
  ): BillOutstandingItem[] {
    const today = asOfDate || new Date().toISOString().split('T')[0];
    const billMap = new Map<string, BillOutstandingItem>();

    for (const vch of vouchers) {
      if (vch.isCancelled) continue;

      for (const entry of vch.ledgerEntries) {
        if (!entry.billAllocations) continue;

        const ledger = this.ledgers.get(entry.ledgerId);
        const partyName = ledger ? ledger.name : entry.ledgerName;

        for (const alloc of entry.billAllocations) {
          const key = `${entry.ledgerId}:${alloc.refName}`;

          if (alloc.type === 'New Ref') {
            const billDate = alloc.dueDate || vch.date;
            const diffTime = Math.abs(new Date(today).getTime() - new Date(billDate).getTime());
            const overdueDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            let bucket: '0-30' | '31-60' | '61-90' | '>90' = '0-30';
            if (overdueDays > 90) bucket = '>90';
            else if (overdueDays > 60) bucket = '61-90';
            else if (overdueDays > 30) bucket = '31-60';

            billMap.set(key, {
              partyLedgerId: entry.ledgerId,
              partyName,
              billRef: alloc.refName,
              billDate,
              originalAmount: Math.abs(alloc.amount),
              clearedAmount: 0,
              pendingAmount: Math.abs(alloc.amount),
              overdueDays,
              agingBucket: bucket,
            });
          } else if (alloc.type === 'Agst Ref') {
            const existing = billMap.get(key);
            if (existing) {
              existing.clearedAmount += Math.abs(alloc.amount);
              existing.pendingAmount = Math.max(0, existing.originalAmount - existing.clearedAmount);
            }
          }
        }
      }
    }

    return Array.from(billMap.values()).filter((item) => item.pendingAmount > 0.01);
  }

  /**
   * Generates financial Ratio Analysis
   */
  public generateRatioAnalysis(
    vouchers: Voucher[],
    closingStockValue: number = 0,
    asOfDate?: string
  ): RatioAnalysisData {
    const bs = this.generateBalanceSheet(vouchers, closingStockValue, asOfDate);
    const pnl = this.generateProfitAndLoss(vouchers, closingStockValue, 0, undefined, asOfDate);

    const ca = bs.assets.currentAssets;
    const cl = bs.liabilities.currentLiabilities;
    const stock = bs.assets.closingStock;
    const sales = pnl.trading.sales;
    const netProfit = pnl.incomeStatement.netProfit - pnl.incomeStatement.netLoss;
    const grossProfit = pnl.trading.grossProfit;
    const netWorth = bs.liabilities.capitalAccount + bs.liabilities.reservesAndSurplus + bs.liabilities.netProfitCarried;
    const totalDebt = bs.liabilities.loansLiability;

    const currentRatio = cl > 0 ? Math.round((ca / cl) * 100) / 100 : 0;
    const quickRatio = cl > 0 ? Math.round(((ca - stock) / cl) * 100) / 100 : 0;
    const debtEquityRatio = netWorth > 0 ? Math.round((totalDebt / netWorth) * 100) / 100 : 0;
    const gpMargin = sales > 0 ? Math.round((grossProfit / sales) * 10000) / 100 : 0;
    const npMargin = sales > 0 ? Math.round((netProfit / sales) * 10000) / 100 : 0;
    const workingCapital = ca - cl;
    const roce = netWorth > 0 ? Math.round((netProfit / netWorth) * 10000) / 100 : 0;

    return {
      currentRatio,
      quickRatio,
      debtEquityRatio,
      grossProfitMarginPercent: gpMargin,
      netProfitMarginPercent: npMargin,
      workingCapital,
      returnOnCapitalEmployedPercent: roce,
    };
  }

  /**
   * Helper to resolve the top-level Primary Group
   */
  public getPrimaryGroup(groupId: string): AccountGroup | null {
    let current = this.groups.get(groupId);
    if (!current) return null;

    let depth = 0;
    while (!current.isPrimary && current.parentGroupId && depth < 10) {
      const parent = this.groups.get(current.parentGroupId);
      if (!parent) break;
      current = parent;
      depth++;
    }

    return current;
  }
}
