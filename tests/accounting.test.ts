import assert from 'node:assert';
import test from 'node:test';
import { AccountingEngine } from '../src/core/accountingEngine';
import { PREDEFINED_GROUPS } from '../src/core/chartOfAccounts';
import {
  SAMPLE_LEDGERS,
  SAMPLE_VOUCHERS,
  SAMPLE_STOCK_ITEMS,
} from '../src/core/sampleCompany';
import { Voucher } from '../src/core/types';

test('Double-Entry Invariant: Valid voucher passes and balanced', () => {
  const vch = SAMPLE_VOUCHERS[0];
  const res = AccountingEngine.validateVoucherDoubleEntry(vch);
  assert.strictEqual(res.isValid, true);
  assert.strictEqual(res.diff, 0);
  assert.strictEqual(res.totalDebit, 1475000);
  assert.strictEqual(res.totalCredit, 1475000);
});

test('Double-Entry Invariant: Imbalanced voucher fails with error', () => {
  const badVoucher: Voucher = {
    id: 'vch_bad',
    voucherNumber: 'BAD/001',
    voucherType: 'JOURNAL',
    date: '2026-04-01',
    invoicingMode: 'AS_VOUCHER',
    totalVoucherAmount: 1000,
    ledgerEntries: [
      { id: '1', ledgerId: 'led_cash', ledgerName: 'Cash', amount: 1000 },
      { id: '2', ledgerId: 'led_capital', ledgerName: 'Capital', amount: -900 }, // Imbalanced!
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'test',
  };
  const res = AccountingEngine.validateVoucherDoubleEntry(badVoucher);
  assert.strictEqual(res.isValid, false);
  assert.strictEqual(res.diff, 100);
  assert.match(res.error || '', /Double-entry imbalance/);
});

test('Balance Sheet & Profit & Loss Real-Time Continuous Balancing', () => {
  const engine = new AccountingEngine(PREDEFINED_GROUPS, SAMPLE_LEDGERS);
  const closingStock = 10000000; // 1 Crore closing inventory valuation

  // Generate P&L
  const pnl = engine.generateProfitAndLoss(SAMPLE_VOUCHERS, closingStock, 0);
  assert.ok(pnl.trading.sales > 0, 'Sales should be recorded');
  assert.ok(pnl.trading.purchases > 0, 'Purchases should be recorded');
  assert.ok(pnl.trading.grossProfit > 0, 'Gross profit should be positive');
  assert.ok(pnl.incomeStatement.netProfit > 0, 'Net profit should be positive');

  // Generate Balance Sheet
  const bs = engine.generateBalanceSheet(SAMPLE_VOUCHERS, closingStock);
  assert.strictEqual(bs.isBalanced, true, `Balance sheet must balance. Diff: ${bs.difference}`);
  assert.strictEqual(bs.liabilities.total, bs.assets.total);
});

test('Bill-Wise Aging Analysis tracks unpaid invoices and overdue buckets', () => {
  const engine = new AccountingEngine(PREDEFINED_GROUPS, SAMPLE_LEDGERS);
  const aging = engine.generateBillWiseAging(SAMPLE_VOUCHERS, '2026-07-01');

  // TCS bill INV/2026/001 was paid in full via REC/2026/001
  const tcsBill = aging.find((b) => b.billRef === 'INV/2026/001');
  assert.strictEqual(tcsBill, undefined, 'Paid bill should not appear in pending receivables');

  // Infosys bill INV/2026/002 is still pending
  const infyBill = aging.find((b) => b.billRef === 'INV/2026/002');
  assert.ok(infyBill, 'Infosys pending bill must exist');
  assert.strictEqual(infyBill.pendingAmount, 737500);
  assert.ok(infyBill.overdueDays > 30, 'Overdue days should reflect passed time');
});

test('Ratio Analysis computes standard financial metrics', () => {
  const engine = new AccountingEngine(PREDEFINED_GROUPS, SAMPLE_LEDGERS);
  const ratios = engine.generateRatioAnalysis(SAMPLE_VOUCHERS, 10000000);
  assert.ok(ratios.currentRatio > 0);
  assert.ok(ratios.quickRatio > 0);
  assert.ok(ratios.workingCapital > 0);
  assert.ok(ratios.grossProfitMarginPercent > 0);
});

test('Balance Sheet Integrity: Customer Advance (Debtor with Cr balance) preserves fundamental accounting equation', () => {
  const customLedgers = [...SAMPLE_LEDGERS];
  // Add advance receipt from TCS exceeding invoice balance
  const advanceVoucher: Voucher = {
    id: 'vch_adv_001',
    voucherNumber: 'REC/2026/ADV',
    voucherType: 'RECEIPT',
    date: '2026-05-20',
    invoicingMode: 'AS_VOUCHER',
    totalVoucherAmount: 5000000, // 50 Lakhs advance received into bank
    ledgerEntries: [
      { id: 'le_1', ledgerId: 'led_hdfc_bank', ledgerName: 'HDFC Bank Current A/c', amount: 5000000, isDeemedPositive: true },
      { id: 'le_2', ledgerId: 'led_deb_tata', ledgerName: 'Tata Consultancy Services Ltd', amount: -5000000, isDeemedPositive: false },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'tester',
  };

  const engine = new AccountingEngine(PREDEFINED_GROUPS, customLedgers);
  const vouchers = [...SAMPLE_VOUCHERS, advanceVoucher];
  const bs = engine.generateBalanceSheet(vouchers, 10000000);

  assert.strictEqual(bs.isBalanced, true, `Balance sheet must remain 100% balanced with customer advance. Diff: ${bs.difference}`);
  assert.strictEqual(bs.difference, 0);
  assert.strictEqual(bs.liabilities.total, bs.assets.total);
});

test('Balance Sheet Integrity: Bank Overdraft (Bank with Cr balance) preserves fundamental accounting equation', () => {
  const overdraftVoucher: Voucher = {
    id: 'vch_od_001',
    voucherNumber: 'PMT/2026/OD',
    voucherType: 'PAYMENT',
    date: '2026-05-25',
    invoicingMode: 'AS_VOUCHER',
    totalVoucherAmount: 20000000, // 2 Crores paid out from bank, causing OD
    ledgerEntries: [
      { id: 'le_1', ledgerId: 'led_crd_intel', ledgerName: 'Intel India Private Limited', amount: 20000000, isDeemedPositive: true },
      { id: 'le_2', ledgerId: 'led_hdfc_bank', ledgerName: 'HDFC Bank Current A/c', amount: -20000000, isDeemedPositive: false },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'tester',
  };

  const engine = new AccountingEngine(PREDEFINED_GROUPS, SAMPLE_LEDGERS);
  const vouchers = [...SAMPLE_VOUCHERS, overdraftVoucher];
  const bs = engine.generateBalanceSheet(vouchers, 10000000);

  assert.strictEqual(bs.isBalanced, true, `Balance sheet must remain balanced with bank overdraft. Diff: ${bs.difference}`);
  assert.strictEqual(bs.difference, 0);
  assert.strictEqual(bs.liabilities.total, bs.assets.total);
});

test('Multi-Currency Engine: convertCurrency and forex gain/loss calculation', () => {
  const converted = AccountingEngine.convertCurrency(1000, 83.5);
  assert.strictEqual(converted, 83500);

  // Booking rate 82.0, Realization rate 83.5 on $10,000 receivable -> Gain of ₹15,000
  const forex = AccountingEngine.calculateForexGainLoss({
    bookingRate: 82.0,
    settlementRate: 83.5,
    foreignAmount: 10000,
    isReceivable: true,
  });

  assert.strictEqual(forex.isGain, true);
  assert.strictEqual(forex.gainLossAmount, 15000);
  assert.strictEqual(forex.forexGainLoss, 15000);
  assert.strictEqual(forex.settlementAmountInBase, 835000);

  // Dual convention test: foreignCurrencyAmount, settlementExchangeRate, bookingAmountInBase (Payable Loss)
  const payableForexLoss = AccountingEngine.calculateForexGainLoss({
    bookingAmountInBase: 820000,
    settlementExchangeRate: 83.5,
    foreignCurrencyAmount: 10000,
    isReceivable: false,
  });
  assert.strictEqual(payableForexLoss.isGain, false);
  assert.strictEqual(payableForexLoss.gainLossAmount, 15000);
  assert.strictEqual(payableForexLoss.forexGainLoss, 15000);
  assert.strictEqual(payableForexLoss.settlementAmountInBase, 835000);

  // Payable Gain: booked at 85.0, settled at 82.0 on $10,000 payable -> Gain of ₹30,000
  const payableForexGain = AccountingEngine.calculateForexGainLoss({
    bookingRate: 85.0,
    settlementRate: 82.0,
    foreignAmount: 10000,
    isReceivable: false,
  });
  assert.strictEqual(payableForexGain.isGain, true);
  assert.strictEqual(payableForexGain.gainLossAmount, 30000);
});


