import assert from 'node:assert';
import test from 'node:test';
import { StatutoryEngine } from '../src/core/statutoryEngine';
import {
  SAMPLE_COMPANY,
  SAMPLE_LEDGERS,
  SAMPLE_VOUCHERS,
} from '../src/core/sampleCompany';

test('GST Intra-State calculation splits 50% CGST and 50% SGST', () => {
  const result = StatutoryEngine.calculateGst({
    taxableAmount: 100000,
    gstRate: 18,
    companyStateCode: '27',
    buyerPlaceOfSupplyCode: '27',
  });

  assert.strictEqual(result.isInterState, false);
  assert.strictEqual(result.cgstRate, 9);
  assert.strictEqual(result.cgstAmount, 9000);
  assert.strictEqual(result.sgstRate, 9);
  assert.strictEqual(result.sgstAmount, 9000);
  assert.strictEqual(result.igstAmount, 0);
  assert.strictEqual(result.totalAmountWithTax, 118000);
});

test('GST Inter-State calculation charges 100% IGST', () => {
  const result = StatutoryEngine.calculateGst({
    taxableAmount: 100000,
    gstRate: 18,
    companyStateCode: '27',
    buyerPlaceOfSupplyCode: '29', // Karnataka
  });

  assert.strictEqual(result.isInterState, true);
  assert.strictEqual(result.cgstAmount, 0);
  assert.strictEqual(result.sgstAmount, 0);
  assert.strictEqual(result.igstRate, 18);
  assert.strictEqual(result.igstAmount, 18000);
  assert.strictEqual(result.totalAmountWithTax, 118000);
});

test('E-Way Bill generates JSON when consignment value exceeds ₹50,000', () => {
  const vch = SAMPLE_VOUCHERS[0]; // Total 14,75,000
  const party = SAMPLE_LEDGERS.find((l) => l.id === vch.partyLedgerId)!;
  const res = StatutoryEngine.generateEWayBill({
    voucher: vch,
    company: SAMPLE_COMPANY,
    party,
  });

  assert.strictEqual(res.isApplicable, true);
  assert.ok(res.payload);
  assert.strictEqual(res.payload.docNo, vch.voucherNumber);
  assert.strictEqual(res.payload.totalValue, 1475000);
});

test('E-Invoice generates 64-char IRN hash and signed QR code', () => {
  const vch = SAMPLE_VOUCHERS[0];
  const party = SAMPLE_LEDGERS.find((l) => l.id === vch.partyLedgerId)!;
  const payload = StatutoryEngine.generateEInvoiceIRN({
    voucher: vch,
    company: SAMPLE_COMPANY,
    party,
  });

  assert.ok(payload.irn);
  assert.strictEqual(payload.irn.length, 64);
  assert.ok(payload.signedQrCode.includes(SAMPLE_COMPANY.gstin));
});

test('GSTR-1 and GSTR-3B return JSON generation', () => {
  const gstr1 = StatutoryEngine.generateGSTR1({
    vouchers: SAMPLE_VOUCHERS,
    company: SAMPLE_COMPANY,
    ledgers: SAMPLE_LEDGERS,
    returnPeriod: '042026',
  });

  assert.strictEqual(gstr1.gstin, SAMPLE_COMPANY.gstin);
  assert.ok(gstr1.b2b.length > 0);
  assert.ok(gstr1.hsn.data.length > 0);

  const gstr3b = StatutoryEngine.generateGSTR3B({
    vouchers: SAMPLE_VOUCHERS,
    company: SAMPLE_COMPANY,
    returnPeriod: '042026',
  });

  assert.strictEqual(gstr3b.gstin, SAMPLE_COMPANY.gstin);
  assert.ok(gstr3b.sup_details.osup_det.txval > 0);
  assert.ok(gstr3b.itc_elg.itc_avl.length > 0);
});

test('TDS calculation applies correct section rates and 20% penalty if PAN missing', () => {
  const validRes = StatutoryEngine.calculateTds({
    amount: 50000,
    section: '194J',
    hasValidPan: true,
  });
  assert.strictEqual(validRes.tdsRate, 10);
  assert.strictEqual(validRes.tdsAmount, 5000);
  assert.strictEqual(validRes.netPayable, 45000);

  const noPanRes = StatutoryEngine.calculateTds({
    amount: 50000,
    section: '194J',
    hasValidPan: false,
  });
  assert.strictEqual(noPanRes.tdsRate, 20); // 206AA penalty
  assert.strictEqual(noPanRes.tdsAmount, 10000);
  assert.strictEqual(noPanRes.netPayable, 40000);
});

test('GSTR-3B correctly aggregates Table 3.1(d) Inward Supplies liable to Reverse Charge (RCM)', () => {
  const rcmPurchaseVoucher: Voucher = {
    id: 'vch_rcm_001',
    voucherNumber: 'PUR/RCM/001',
    voucherType: 'PURCHASE',
    date: '2026-04-20',
    invoicingMode: 'AS_VOUCHER',
    totalTaxableAmount: 50000,
    cgstAmount: 2500,
    sgstAmount: 2500,
    totalVoucherAmount: 50000, // In RCM, supplier does not charge tax; recipient pays to govt
    ledgerEntries: [
      { id: '1', ledgerId: 'led_gta', ledgerName: 'GTA Freight Expense', amount: 50000, isDeemedPositive: true },
      { id: '2', ledgerId: 'led_transporter', ledgerName: 'National Roadways', amount: -50000, isDeemedPositive: false },
    ],
    gstDetails: {
      isReverseChargeApplicable: true,
      placeOfSupply: '27',
      gstRate: 5,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'test',
  };

  const gstr3b = StatutoryEngine.generateGSTR3B({
    vouchers: [...SAMPLE_VOUCHERS, rcmPurchaseVoucher],
    company: SAMPLE_COMPANY,
    returnPeriod: '042026',
  });

  assert.ok(gstr3b.sup_details.isup_rev);
  assert.strictEqual(gstr3b.sup_details.isup_rev.txval, 50000);
  assert.strictEqual(gstr3b.sup_details.isup_rev.camt, 2500);
  assert.strictEqual(gstr3b.sup_details.isup_rev.samt, 2500);
});

test('TDS threshold exemption applies until cumulative payment breaches limit', () => {
  // 194J threshold is ₹30,000.
  // First payment of ₹20,000 is below threshold -> 0 TDS
  const firstPayment = StatutoryEngine.calculateTds({
    amount: 20000,
    section: '194J',
    cumulativeAmountYtd: 0,
    hasValidPan: true,
  });
  assert.strictEqual(firstPayment.tdsRate, 0);
  assert.strictEqual(firstPayment.tdsAmount, 0);
  assert.strictEqual(firstPayment.netPayable, 20000);

  // Second payment of ₹20,000 pushes cumulative to ₹40,000 (breaches ₹30,000 threshold)
  // TDS applies!
  const secondPayment = StatutoryEngine.calculateTds({
    amount: 20000,
    section: '194J',
    cumulativeAmountYtd: 20000,
    hasValidPan: true,
  });
  assert.strictEqual(secondPayment.tdsRate, 10);
  assert.strictEqual(secondPayment.tdsAmount, 2000);
  assert.strictEqual(secondPayment.netPayable, 18000);
});

