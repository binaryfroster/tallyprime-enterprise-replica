import { StockItem, Voucher, InventoryItemLine, BillOfMaterials, CostingMethod } from './types';

export interface StockBatchRecord {
  date: string;
  voucherId: string;
  inQty: number;
  rate: number;
  value: number;
  consumedQty: number;
}

export interface StockSummaryRow {
  stockItemId: string;
  name: string;
  unit: string;
  openingQty: number;
  openingValue: number;
  inwardQty: number;
  inwardValue: number;
  outwardQty: number;
  outwardValue: number;
  closingQty: number;
  closingRate: number;
  closingValue: number;
}

export class InventoryEngine {
  private stockItems: Map<string, StockItem> = new Map();
  private boms: Map<string, BillOfMaterials> = new Map();

  constructor(items: StockItem[] = [], boms: BillOfMaterials[] = []) {
    items.forEach((it) => this.stockItems.set(it.id, it));
    boms.forEach((b) => this.boms.set(b.id, b));
  }

  public registerStockItem(item: StockItem) {
    this.stockItems.set(item.id, item);
  }

  public getStockItem(id: string): StockItem | undefined {
    return this.stockItems.get(id);
  }

  public getAllStockItems(): StockItem[] {
    return Array.from(this.stockItems.values());
  }

  public registerBOM(bom: BillOfMaterials) {
    this.boms.set(bom.id, bom);
  }

  public getBOM(id: string): BillOfMaterials | undefined {
    return this.boms.get(id);
  }

