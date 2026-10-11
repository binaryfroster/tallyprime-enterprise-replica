import assert from 'node:assert';
import test from 'node:test';
import { TallyStore } from '../src/core/tallyStore';
import { Voucher } from '../src/core/types';
import { DrilldownEngine } from '../src/core/drilldownEngine';
import { StatutoryEngine } from '../src/core/statutoryEngine';

test('Full Integration: Voucher creation -> Synchronous Balance Sheet & P&L recalculation -> Audit Trail -> Drill-down', () => {
  const store = new TallyStore();

  // 1. Initial State Check
  const initialBS = store.getBalanceSheet();
  const initialPnl = store.getProfitAndLoss();
  assert.strictEqual(initialBS.isBalanced, true);
  const initialSales = initialPnl.trading.sales;

  // 2. Record New Sales Voucher
  const salesVch: Voucher = {
    id: `vch_int_001`,
    voucherNumber: 'INV/2026/999',
    voucherType: 'SALES',
    date: '2026-06-15',
    invoicingMode: 'ITEM_INVOICE',
    partyLedgerId: 'led_deb_tata',
    partyName: 'Tata Consultancy Services Ltd',
    narration: 'Integration Test Sales Invoice',
    totalTaxableAmount: 100000,
    cgstAmount: 9000,
    sgstAmount: 9000,
    igstAmount: 0,
    totalVoucherAmount: 118000,
    ledgerEntries: [
      {
        id: 'le_deb',
        ledgerId: 'led_deb_tata',
        ledgerName: 'Tata Consultancy Services Ltd',
        amount: 118000,
        isDeemedPositive: true,
      },
      {
        id: 'le_sales',
        ledgerId: 'led_sales_domestic',
        ledgerName: 'Domestic Hardware Sales 18%',
        amount: -100000,
        isDeemedPositive: false,
      },
      {
        id: 'le_cgst',
        ledgerId: 'led_cgst_output',
        ledgerName: 'Output CGST 9%',
        amount: -9000,
        isDeemedPositive: false,
      },
      {
        id: 'le_sgst',
        ledgerId: 'led_sgst_output',
        ledgerName: 'Output SGST 9%',
        amount: -9000,
        isDeemedPositive: false,
      },
    ],
    inventoryEntries: [
      {
        id: 'ie_srv',
        stockItemId: 'item_server_blade',
        stockItemName: 'Acme Apex Cloud Server Blade X1',
        godownId: 'g_prod',
        actualQty: 1,
        billedQty: 1,
        unit: 'Nos',
        rate: 100000,
        amount: 100000,
        hsnCode: '84715000',
        gstRate: 18,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'integration_tester',
  };

  const addResult = store.addVoucher(salesVch);
  assert.strictEqual(addResult.success, true);

  // 3. Real-Time Continuous Balancing Verification: P&L and Balance Sheet immediately reflect change!
  const updatedPnl = store.getProfitAndLoss();
  assert.strictEqual(updatedPnl.trading.sales, initialSales + 100000);

  const updatedBS = store.getBalanceSheet();
  assert.strictEqual(updatedBS.isBalanced, true, 'Balance sheet must remain 100% balanced');
  assert.strictEqual(updatedBS.difference, 0);

  // 4. Audit Trail Verification: Event is logged and cryptographically chained
  const auditLogs = store.getAuditLogs();
  const lastLog = auditLogs[auditLogs.length - 1];
  assert.strictEqual(lastLog.entityId, 'vch_int_001');
  assert.strictEqual(lastLog.action, 'CREATE');
  assert.ok(lastLog.currentHash.length === 64);

  // 5. Drill-Down Verification: Drill into Sundry Debtors -> Tata -> June Month -> Voucher
  const vouchers = store.getVouchers();
  const juneVouchers = DrilldownEngine.drillIntoMonthVouchers({
    ledgerId: 'led_deb_tata',
    vouchers,
    monthIndex: 5, // June
    year: 2026,
  });
  assert.ok(juneVouchers.length >= 1);
  assert.strictEqual(juneVouchers[0].voucherNo, 'INV/2026/999');
  assert.strictEqual(juneVouchers[0].debit, 118000);

  // 6. GSTR-1 Generation includes the new invoice
  const gstr1 = StatutoryEngine.generateGSTR1({
    vouchers,
    company: store.getCompany(),
    ledgers: store.getLedgers(),
    returnPeriod: '062026',
  });
  const foundB2b = gstr1.b2b.some((b) => b.inv.some((i) => i.inum === 'INV/2026/999'));
  assert.strictEqual(foundB2b, true, 'Invoice must be included in GSTR-1 Table 4');

  // 7. Update Voucher: Modify narration and verify MCA Audit Trail records ALTER
  const modifiedVch: Voucher = {
    ...salesVch,
    narration: 'Updated Narration: Project milestone 2 delivery',
  };
  const updateResult = store.updateVoucher(modifiedVch);
  assert.strictEqual(updateResult.success, true);

  const updatedLogs = store.getAuditLogs();
  const alterLog = updatedLogs[updatedLogs.length - 1];
  assert.strictEqual(alterLog.entityId, 'vch_int_001');
  assert.strictEqual(alterLog.action, 'ALTER');
  assert.ok(alterLog.diff.some((d) => d.field === 'narration' && d.newValue === 'Updated Narration: Project milestone 2 delivery'));

  // 8. Delete Voucher: Delete the test voucher and verify MCA Audit Trail records DELETE
  const deleteResult = store.deleteVoucher('vch_int_001');
  assert.strictEqual(deleteResult.success, true);
  assert.strictEqual(store.getVouchers().some((v) => v.id === 'vch_int_001'), false);

  const finalLogs = store.getAuditLogs();
  const deleteLog = finalLogs[finalLogs.length - 1];
  assert.strictEqual(deleteLog.entityId, 'vch_int_001');
  assert.strictEqual(deleteLog.action, 'DELETE');
  assert.strictEqual(store.getBalanceSheet().isBalanced, true);

  // 9. Add Group: Create custom subgroup under Current Assets
  store.addGroup({
    id: 'grp_custom_fintech',
    name: 'Fintech Escrow Accounts',
    parentGroupId: 'grp_current_assets',
    nature: 'ASSETS',
    isPrimary: false,
    sortOrder: 99,
  });
  assert.ok(store.getGroups().some((g) => g.id === 'grp_custom_fintech'));
});

