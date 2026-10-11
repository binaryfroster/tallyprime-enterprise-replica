import React, { useState, useEffect } from 'react';
import {
  Voucher,
  VoucherTypeCode,
  InvoicingMode,
  LedgerMaster,
  StockItem,
  Company,
  BillAllocation,
} from '../core/types';
import { StatutoryEngine } from '../core/statutoryEngine';

interface VoucherScreenProps {
  initialType: VoucherTypeCode;
  initialVoucher?: Voucher;
  company: Company;
  ledgers: LedgerMaster[];
  stockItems: StockItem[];
  currentDate: string;
  onSave: (voucher: Voucher) => void;
  onCancel: () => void;
  onOpenAltC: (type: 'ledger' | 'stockItem') => void;
  onDelete?: (voucherId: string) => void;
}

interface ItemRow {
  stockItemId: string;
  qty: number;
  rate: number;
  amount: number;
}

interface LedgerRow {
  ledgerId: string;
  type: 'Dr' | 'Cr';
  amount: number;
}

export const VoucherScreen: React.FC<VoucherScreenProps> = ({
  initialType,
  initialVoucher,
  company,
  ledgers,
  stockItems,
  currentDate,
  onSave,
  onCancel,
  onOpenAltC,
  onDelete,
}) => {
  const [voucherType, setVoucherType] = useState<VoucherTypeCode>(initialVoucher?.voucherType || initialType);
  const [mode, setMode] = useState<InvoicingMode>(
    initialVoucher?.invoicingMode ||
    (initialType === 'SALES' || initialType === 'PURCHASE' ? 'ITEM_INVOICE' : 'AS_VOUCHER')
  );
  const [voucherDate, setVoucherDate] = useState(initialVoucher?.date || currentDate);
  const [voucherNo, setVoucherNo] = useState(
    initialVoucher?.voucherNumber || `VCH/${initialType.substring(0, 3)}/${Date.now().toString().slice(-4)}`
  );
  const [partyLedgerId, setPartyLedgerId] = useState<string>(initialVoucher?.partyLedgerId || '');
  const [referenceNo, setReferenceNo] = useState(initialVoucher?.referenceNumber || '');
  const [narration, setNarration] = useState(initialVoucher?.narration || '');

  // Item Invoice Rows
  const [itemRows, setItemRows] = useState<ItemRow[]>(() => {
    if (initialVoucher && initialVoucher.inventoryEntries && initialVoucher.inventoryEntries.length > 0) {
      return initialVoucher.inventoryEntries.map((e) => ({
        stockItemId: e.stockItemId,
        qty: e.actualQty || 1,
        rate: e.rate || 0,
        amount: Math.abs(e.amount) || 0,
      }));
    }
    return [
      { stockItemId: stockItems[0]?.id || '', qty: 1, rate: stockItems[0]?.openingRate || 1000, amount: stockItems[0]?.openingRate || 1000 },
    ];
  });

  // As Voucher Rows
  const [ledgerRows, setLedgerRows] = useState<LedgerRow[]>(() => {
    if (initialVoucher && initialVoucher.ledgerEntries && initialVoucher.ledgerEntries.length > 0) {
      return initialVoucher.ledgerEntries.map((e) => ({
        ledgerId: e.ledgerId,
        type: e.amount >= 0 ? 'Dr' : 'Cr',
        amount: Math.abs(e.amount),
      }));
    }
    return [
      { ledgerId: ledgers[0]?.id || '', type: 'Dr', amount: 50000 },
      { ledgerId: ledgers[1]?.id || '', type: 'Cr', amount: 50000 },
    ];
  });

  useEffect(() => {
    if (initialVoucher) {
      setVoucherType(initialVoucher.voucherType);
      setVoucherNo(initialVoucher.voucherNumber);
      setVoucherDate(initialVoucher.date);
      setMode(initialVoucher.invoicingMode);
      setPartyLedgerId(initialVoucher.partyLedgerId || '');
      setReferenceNo(initialVoucher.referenceNumber || '');
      setNarration(initialVoucher.narration || '');
      if (initialVoucher.inventoryEntries && initialVoucher.inventoryEntries.length > 0) {
        setItemRows(initialVoucher.inventoryEntries.map((e) => ({
          stockItemId: e.stockItemId,
          qty: e.actualQty || 1,
          rate: e.rate || 0,
          amount: Math.abs(e.amount) || 0,
        })));
      }
      if (initialVoucher.ledgerEntries && initialVoucher.ledgerEntries.length > 0) {
        setLedgerRows(initialVoucher.ledgerEntries.map((e) => ({
          ledgerId: e.ledgerId,
          type: e.amount >= 0 ? 'Dr' : 'Cr',
          amount: Math.abs(e.amount),
        })));
      }
      return;
    }

    setVoucherType(initialType);
    setVoucherNo(`VCH/${initialType.substring(0, 3)}/${Date.now().toString().slice(-4)}`);
    if (initialType === 'SALES') {
      const debtor = ledgers.find((l) => l.groupId === 'grp_sundry_debtors');
      if (debtor) setPartyLedgerId(debtor.id);
      setMode('ITEM_INVOICE');
    } else if (initialType === 'PURCHASE') {
      const creditor = ledgers.find((l) => l.groupId === 'grp_sundry_creditors');
      if (creditor) setPartyLedgerId(creditor.id);
      setMode('ITEM_INVOICE');
    } else {
      setMode('AS_VOUCHER');
    }
  }, [initialType, initialVoucher, ledgers]);

  // Update item row
  const updateItemRow = (index: number, field: keyof ItemRow, val: any) => {
    const updated = [...itemRows];
    updated[index] = { ...updated[index], [field]: val };

    if (field === 'stockItemId') {
      const item = stockItems.find((s) => s.id === val);
      if (item) {
        updated[index].rate = item.openingRate;
        updated[index].amount = updated[index].qty * item.openingRate;
      }
    } else if (field === 'qty' || field === 'rate') {
      const q = field === 'qty' ? parseFloat(val) || 0 : updated[index].qty;
      const r = field === 'rate' ? parseFloat(val) || 0 : updated[index].rate;
      updated[index].amount = Math.round(q * r * 100) / 100;
    }

    setItemRows(updated);
  };

  const addItemRow = () => {
    const first = stockItems[0];
    setItemRows([
      ...itemRows,
      { stockItemId: first?.id || '', qty: 1, rate: first?.openingRate || 1000, amount: first?.openingRate || 1000 },
    ]);
  };

  const removeItemRow = (idx: number) => {
    if (itemRows.length > 1) {
      setItemRows(itemRows.filter((_, i) => i !== idx));
    }
  };

  // Calculations for Item Invoice
  const selectedParty = ledgers.find((l) => l.id === partyLedgerId);
  const totalTaxable = itemRows.reduce((sum, r) => sum + r.amount, 0);

  const gstCalc = StatutoryEngine.calculateGst({
    taxableAmount: totalTaxable,
    gstRate: 18,
    companyStateCode: company.stateCode,
    buyerPlaceOfSupplyCode: selectedParty?.placeOfSupply || company.stateCode,
  });

  const totalDr = ledgerRows.filter((r) => r.type === 'Dr').reduce((sum, r) => sum + r.amount, 0);
  const totalCr = ledgerRows.filter((r) => r.type === 'Cr').reduce((sum, r) => sum + r.amount, 0);
  const voucherDiff = Math.round(Math.abs(totalDr - totalCr) * 100) / 100;
  const isVoucherBalanced = voucherDiff < 0.01;

  const totalVoucherAmount =
    mode === 'ITEM_INVOICE'
      ? gstCalc.totalAmountWithTax
      : totalDr;

  const addLedgerRow = () => {
    const neededType: 'Dr' | 'Cr' = totalDr >= totalCr ? 'Cr' : 'Dr';
    const neededAmount = Math.max(0, voucherDiff);
    const unusedLedger = ledgers.find((l) => !ledgerRows.some((r) => r.ledgerId === l.id)) || ledgers[0];
    setLedgerRows([
      ...ledgerRows,
      {
        ledgerId: unusedLedger?.id || '',
        type: neededType,
        amount: neededAmount || 1000,
      },
    ]);
  };

  const removeLedgerRow = (idx: number) => {
    if (ledgerRows.length > 2) {
      setLedgerRows(ledgerRows.filter((_, i) => i !== idx));
    }
  };

  // Global hotkeys inside voucher
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + A: Save / Accept
      if (e.ctrlKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        handleSave();
      } else if (e.altKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        onOpenAltC(mode === 'ITEM_INVOICE' ? 'stockItem' : 'ledger');
      } else if (e.altKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        if (mode === 'ITEM_INVOICE') addItemRow();
        else addLedgerRow();
      } else if (e.ctrlKey && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault();
        setMode((prev) =>
          prev === 'ITEM_INVOICE'
            ? 'ACCOUNTING_INVOICE'
            : prev === 'ACCOUNTING_INVOICE'
            ? 'AS_VOUCHER'
            : 'ITEM_INVOICE'
        );
      } else if (e.altKey && (e.key === 'd' || e.key === 'D')) {
        if (initialVoucher && onDelete) {
          e.preventDefault();
          onDelete(initialVoucher.id);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const handleSave = () => {
    let finalLedgerEntries: any[] = [];
    let finalInventoryEntries: any[] = [];

    if (mode === 'ITEM_INVOICE') {
      const isSales = voucherType === 'SALES';
      const mainSalesOrPurchaseLedger = ledgers.find((l) =>
        isSales ? l.groupId === 'grp_sales_accounts' : l.groupId === 'grp_purchase_accounts'
      );

      // Party entry
      const billAllocations: BillAllocation[] = selectedParty?.maintainBillByBill
        ? [
            {
              id: `ba_${Date.now()}`,
              type: 'New Ref',
              refName: voucherNo,
              amount: isSales ? totalVoucherAmount : -totalVoucherAmount,
              creditDays: selectedParty.defaultCreditPeriodDays || 30,
            },
          ]
        : [];

      finalLedgerEntries.push({
        id: `le_party_${Date.now()}`,
        ledgerId: partyLedgerId,
        ledgerName: selectedParty?.name || 'Party Account',
        amount: isSales ? totalVoucherAmount : -totalVoucherAmount,
        isDeemedPositive: isSales,
        billAllocations,
      });

      // Sales or Purchase line
      finalLedgerEntries.push({
        id: `le_main_${Date.now()}`,
        ledgerId: mainSalesOrPurchaseLedger?.id || (isSales ? 'led_sales_domestic' : 'led_purchases_components'),
        ledgerName: mainSalesOrPurchaseLedger?.name || (isSales ? 'Sales Account' : 'Purchase Account'),
        amount: isSales ? -totalTaxable : totalTaxable,
        isDeemedPositive: !isSales,
      });

      // Taxes
      if (gstCalc.isInterState) {
        const igstLedger = ledgers.find((l) => isSales ? l.id === 'led_igst_output' : l.id === 'led_igst_input');
        finalLedgerEntries.push({
          id: `le_igst_${Date.now()}`,
          ledgerId: igstLedger?.id || 'led_igst_output',
          ledgerName: igstLedger?.name || 'Output IGST 18%',
          amount: isSales ? -gstCalc.igstAmount : gstCalc.igstAmount,
          isDeemedPositive: !isSales,
        });
      } else {
        const cgstLedger = ledgers.find((l) => isSales ? l.id === 'led_cgst_output' : l.id === 'led_cgst_input');
        const sgstLedger = ledgers.find((l) => isSales ? l.id === 'led_sgst_output' : l.id === 'led_sgst_input');

        finalLedgerEntries.push({
          id: `le_cgst_${Date.now()}`,
          ledgerId: cgstLedger?.id || 'led_cgst_output',
          ledgerName: cgstLedger?.name || 'Output CGST 9%',
          amount: isSales ? -gstCalc.cgstAmount : gstCalc.cgstAmount,
          isDeemedPositive: !isSales,
        });

        finalLedgerEntries.push({
          id: `le_sgst_${Date.now()}`,
          ledgerId: sgstLedger?.id || 'led_sgst_output',
          ledgerName: sgstLedger?.name || 'Output SGST 9%',
          amount: isSales ? -gstCalc.sgstAmount : gstCalc.sgstAmount,
          isDeemedPositive: !isSales,
        });
      }

      // Inventory entries
      finalInventoryEntries = itemRows.map((r, i) => {
        const s = stockItems.find((item) => item.id === r.stockItemId);
        return {
          id: `ie_${Date.now()}_${i}`,
          stockItemId: r.stockItemId,
          stockItemName: s?.name || 'Item',
          godownId: s?.godownId || 'g_main',
          actualQty: r.qty,
          billedQty: r.qty,
          unit: s?.baseUnitId || 'Nos',
          rate: r.rate,
          amount: r.amount,
          hsnCode: s?.hsnCode || '8542',
          gstRate: 18,
        };
      });
    } else {
      // As Voucher mode
      finalLedgerEntries = ledgerRows.map((r, i) => {
        const led = ledgers.find((l) => l.id === r.ledgerId);
        const signedAmount = r.type === 'Dr' ? r.amount : -r.amount;
        return {
          id: `le_${Date.now()}_${i}`,
          ledgerId: r.ledgerId,
          ledgerName: led?.name || 'Ledger',
          amount: signedAmount,
          isDeemedPositive: r.type === 'Dr',
        };
      });
    }

    if (mode === 'AS_VOUCHER' && !isVoucherBalanced) {
      alert(`Cannot accept imbalanced voucher!\nTotal Dr: ₹${totalDr.toLocaleString('en-IN')}\nTotal Cr: ₹${totalCr.toLocaleString('en-IN')}\nDifference: ₹${voucherDiff.toLocaleString('en-IN')}`);
      return;
    }

    const newVoucher: Voucher = {
      id: initialVoucher?.id || `vch_${Date.now()}`,
      voucherNumber: voucherNo,
      voucherType,
      date: voucherDate,
      invoicingMode: mode,
      partyLedgerId,
      partyName: selectedParty?.name,
      referenceNumber: referenceNo,
      narration,
      totalTaxableAmount: totalTaxable,
      cgstAmount: gstCalc.cgstAmount,
      sgstAmount: gstCalc.sgstAmount,
      igstAmount: gstCalc.igstAmount,
      totalVoucherAmount,
      ledgerEntries: finalLedgerEntries,
      inventoryEntries: finalInventoryEntries,
      createdAt: initialVoucher?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: initialVoucher?.createdBy || 'operator',
    };

    onSave(newVoucher);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0b1f28] overflow-hidden text-xs">
      {/* Voucher Top Action Bar */}
      <div className="bg-[#144353] border-b border-[#246076] px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="bg-[#fbbf24] text-[#0e2c37] font-black px-2 py-0.5 rounded text-xs uppercase">
            {voucherType}
          </span>
          <span className="font-bold text-sm text-[#f8fafc]">No. {voucherNo}</span>
          <span className="text-[#38bdf8] text-[11px] font-mono">
            [Mode: {mode} • Press Ctrl+H to Change]
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono">
            <span className="text-[#89aab8]">Date:</span>
            <input
              type="date"
              value={voucherDate}
              onChange={(e) => setVoucherDate(e.target.value)}
              className="tally-input py-0.5 px-1.5 rounded-xs text-xs"
            />
          </div>

          <button
            onClick={() => onOpenAltC('ledger')}
            className="px-2 py-1 bg-[#1b4e60] hover:bg-[#25667e] text-[#fbbf24] font-semibold rounded transition"
            title="Alt+C: Create New Ledger on the fly"
          >
            <u>Alt+C</u>: Master Creation
          </button>
        </div>
      </div>

      {/* Invoicing Mode Switcher & Header Details */}
      <div className="p-4 bg-[#0e2e3b] border-b border-[#1b4b5d] space-y-3 font-mono">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-[#7da2b2] text-[11px] block mb-1">
              Party A/c Name:
            </label>
            <select
              value={partyLedgerId}
              onChange={(e) => setPartyLedgerId(e.target.value)}
              className="w-full tally-input py-1 text-xs text-[#f8fafc]"
            >
              <option value="">-- Select Party Ledger --</option>
              {ledgers.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.groupId.replace('grp_', '')})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[#7da2b2] text-[11px] block mb-1">
              Reference / PO Number:
            </label>
            <input
              type="text"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              placeholder="e.g. PO/2026/8991"
              className="w-full tally-input py-1 text-xs"
            />
          </div>

          <div>
            <label className="text-[#7da2b2] text-[11px] block mb-1">
              GST Place of Supply (POS):
            </label>
            <div className="text-xs text-[#fbbf24] font-bold py-1">
              {selectedParty?.placeOfSupply || company.stateCode} -{' '}
              {selectedParty?.placeOfSupply === company.stateCode || !selectedParty?.placeOfSupply
                ? 'Intra-State (CGST + SGST)'
                : 'Inter-State (IGST)'}
            </div>
          </div>
        </div>
      </div>

      {/* Voucher Body Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {mode === 'ITEM_INVOICE' ? (
          <div className="space-y-3">
            <table className="tally-table">
              <thead>
                <tr>
                  <th className="w-12">#</th>
                  <th>Name of Item (Stock Item)</th>
                  <th className="w-24 text-right">Quantity</th>
                  <th className="w-32 text-right">Rate (₹)</th>
                  <th className="w-36 text-right">Amount (₹)</th>
                  <th className="w-16 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {itemRows.map((row, idx) => (
                  <tr key={idx} className="tally-row">
                    <td className="text-center text-[#7ea0af]">{idx + 1}</td>
                    <td>
                      <select
                        value={row.stockItemId}
                        onChange={(e) => updateItemRow(idx, 'stockItemId', e.target.value)}
                        className="w-full tally-input py-0.5 text-xs bg-transparent"
                      >
                        {stockItems.map((item) => (
                          <option key={item.id} value={item.id} className="bg-[#0b1f28]">
                            {item.name} [{item.partNumber || item.baseUnitId}]
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        value={row.qty}
                        onChange={(e) => updateItemRow(idx, 'qty', e.target.value)}
                        className="w-full tally-input py-0.5 text-right font-mono"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="100"
                        value={row.rate}
                        onChange={(e) => updateItemRow(idx, 'rate', e.target.value)}
                        className="w-full tally-input py-0.5 text-right font-mono"
                      />
                    </td>
                    <td className="text-right font-mono font-bold text-[#f8fafc]">
                      ₹{row.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="text-center">
                      <button
                        onClick={() => removeItemRow(idx)}
                        className="text-[#ef4444] hover:font-bold px-1.5"
                        title="Alt+D: Remove Row"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-between items-center pt-1">
              <button
                onClick={addItemRow}
                className="px-3 py-1 bg-[#17485a] hover:bg-[#1f5f76] text-[#38bdf8] font-semibold rounded-xs transition text-xs"
              >
                + Add Item Row (Alt+A)
              </button>

              <div className="text-right space-y-1 font-mono text-xs w-80 bg-[#0d2a37] p-3 border border-[#1b4b5e] rounded-xs">
                <div className="flex justify-between text-[#8ba8b6]">
                  <span>Subtotal Taxable:</span>
                  <span>₹{totalTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>

                {!gstCalc.isInterState ? (
                  <>
                    <div className="flex justify-between text-[#38bdf8]">
                      <span>CGST (9%):</span>
                      <span>₹{gstCalc.cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-[#38bdf8]">
                      <span>SGST (9%):</span>
                      <span>₹{gstCalc.sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-[#38bdf8]">
                    <span>IGST (18%):</span>
                    <span>₹{gstCalc.igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm font-bold text-[#fbbf24] border-t border-[#23586d] pt-1">
                  <span>Grand Total:</span>
                  <span>₹{totalVoucherAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* As Voucher Double-Entry Grid */
          <div className="space-y-3">
            <table className="tally-table">
              <thead>
                <tr>
                  <th className="w-16">Dr / Cr</th>
                  <th>Ledger Particulars</th>
                  <th className="w-36 text-right">Debit (₹)</th>
                  <th className="w-36 text-right">Credit (₹)</th>
                  <th className="w-12 text-center">Act</th>
                </tr>
              </thead>
              <tbody>
                {ledgerRows.map((row, idx) => (
                  <tr key={idx} className="tally-row">
                    <td>
                      <select
                        value={row.type}
                        onChange={(e) => {
                          const updated = [...ledgerRows];
                          updated[idx].type = e.target.value as 'Dr' | 'Cr';
                          setLedgerRows(updated);
                        }}
                        className="tally-input py-0.5 font-bold"
                      >
                        <option value="Dr">Dr</option>
                        <option value="Cr">Cr</option>
                      </select>
                    </td>
                    <td>
                      <select
                        value={row.ledgerId}
                        onChange={(e) => {
                          const updated = [...ledgerRows];
                          updated[idx].ledgerId = e.target.value;
                          setLedgerRows(updated);
                        }}
                        className="w-full tally-input py-0.5 bg-transparent"
                      >
                        {ledgers.map((l) => (
                          <option key={l.id} value={l.id} className="bg-[#0b1f28]">
                            {l.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="text-right">
                      {row.type === 'Dr' ? (
                        <input
                          type="number"
                          value={row.amount}
                          onChange={(e) => {
                            const updated = [...ledgerRows];
                            updated[idx].amount = parseFloat(e.target.value) || 0;
                            setLedgerRows(updated);
                          }}
                          className="w-full tally-input py-0.5 text-right font-mono"
                        />
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="text-right">
                      {row.type === 'Cr' ? (
                        <input
                          type="number"
                          value={row.amount}
                          onChange={(e) => {
                            const updated = [...ledgerRows];
                            updated[idx].amount = parseFloat(e.target.value) || 0;
                            setLedgerRows(updated);
                          }}
                          className="w-full tally-input py-0.5 text-right font-mono"
                        />
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="text-center">
                      {ledgerRows.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeLedgerRow(idx)}
                          className="text-[#ef4444] hover:font-bold px-1"
                          title="Remove row"
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-between items-center pt-1">
              <button
                type="button"
                onClick={addLedgerRow}
                className="px-3 py-1 bg-[#17485a] hover:bg-[#1f5f76] text-[#38bdf8] font-semibold rounded-xs transition text-xs"
              >
                + Add Ledger Row (Alt+A)
              </button>

              <div className="flex items-center gap-6 bg-[#0d2a37] px-4 py-2 border border-[#1b4b5e] rounded-xs font-mono text-xs">
                <div>
                  <span className="text-[#8ba8b6]">Total Dr: </span>
                  <span className="font-bold text-[#f8fafc]">
                    ₹{totalDr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-[#8ba8b6]">Total Cr: </span>
                  <span className="font-bold text-[#f8fafc]">
                    ₹{totalCr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-[#8ba8b6]">Difference: </span>
                  <span className={`font-bold ${isVoucherBalanced ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                    ₹{voucherDiff.toLocaleString('en-IN', { minimumFractionDigits: 2 })} {isVoucherBalanced ? '✓ Balanced' : '⚠ Imbalanced'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Narration Field */}
        <div className="mt-4">
          <label className="text-[#7da2b2] text-[11px] block mb-1">Narration:</label>
          <input
            type="text"
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
            placeholder="Being goods sold / payment made..."
            className="w-full tally-input py-1.5 text-xs rounded-xs"
          />
        </div>
      </div>

      {/* Accept / Save Bottom Bar */}
      <div className="bg-[#0c2632] border-t border-[#1b4b5e] px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4 text-[11px] text-[#789ca9]">
          <span>Press <u>Ctrl+A</u> to Accept</span>
          <span>•</span>
          <span>Press <u>Ctrl+H</u> to Change Mode</span>
          <span>•</span>
          <span>Press <u>Esc</u> to Cancel</span>
        </div>

        <div className="flex items-center gap-2">
          {initialVoucher && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(initialVoucher.id)}
              className="px-4 py-1.5 bg-[#7f1d1d] hover:bg-[#991b1b] text-[#fecaca] rounded-xs font-semibold mr-2"
            >
              Delete (Alt+D)
            </button>
          )}
          <button
            onClick={onCancel}
            className="px-4 py-1.5 bg-[#173e4e] hover:bg-[#205267] text-[#d6e3e8] rounded-xs font-semibold"
          >
            Esc: Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-1.5 bg-[#0284c7] hover:bg-[#0396e3] text-white font-black rounded-xs shadow-md"
          >
            Accept? (Ctrl+A / Yes)
          </button>
        </div>
      </div>
    </div>
  );
};