  /**
   * Computes stock summary and valuation across all vouchers for each item
   */
  public calculateStockSummary(vouchers: Voucher[]): StockSummaryRow[] {
    const summaryMap = new Map<string, StockSummaryRow>();

    // Initialize with opening stock
    this.stockItems.forEach((item) => {
      summaryMap.set(item.id, {
        stockItemId: item.id,
        name: item.name,
        unit: item.baseUnitId,
        openingQty: item.openingQuantity,
        openingValue: item.openingValue,
        inwardQty: 0,
        inwardValue: 0,
        outwardQty: 0,
        outwardValue: 0,
        closingQty: item.openingQuantity,
        closingRate: item.openingRate,
        closingValue: item.openingValue,
      });
    });

    // Sort vouchers chronologically
    const sortedVouchers = [...vouchers]
      .filter((v) => !v.isCancelled)
      .sort((a, b) => a.date.localeCompare(b.date));

    // Per-item inward lots for FIFO/LIFO tracking
    const inwardLotsMap = new Map<string, StockBatchRecord[]>();

    this.stockItems.forEach((item) => {
      const lots: StockBatchRecord[] = [];
      if (item.openingQuantity > 0) {
        lots.push({
          date: '1970-01-01',
          voucherId: 'OPENING',
          inQty: item.openingQuantity,
          rate: item.openingRate,
          value: item.openingValue,
          consumedQty: 0,
        });
      }
      inwardLotsMap.set(item.id, lots);
    });

    for (const vch of sortedVouchers) {
      if (!vch.inventoryEntries) continue;

      for (const inv of vch.inventoryEntries) {
        const item = this.stockItems.get(inv.stockItemId);
        if (!item) continue;

        const row = summaryMap.get(item.id)!;
        const lots = inwardLotsMap.get(item.id)!;

        // Inward transactions: PURCHASE, RECEIPT_NOTE, or Destination side of STOCK_JOURNAL
        const isInward =
          vch.voucherType === 'PURCHASE' ||
          vch.voucherType === 'RECEIPT_NOTE' ||
          vch.voucherType === 'CREDIT_NOTE' || // Sales return comes back into stock
          (vch.voucherType === 'STOCK_JOURNAL' && inv.amount > 0);

        // Outward transactions: SALES, DELIVERY_NOTE, DEBIT_NOTE (Purchase return), or Source of STOCK_JOURNAL
        const isOutward =
          vch.voucherType === 'SALES' ||
          vch.voucherType === 'DELIVERY_NOTE' ||
          vch.voucherType === 'DEBIT_NOTE' ||
          (vch.voucherType === 'STOCK_JOURNAL' && inv.amount < 0);

        if (isInward) {
          const qty = inv.actualQty || inv.billedQty;
          row.inwardQty += qty;
          row.inwardValue += inv.amount;
          row.closingQty += qty;

          lots.push({
            date: vch.date,
            voucherId: vch.id,
            inQty: qty,
            rate: inv.rate,
            value: inv.amount,
            consumedQty: 0,
          });
        } else if (isOutward) {
          const qty = inv.actualQty || inv.billedQty;
          row.outwardQty += qty;
          row.closingQty -= qty;

          // Consume lots based on Costing Method
          const method = item.costingMethod;
          if (method === 'FIFO') {
            let remQty = qty;
            for (const lot of lots) {
              const available = lot.inQty - lot.consumedQty;
              if (available > 0) {
                const take = Math.min(available, remQty);
                lot.consumedQty += take;
                row.outwardValue += take * lot.rate;
                remQty -= take;
                if (remQty <= 0) break;
              }
            }
          } else if (method === 'LIFO') {
            let remQty = qty;
            for (let i = lots.length - 1; i >= 0; i--) {
              const lot = lots[i];
              const available = lot.inQty - lot.consumedQty;
              if (available > 0) {
                const take = Math.min(available, remQty);
                lot.consumedQty += take;
                row.outwardValue += take * lot.rate;
                remQty -= take;
                if (remQty <= 0) break;
              }
            }
          } else {
            // Weighted Average: consumption at current average rate
            const currentTotalValue =
              row.openingValue + row.inwardValue - row.outwardValue;
            const currentTotalQty = row.openingQty + row.inwardQty - (row.outwardQty - qty);
            const avgRate = currentTotalQty > 0 ? currentTotalValue / currentTotalQty : item.openingRate;
            row.outwardValue += qty * avgRate;
          }
        }
      }
    }

    // Final Valuation per method
    summaryMap.forEach((row, itemId) => {
      const item = this.stockItems.get(itemId)!;
      const lots = inwardLotsMap.get(itemId)!;

      if (row.closingQty <= 0) {
        row.closingRate = 0;
        row.closingValue = 0;
        return;
      }

      switch (item.costingMethod) {
        case 'FIFO': {
          let remQty = row.closingQty;
          let val = 0;
          for (let i = lots.length - 1; i >= 0; i--) {
            const lot = lots[i];
            const unconsumed = lot.inQty - lot.consumedQty;
            const take = Math.min(unconsumed, remQty);
            val += take * lot.rate;
            remQty -= take;
            if (remQty <= 0) break;
          }
          row.closingValue = Math.round(val * 100) / 100;
          row.closingRate = Math.round((row.closingValue / row.closingQty) * 100) / 100;
          break;
        }

        case 'LIFO': {
          let remQty = row.closingQty;
          let val = 0;
          for (let i = 0; i < lots.length; i++) {
            const lot = lots[i];
            const unconsumed = lot.inQty - lot.consumedQty;
            if (unconsumed > 0) {
              const take = Math.min(unconsumed, remQty);
              val += take * lot.rate;
              remQty -= take;
              if (remQty <= 0) break;
            }
          }
          if (remQty > 0 && lots.length > 0) {
            val += remQty * lots[0].rate;
          }
          row.closingValue = Math.round(val * 100) / 100;
          row.closingRate = Math.round((row.closingValue / row.closingQty) * 100) / 100;
          break;
        }

        case 'Standard Price': {
          const rate = item.openingRate || (lots[0] ? lots[0].rate : 0);
          row.closingRate = rate;
          row.closingValue = Math.round(row.closingQty * rate * 100) / 100;
          break;
        }

        case 'High Cost': {
          const rates = lots.map((l) => l.rate);
          if (item.openingRate > 0) rates.push(item.openingRate);
          const maxRate = rates.length > 0 ? Math.max(...rates) : item.openingRate;
          row.closingRate = maxRate;
          row.closingValue = Math.round(row.closingQty * maxRate * 100) / 100;
          break;
        }

        case 'Last Purchase Cost': {
          const lastLot = [...lots].reverse().find((l) => l.voucherId !== 'OPENING') || lots[0];
          const rate = lastLot ? lastLot.rate : item.openingRate;
          row.closingRate = rate;
          row.closingValue = Math.round(row.closingQty * rate * 100) / 100;
          break;
        }

        case 'Zero Cost': {
          row.closingRate = 0;
          row.closingValue = 0;
          break;
        }

        case 'Weighted Average':
        default: {
          const totalInValue = row.openingValue + row.inwardValue;
          const totalInQty = row.openingQty + row.inwardQty;
          const rate = totalInQty > 0 ? totalInValue / totalInQty : item.openingRate;
          row.closingRate = Math.round(rate * 100) / 100;
          row.closingValue = Math.round(row.closingQty * row.closingRate * 100) / 100;
          break;
        }
      }
    });

    return Array.from(summaryMap.values());
  }

