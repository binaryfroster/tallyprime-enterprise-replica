import test from 'node:test';
import assert from 'node:assert';
import { AccountingEngine } from '../src/core/accountingEngine';
import { PREDEFINED_GROUPS } from '../src/core/chartOfAccounts';
import { LedgerMaster, Voucher } from '../src/core/types';
import { InventoryEngine } from '../src/core/inventoryEngine';
import { AuditEngine } from '../src/core/auditEngine';

test('Benchmark & Stress: 10,000 High-Speed Voucher Batch & Balance Sheet Latency', () => {
  const engine = new AccountingEngine(PREDEFINED_GROUPS, [
    {
      id: 'led_cash',
      name: 'Cash',
      groupId: 'grp_cash_in_hand',
      openingBalance: 10000000, // Dr
      currency: 'INR',
      maintainBillByBill: false,
    },
    {
      id: 'led_sales',
      name: 'Sales',
      groupId: 'grp_sales_accounts',
      openingBalance: 0,
      currency: 'INR',
      maintainBillByBill: false,
    },
    {
      id: 'led_debtor',
      name: 'Alpha Customer',
      groupId: 'grp_sundry_debtors',
      openingBalance: 0,
      currency: 'INR',
      maintainBillByBill: true,
    },
    {
      id: 'led_capital',
      name: 'Owner Capital',
      groupId: 'grp_capital_account',
      openingBalance: -10000000, // Cr
      currency: 'INR',
      maintainBillByBill: false,
    }
  ]);

  const vouchers: Voucher[] = [];
  const VOUCHER_COUNT = 10000;

  const tStartGenerate = performance.now();
  for (let i = 1; i <= VOUCHER_COUNT; i++) {
    const amount = 100 + (i % 500);
    vouchers.push({
      id: `vch_stress_${i}`,
      voucherType: 'Sales',
      voucherNumber: `STR-${i}`,
      date: '2026-06-15',
      narration: `Stress voucher #${i}`,
      isCancelled: false,
      ledgerEntries: [
        {
          ledgerId: 'led_debtor',
          ledgerName: 'Alpha Customer',
          amount: amount, // Debit
        },
        {
          ledgerId: 'led_sales',
          ledgerName: 'Sales',
          amount: -amount, // Credit
        }
      ]
    });
  }
  const tEndGenerate = performance.now();

  // Test real-time balance sheet computation latency
  const tStartCalc = performance.now();
  const bs = engine.generateBalanceSheet(vouchers, 0);
  const tEndCalc = performance.now();
  const calcLatencyMs = tEndCalc - tStartCalc;

  // Invariant verification
  assert.strictEqual(bs.isBalanced, true, `Balance sheet must remain balanced with 10k vouchers. Diff: ${bs.difference}`);
  assert.strictEqual(bs.difference, 0);
  assert.strictEqual(bs.liabilities.total, bs.assets.total);

  // Performance assertions: 10k vouchers calculated in under 500ms (SLA target)
  assert.ok(calcLatencyMs < 500, `Balance sheet calculation for 10,000 vouchers took ${calcLatencyMs.toFixed(2)}ms (target < 500ms)`);
});

test('Fuzz Invariant Stress: 1,000 Randomized Multi-Line Vouchers Never Violate Double Entry', () => {
  const engine = new AccountingEngine(PREDEFINED_GROUPS, [
    { id: 'c1', name: 'Cash', groupId: 'grp_cash_in_hand', openingBalance: 50000000, currency: 'INR', maintainBillByBill: false },
    { id: 'b1', name: 'HDFC Bank', groupId: 'grp_bank_accounts', openingBalance: 50000000, currency: 'INR', maintainBillByBill: false },
    { id: 's1', name: 'Domestic Sales', groupId: 'grp_sales_accounts', openingBalance: 0, currency: 'INR', maintainBillByBill: false },
    { id: 'p1', name: 'Raw Material Purchase', groupId: 'grp_purchase_accounts', openingBalance: 0, currency: 'INR', maintainBillByBill: false },
    { id: 'd1', name: 'Debtor Corp', groupId: 'grp_sundry_debtors', openingBalance: 0, currency: 'INR', maintainBillByBill: true },
    { id: 'k1', name: 'Creditor LLC', groupId: 'grp_sundry_creditors', openingBalance: 0, currency: 'INR', maintainBillByBill: false },
    { id: 'cap', name: 'Share Capital', groupId: 'grp_capital_account', openingBalance: -100000000, currency: 'INR', maintainBillByBill: false },
  ]);

  const vouchers: Voucher[] = [];

  for (let i = 1; i <= 1000; i++) {
    // Generate randomized balanced transactions
    const amount1 = Math.round((Math.random() * 50000 + 10) * 100) / 100;
    const amount2 = Math.round((Math.random() * 25000 + 5) * 100) / 100;
    const totalCredit = Math.round((amount1 + amount2) * 100) / 100;

    const vch: Voucher = {
      id: `fuzz_${i}`,
      voucherType: 'Payment',
      voucherNumber: `FZ-${i}`,
      date: '2026-07-20',
      isCancelled: false,
      ledgerEntries: [
        { ledgerId: 'p1', ledgerName: 'Raw Material Purchase', amount: amount1 },
        { ledgerId: 'd1', ledgerName: 'Debtor Corp', amount: amount2 },
        { ledgerId: 'b1', ledgerName: 'HDFC Bank', amount: -totalCredit },
      ]
    };

    const val = AccountingEngine.validateVoucherDoubleEntry(vch);
    assert.strictEqual(val.isValid, true, `Voucher ${i} must satisfy Dr == Cr. Diff: ${val.diff}`);
    vouchers.push(vch);
  }

  const bs = engine.generateBalanceSheet(vouchers, 0);
  assert.strictEqual(bs.isBalanced, true, `Fuzz balance sheet must be balanced. Diff: ${bs.difference}`);
  assert.strictEqual(bs.difference, 0);
});

test('Audit Trail Chaining Stress: 1,000 Consecutive Events Maintain Cryptographic Verifiability', () => {
  const audit = new AuditEngine();

  for (let i = 1; i <= 1000; i++) {
    audit.recordChange({
      action: i % 10 === 0 ? 'DELETE' : i % 3 === 0 ? 'ALTER' : 'CREATE',
      entityType: 'VOUCHER',
      entityId: `vch_evt_${i}`,
      userId: 'auditor_usr',
      ipAddress: '127.0.0.1',
      diff: [{ field: 'status', oldValue: 'DRAFT', newValue: 'POSTED' }],
    });
  }

  const ver = audit.verifyIntegrity();
  assert.strictEqual(ver.isValid, true, 'Audit log chain of 1,000 events must be 100% cryptographically intact');
  assert.strictEqual(ver.brokenIndex, undefined);
  assert.strictEqual(audit.getLogs().length, 1000);
});
