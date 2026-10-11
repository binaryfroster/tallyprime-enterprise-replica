import assert from 'node:assert';
import test from 'node:test';
import { InventoryEngine } from '../src/core/inventoryEngine';
import {
  SAMPLE_STOCK_ITEMS,
  SAMPLE_BOM,
  SAMPLE_VOUCHERS,
} from '../src/core/sampleCompany';

test('Inventory Valuation computes closing stock correctly under FIFO', () => {
  const engine = new InventoryEngine(SAMPLE_STOCK_ITEMS, [SAMPLE_BOM]);
  const summary = engine.calculateStockSummary(SAMPLE_VOUCHERS);

  assert.strictEqual(summary.length, 3);
  const cpu = summary.find((s) => s.stockItemId === 'item_cpu_xeon');
  assert.ok(cpu);
  // Opening was 150, Inward purchase was 50 -> Total 200
  assert.strictEqual(cpu.openingQty, 150);
  assert.strictEqual(cpu.inwardQty, 50);
  assert.strictEqual(cpu.closingQty, 200);
  assert.ok(cpu.closingValue > 0);

  const server = summary.find((s) => s.stockItemId === 'item_server_blade');
  assert.ok(server);
  // Opening was 20, Outward sales were 10 + 5 = 15 -> Closing should be 5
  assert.strictEqual(server.openingQty, 20);
  assert.strictEqual(server.outwardQty, 15);
  assert.strictEqual(server.closingQty, 5);
});

test('Bill of Materials (BOM) Manufacturing Journal generates consumption & finished production', () => {
  const engine = new InventoryEngine(SAMPLE_STOCK_ITEMS, [SAMPLE_BOM]);
  const mfgVoucher = engine.generateManufacturingJournal({
    bomId: SAMPLE_BOM.id,
    outputQty: 5,
    destinationGodownId: 'g_prod',
    sourceGodownId: 'g_main',
    additionalOverheadCost: 25000,
    voucherNumber: 'MFG/2026/001',
    date: '2026-06-01',
  });

  assert.strictEqual(mfgVoucher.voucherType, 'STOCK_JOURNAL');
  assert.strictEqual(mfgVoucher.inventoryEntries?.length, 3); // 2 raw items consumed + 1 finished item produced

  // Finished good entry (positive amount)
  const finished = mfgVoucher.inventoryEntries?.find((e) => e.stockItemId === 'item_server_blade');
  assert.ok(finished);
  assert.strictEqual(finished.actualQty, 5);
  assert.ok(finished.amount > 0);

  // Raw material entries (negative amounts for consumption)
  const consumed = mfgVoucher.inventoryEntries?.filter((e) => e.amount < 0);
  assert.strictEqual(consumed?.length, 2);
});

test('Inventory Valuation computes closing stock correctly under LIFO, Standard Price, and High Cost', () => {
  // Test LIFO item
  const lifoItem = {
    ...SAMPLE_STOCK_ITEMS[0],
    id: 'item_lifo_test',
    costingMethod: 'LIFO' as const,
    openingQuantity: 10,
    openingRate: 100,
    openingValue: 1000,
  };

  const lifoPurchase: Voucher = {
    id: 'vch_lifo_p1',
    voucherNumber: 'PUR/LIFO/001',
    voucherType: 'PURCHASE',
    date: '2026-04-10',
    invoicingMode: 'ITEM_INVOICE',
    totalVoucherAmount: 3000,
    ledgerEntries: [],
    inventoryEntries: [
      {
        id: 'ie_lp1',
        stockItemId: 'item_lifo_test',
        actualQty: 10,
        billedQty: 10,
        rate: 300,
        amount: 3000,
        unit: 'Nos',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'test',
  };

  const lifoSale: Voucher = {
    id: 'vch_lifo_s1',
    voucherNumber: 'SAL/LIFO/001',
    voucherType: 'SALES',
    date: '2026-04-15',
    invoicingMode: 'ITEM_INVOICE',
    totalVoucherAmount: 5000,
    ledgerEntries: [],
    inventoryEntries: [
      {
        id: 'ie_ls1',
        stockItemId: 'item_lifo_test',
        actualQty: 10,
        billedQty: 10,
        rate: 500,
        amount: 5000,
        unit: 'Nos',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'test',
  };

  // Under LIFO: opening is 10 @ 100. Purchase is 10 @ 300.
  // Sale of 10 exhausts the LIFO batch (10 @ 300).
  // Remaining 10 is from opening (10 @ 100) -> Closing value = 1000!
  const lifoEngine = new InventoryEngine([lifoItem]);
  const lifoSummary = lifoEngine.calculateStockSummary([lifoPurchase, lifoSale]);
  const lifoRes = lifoSummary.find((s) => s.stockItemId === 'item_lifo_test');
  assert.ok(lifoRes);
  assert.strictEqual(lifoRes.closingQty, 10);
  assert.strictEqual(lifoRes.closingValue, 1000);
  assert.strictEqual(lifoRes.closingRate, 100);

  // Test Standard Price item
  const stdItem = {
    ...SAMPLE_STOCK_ITEMS[0],
    id: 'item_std_test',
    costingMethod: 'Standard Price' as const,
    openingQuantity: 10,
    openingRate: 250,
    openingValue: 2500,
  };
  const stdEngine = new InventoryEngine([stdItem]);
  const stdSummary = stdEngine.calculateStockSummary([]);
  const stdRes = stdSummary.find((s) => s.stockItemId === 'item_std_test');
  assert.ok(stdRes);
  assert.strictEqual(stdRes.closingRate, 250);
  assert.strictEqual(stdRes.closingValue, 2500);

  // Test High Cost item
  const highItem = {
    ...SAMPLE_STOCK_ITEMS[0],
    id: 'item_high_test',
    costingMethod: 'High Cost' as const,
    openingQuantity: 10,
    openingRate: 200,
    openingValue: 2000,
  };
  const highPurchase: Voucher = {
    id: 'vch_high_p1',
    voucherNumber: 'PUR/HIGH/001',
    voucherType: 'PURCHASE',
    date: '2026-04-10',
    invoicingMode: 'ITEM_INVOICE',
    totalVoucherAmount: 5000,
    ledgerEntries: [],
    inventoryEntries: [
      {
        id: 'ie_hp1',
        stockItemId: 'item_high_test',
        actualQty: 10,
        billedQty: 10,
        rate: 500, // higher cost than opening rate 200
        amount: 5000,
        unit: 'Nos',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'test',
  };
  const highEngine = new InventoryEngine([highItem]);
  const highSummary = highEngine.calculateStockSummary([highPurchase]);
  const highRes = highSummary.find((s) => s.stockItemId === 'item_high_test');
  assert.ok(highRes);
  assert.strictEqual(highRes.closingQty, 20);
  assert.strictEqual(highRes.closingRate, 500);
  assert.strictEqual(highRes.closingValue, 10000);
});