  /**
   * Generates a Manufacturing Voucher based on Bill of Materials (BOM)
   */
  public generateManufacturingJournal(params: {
    bomId: string;
    outputQty: number;
    destinationGodownId: string;
    sourceGodownId: string;
    additionalOverheadCost?: number;
    voucherNumber: string;
    date: string;
  }): Voucher {
    const bom = this.boms.get(params.bomId);
    if (!bom) throw new Error(`BOM not found: ${params.bomId}`);

    const finishedItem = this.stockItems.get(bom.finishedStockItemId);
    if (!finishedItem) throw new Error(`Finished Item not found: ${bom.finishedStockItemId}`);

    const multiplier = params.outputQty / bom.outputQuantity;
    const inventoryEntries: InventoryItemLine[] = [];
    let totalRawMaterialCost = 0;

    // 1. Source Raw Materials consumed (negative amount in stock journal)
    for (const comp of bom.components) {
      const rawItem = this.stockItems.get(comp.stockItemId);
      if (!rawItem) continue;

      const requiredQty = comp.quantity * multiplier;
      const rate = rawItem.openingRate; // Or current valuation rate
      const lineCost = requiredQty * rate;
      totalRawMaterialCost += lineCost;

      inventoryEntries.push({
        id: `inv_cons_${comp.stockItemId}_${Date.now()}`,
        stockItemId: comp.stockItemId,
        stockItemName: rawItem.name,
        godownId: params.sourceGodownId,
        actualQty: requiredQty,
        billedQty: requiredQty,
        unit: comp.unit,
        rate,
        amount: -lineCost, // Negative signifies consumption from source
      });
    }

    // 2. Add Overhead cost if any
    const overhead = params.additionalOverheadCost || 0;
    const totalFinishedCost = totalRawMaterialCost + overhead;
    const finishedUnitRate = totalFinishedCost / params.outputQty;

    // 3. Destination Finished Product produced
    inventoryEntries.push({
      id: `inv_prod_${finishedItem.id}_${Date.now()}`,
      stockItemId: finishedItem.id,
      stockItemName: finishedItem.name,
      godownId: params.destinationGodownId,
      actualQty: params.outputQty,
      billedQty: params.outputQty,
      unit: finishedItem.baseUnitId,
      rate: Math.round(finishedUnitRate * 100) / 100,
      amount: totalFinishedCost, // Positive signifies production into destination
    });

    return {
      id: `vch_mfg_${Date.now()}`,
      voucherNumber: params.voucherNumber,
      voucherType: 'STOCK_JOURNAL',
      date: params.date,
      invoicingMode: 'ITEM_INVOICE',
      narration: `Manufactured ${params.outputQty} ${finishedItem.baseUnitId} of ${finishedItem.name} via BOM ${bom.name}`,
      ledgerEntries: [],
      inventoryEntries,
      totalVoucherAmount: totalFinishedCost,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'production_manager',
    };
  }
}
