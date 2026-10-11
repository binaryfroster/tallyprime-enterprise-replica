import assert from 'node:assert';
import test from 'node:test';
import { DrilldownEngine } from '../src/core/drilldownEngine';
import { AccountingEngine } from '../src/core/accountingEngine';
import { PREDEFINED_GROUPS } from '../src/core/chartOfAccounts';
import { SAMPLE_LEDGERS, SAMPLE_VOUCHERS } from '../src/core/sampleCompany';

test('Recursive Drill-Down: Group -> Subgroups & Ledgers', () => {
  const engine = new AccountingEngine(PREDEFINED_GROUPS, SAMPLE_LEDGERS);
  const result = DrilldownEngine.drillIntoGroup({
    groupId: 'grp_current_assets',
    engine,
    vouchers: SAMPLE_VOUCHERS,
  });

  assert.ok(result.group);
  assert.strictEqual(result.group.name, 'Current Assets');
  assert.ok(result.childGroups.length > 0);

  // Subgroups like Bank Accounts, Sundry Debtors
  const debtors = result.childGroups.find((g) => g.group.id === 'grp_sundry_debtors');
  assert.ok(debtors);
});

test('Recursive Drill-Down: Ledger -> Monthly Summary', () => {
  const monthly = DrilldownEngine.drillIntoLedgerMonthly({
    ledgerId: 'led_deb_tata',
    vouchers: SAMPLE_VOUCHERS,
    financialYear: 2026,
    openingBalance: 2400000,
  });

  assert.strictEqual(monthly.length, 12);
  const april = monthly[0]; // April
  assert.strictEqual(april.monthName, 'April');
  assert.ok(april.voucherCount > 0, 'Tata Consultancy Services had transactions in April');
  assert.ok(april.totalDebit > 0);
  assert.ok(april.totalCredit > 0);
});

test('Recursive Drill-Down: Month -> Voucher Register', () => {
  const vouchers = DrilldownEngine.drillIntoMonthVouchers({
    ledgerId: 'led_deb_tata',
    vouchers: SAMPLE_VOUCHERS,
    monthIndex: 3, // April
    year: 2026,
  });

  assert.ok(vouchers.length >= 2, 'Should find Sales invoice and Receipt voucher for Tata');
  const sales = vouchers.find((v) => v.voucherType === 'SALES');
  const receipt = vouchers.find((v) => v.voucherType === 'RECEIPT');
  assert.ok(sales);
  assert.ok(receipt);
  assert.strictEqual(sales.debit, 1475000);
  assert.strictEqual(receipt.credit, 1475000);
});

test('Recursive Drill-Down: Grandchild subgroup balances roll up into parent group', () => {
  // Create nested hierarchy: Primary -> Level1 -> Level2 -> Ledger
  const customGroups = [
    { id: 'grp_p', name: 'Primary Group', nature: 'ASSETS' as const, isPrimary: true, sortOrder: 1 },
    { id: 'grp_l1', name: 'Level 1 Subgroup', parentGroupId: 'grp_p', nature: 'ASSETS' as const, isPrimary: false, sortOrder: 2 },
    { id: 'grp_l2', name: 'Level 2 Subgroup', parentGroupId: 'grp_l1', nature: 'ASSETS' as const, isPrimary: false, sortOrder: 3 },
  ];
  const customLedgers = [
    { id: 'led_deep', name: 'Deep Ledger', groupId: 'grp_l2', openingBalance: 50000, currency: 'INR' },
  ];

  const engine = new AccountingEngine(customGroups, customLedgers);
  const result = DrilldownEngine.drillIntoGroup({
    groupId: 'grp_p',
    engine,
    vouchers: [],
  });

  // Level 1 Subgroup should show balance of 50000 rolled up from Level 2 Subgroup
  const l1 = result.childGroups.find((g) => g.group.id === 'grp_l1');
  assert.ok(l1, 'Level 1 subgroup must be present');
  assert.strictEqual(l1.balance, 50000, 'Grandchild ledger balance must roll up into child group total');
});

test('Timezone Robustness: Date splitting handles 1st of month without off-by-one shifts', () => {
  const vchOnFirst: Voucher = {
    id: 'vch_first_day',
    voucherNumber: 'VCH/001',
    voucherType: 'JOURNAL',
    date: '2026-05-01', // May 1st
    invoicingMode: 'AS_VOUCHER',
    totalVoucherAmount: 1000,
    ledgerEntries: [
      { id: '1', ledgerId: 'led_test', ledgerName: 'Test', amount: 1000, isDeemedPositive: true },
      { id: '2', ledgerId: 'led_other', ledgerName: 'Other', amount: -1000, isDeemedPositive: false },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'test',
  };

  const monthly = DrilldownEngine.drillIntoLedgerMonthly({
    ledgerId: 'led_test',
    vouchers: [vchOnFirst],
    financialYear: 2026,
    openingBalance: 0,
  });

  // Index 0 is April, Index 1 is May
  const may = monthly[1];
  assert.strictEqual(may.monthName, 'May');
  assert.strictEqual(may.voucherCount, 1, 'Voucher on 2026-05-01 must land in May, never April');
  assert.strictEqual(may.totalDebit, 1000);

  const april = monthly[0];
  assert.strictEqual(april.voucherCount, 0, 'April must have 0 vouchers');
});

