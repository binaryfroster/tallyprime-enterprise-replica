import { Voucher, Company, LedgerMaster, InventoryItemLine } from './types';
import { sha256 } from './cryptoUtils';

export interface GSTBreakup {
  taxableAmount: number;
  isInterState: boolean;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalTax: number;
  totalAmountWithTax: number;
}

export interface EWayBillJson {
  supplyType: 'O' | 'I';
  subSupplyType: string;
  docType: 'INV' | 'BIL' | 'CHL';
  docNo: string;
  docDate: string;
  fromGstin: string;
  fromStateCode: number;
  toGstin: string;
  toStateCode: number;
  totalValue: number;
  cgstValue: number;
  sgstValue: number;
  igstValue: number;
  cessValue: number;
  transDistance: number;
  transporterId?: string;
}

export interface EInvoicePayload {
  version: '1.1';
  irn: string;
  signedQrCode: string;
  docDetails: {
    typ: 'INV';
    no: string;
    dt: string;
  };
  sellerDetails: {
    gstin: string;
    legalName: string;
    addr1: string;
    loc: string;
    pin: number;
    stcd: string;
  };
  buyerDetails: {
    gstin: string;
    legalName: string;
    pos: string;
    addr1: string;
    loc: string;
    pin: number;
    stcd: string;
  };
  valDetails: {
    assVal: number;
    cgstVal: number;
    sgstVal: number;
    igstVal: number;
    totInvVal: number;
  };
}

export interface Gstr1Data {
  gstin: string;
  fp: string; // return period, e.g. '042026'
  b2b: {
    ctin: string;
    inv: {
      inum: string;
      idt: string;
      val: number;
      pos: string;
      rchrg: 'Y' | 'N';
      itms: {
        num: number;
        itm_det: {
          rt: number;
          txval: number;
          iamt: number;
          camt: number;
          samt: number;
          csamt: number;
        };
      }[];
    }[];
  }[];
  b2cs: {
    sply_ty: 'INTRA' | 'INTER';
    pos: string;
    rt: number;
    txval: number;
    iamt: number;
    camt: number;
    samt: number;
  }[];
  hsn: {
    data: {
      num: number;
      hsn_sc: string;
      desc: string;
      uqc: string;
      qty: number;
      val: number;
      txval: number;
      iamt: number;
      camt: number;
      samt: number;
    }[];
  };
}

export interface Gstr3bData {
  gstin: string;
  ret_period: string;
  sup_details: {
    osup_det: {
      txval: number;
      iamt: number;
      camt: number;
      samt: number;
      csamt: number;
    };
    isup_rev?: {
      txval: number;
      iamt: number;
      camt: number;
      samt: number;
      csamt: number;
    };
  };
  itc_elg: {
    itc_avl: {
      ty: string;
      iamt: number;
      camt: number;
      samt: number;
      csamt: number;
    }[];
  };
}

export class StatutoryEngine {
  /**
   * Computes GST taxes based on intra-state vs inter-state rules
   */
  public static calculateGst(params: {
    taxableAmount: number;
    gstRate: number; // e.g. 18 for 18%
    companyStateCode: string;
    buyerPlaceOfSupplyCode: string;
  }): GSTBreakup {
    const isInterState =
      params.companyStateCode.trim().toLowerCase() !==
      params.buyerPlaceOfSupplyCode.trim().toLowerCase();

    if (isInterState) {
      const igstAmount = Math.round(((params.taxableAmount * params.gstRate) / 100) * 100) / 100;
      return {
        taxableAmount: params.taxableAmount,
        isInterState: true,
        cgstRate: 0,
        cgstAmount: 0,
        sgstRate: 0,
        sgstAmount: 0,
        igstRate: params.gstRate,
        igstAmount,
        totalTax: igstAmount,
        totalAmountWithTax: Math.round((params.taxableAmount + igstAmount) * 100) / 100,
      };
    } else {
      const halfRate = params.gstRate / 2;
      const cgstAmount = Math.round(((params.taxableAmount * halfRate) / 100) * 100) / 100;
      const sgstAmount = Math.round(((params.taxableAmount * halfRate) / 100) * 100) / 100;
      const totalTax = Math.round((cgstAmount + sgstAmount) * 100) / 100;
      return {
        taxableAmount: params.taxableAmount,
        isInterState: false,
        cgstRate: halfRate,
        cgstAmount,
        sgstRate: halfRate,
        sgstAmount,
        igstRate: 0,
        igstAmount: 0,
        totalTax,
        totalAmountWithTax: Math.round((params.taxableAmount + totalTax) * 100) / 100,
      };
    }
  }

  /**
   * Generates Indian E-Way Bill JSON (Required when consignment value > Rs 50,000)
   */
  public static generateEWayBill(params: {
    voucher: Voucher;
    company: Company;
    party: LedgerMaster;
    distanceKm?: number;
    transporterId?: string;
  }): { isApplicable: boolean; payload?: EWayBillJson; reason?: string } {
    if (params.voucher.totalVoucherAmount < 50000) {
      return {
        isApplicable: false,
        reason: 'Consignment total amount is less than statutory threshold of ₹50,000',
      };
    }

    const payload: EWayBillJson = {
      supplyType: 'O',
      subSupplyType: 'Supply',
      docType: 'INV',
      docNo: params.voucher.voucherNumber,
      docDate: params.voucher.date.split('-').reverse().join('/'), // DD/MM/YYYY
      fromGstin: params.company.gstin,
      fromStateCode: parseInt(params.company.stateCode) || 27,
      toGstin: params.party.gstin || 'URP',
      toStateCode: parseInt(params.party.placeOfSupply || params.company.stateCode) || 27,
      totalValue: params.voucher.totalVoucherAmount,
      cgstValue: params.voucher.cgstAmount || 0,
      sgstValue: params.voucher.sgstAmount || 0,
      igstValue: params.voucher.igstAmount || 0,
      cessValue: 0,
      transDistance: params.distanceKm || 120,
      transporterId: params.transporterId || '',
    };

    return { isApplicable: true, payload };
  }

  /**
   * Generates 64-character SHA-256 E-Invoicing IRN (Invoice Reference Number)
   */
  public static generateEInvoiceIRN(params: {
    voucher: Voucher;
    company: Company;
    party: LedgerMaster;
  }): EInvoicePayload {
    const rawString = `${params.company.gstin}:${params.voucher.date.substring(0, 4)}:INV:${params.voucher.voucherNumber}`;
    const hash = sha256(rawString);

    return {
      version: '1.1',
      irn: hash,
      signedQrCode: `GSTIN:${params.company.gstin}|IRN:${hash}|DOC:${params.voucher.voucherNumber}|VAL:${params.voucher.totalVoucherAmount}`,
      docDetails: {
        typ: 'INV',
        no: params.voucher.voucherNumber,
        dt: params.voucher.date,
      },
      sellerDetails: {
        gstin: params.company.gstin,
        legalName: params.company.name,
        addr1: params.company.address,
        loc: params.company.state,
        pin: parseInt(params.company.pincode) || 400001,
        stcd: params.company.stateCode,
      },
      buyerDetails: {
        gstin: params.party.gstin || 'URP',
        legalName: params.party.name,
        pos: params.party.placeOfSupply || params.company.stateCode,
        addr1: params.party.address || 'Standard Address',
        loc: params.party.state || 'Local',
        pin: parseInt(params.party.pincode || '400001'),
        stcd: params.party.placeOfSupply || params.company.stateCode,
      },
      valDetails: {
        assVal: params.voucher.totalTaxableAmount || params.voucher.totalVoucherAmount,
        cgstVal: params.voucher.cgstAmount || 0,
        sgstVal: params.voucher.sgstAmount || 0,
        igstVal: params.voucher.igstAmount || 0,
        totInvVal: params.voucher.totalVoucherAmount,
      },
    };
  }

  /**
   * Generates official GSTR-1 JSON from sales invoices
   */
  public static generateGSTR1(params: {
    vouchers: Voucher[];
    company: Company;
    ledgers: LedgerMaster[];
    returnPeriod: string; // e.g. "042026"
  }): Gstr1Data {
    const ledgerMap = new Map(params.ledgers.map((l) => [l.id, l]));
    const salesVouchers = params.vouchers.filter(
      (v) => (v.voucherType === 'SALES' || v.voucherType === 'DEBIT_NOTE') && !v.isCancelled
    );

    const b2bMap = new Map<string, any[]>();
    const b2csList: any[] = [];
    const hsnMap = new Map<string, any>();

    for (const vch of salesVouchers) {
      const party = vch.partyLedgerId ? ledgerMap.get(vch.partyLedgerId) : undefined;
      const isRegistered = !!(party && party.gstin && party.gstRegistrationType === 'Regular');

      const taxable = vch.totalTaxableAmount || (vch.totalVoucherAmount - (vch.cgstAmount || 0) - (vch.sgstAmount || 0) - (vch.igstAmount || 0));
      const pos = party?.placeOfSupply || params.company.stateCode;
      const isInter = pos !== params.company.stateCode;

      if (isRegistered && party?.gstin) {
        if (!b2bMap.has(party.gstin)) {
          b2bMap.set(party.gstin, []);
        }
        b2bMap.get(party.gstin)!.push({
          inum: vch.voucherNumber,
          idt: vch.date.split('-').reverse().join('-'),
          val: vch.totalVoucherAmount,
          pos,
          rchrg: 'N',
          itms: [
            {
              num: 1,
              itm_det: {
                rt: 18,
                txval: taxable,
                iamt: vch.igstAmount || 0,
                camt: vch.cgstAmount || 0,
                samt: vch.sgstAmount || 0,
                csamt: 0,
              },
            },
          ],
        });
      } else {
        b2csList.push({
          sply_ty: isInter ? 'INTER' : 'INTRA',
          pos,
          rt: 18,
          txval: taxable,
          iamt: vch.igstAmount || 0,
          camt: vch.cgstAmount || 0,
          samt: vch.sgstAmount || 0,
        });
      }

      // HSN aggregation
      if (vch.inventoryEntries) {
        for (const item of vch.inventoryEntries) {
          const hsn = item.hsnCode || '8504';
          const existing = hsnMap.get(hsn) || {
            num: hsnMap.size + 1,
            hsn_sc: hsn,
            desc: item.stockItemName,
            uqc: item.unit || 'NOS',
            qty: 0,
            val: 0,
            txval: 0,
            iamt: 0,
            camt: 0,
            samt: 0,
          };
          existing.qty += item.billedQty || 0;
          existing.val += item.amount;
          existing.txval += item.amount;
          if (isInter) {
            existing.iamt += Math.round((item.amount * 0.18) * 100) / 100;
          } else {
            existing.camt += Math.round((item.amount * 0.09) * 100) / 100;
            existing.samt += Math.round((item.amount * 0.09) * 100) / 100;
          }
          hsnMap.set(hsn, existing);
        }
      }
    }

    const b2b = Array.from(b2bMap.entries()).map(([ctin, inv]) => ({
      ctin,
      inv,
    }));

    return {
      gstin: params.company.gstin,
      fp: params.returnPeriod,
      b2b,
      b2cs: b2csList,
      hsn: { data: Array.from(hsnMap.values()) },
    };
  }

  /**
   * Generates GSTR-3B Summary Data
   */
  public static generateGSTR3B(params: {
    vouchers: Voucher[];
    company: Company;
    returnPeriod: string;
  }): Gstr3bData {
    let outTaxable = 0, outIamt = 0, outCamt = 0, outSamt = 0;
    let itcIamt = 0, itcCamt = 0, itcSamt = 0;
    let rcmTaxable = 0, rcmIamt = 0, rcmCamt = 0, rcmSamt = 0;

    for (const vch of params.vouchers) {
      if (vch.isCancelled) continue;

      if (vch.voucherType === 'SALES') {
        const taxable = vch.totalTaxableAmount || (vch.totalVoucherAmount - (vch.cgstAmount || 0) - (vch.sgstAmount || 0) - (vch.igstAmount || 0));
        outTaxable += taxable;
        outIamt += vch.igstAmount || 0;
        outCamt += vch.cgstAmount || 0;
        outSamt += vch.sgstAmount || 0;
      } else if (vch.voucherType === 'PURCHASE') {
        itcIamt += vch.igstAmount || 0;
        itcCamt += vch.cgstAmount || 0;
        itcSamt += vch.sgstAmount || 0;

        // Check if purchase is under Reverse Charge Mechanism
        const isRcm =
          vch.gstDetails?.isReverseChargeApplicable ||
          (vch.narration && vch.narration.toLowerCase().includes('rcm')) ||
          vch.voucherNumber.toLowerCase().includes('rcm');

        if (isRcm) {
          rcmTaxable += vch.totalTaxableAmount || vch.totalVoucherAmount;
          rcmIamt += vch.igstAmount || 0;
          rcmCamt += vch.cgstAmount || 0;
          rcmSamt += vch.sgstAmount || 0;
        }
      }
    }

    return {
      gstin: params.company.gstin,
      ret_period: params.returnPeriod,
      sup_details: {
        osup_det: {
          txval: Math.round(outTaxable * 100) / 100,
          iamt: Math.round(outIamt * 100) / 100,
          camt: Math.round(outCamt * 100) / 100,
          samt: Math.round(outSamt * 100) / 100,
          csamt: 0,
        },
        isup_rev: {
          txval: Math.round(rcmTaxable * 100) / 100,
          iamt: Math.round(rcmIamt * 100) / 100,
          camt: Math.round(rcmCamt * 100) / 100,
          samt: Math.round(rcmSamt * 100) / 100,
          csamt: 0,
        },
      },
      itc_elg: {
        itc_avl: [
          {
            ty: 'All Other ITC',
            iamt: Math.round(itcIamt * 100) / 100,
            camt: Math.round(itcCamt * 100) / 100,
            samt: Math.round(itcSamt * 100) / 100,
            csamt: 0,
          },
        ],
      },
    };
  }

  /**
   * Computes Indian TDS deduction with Section thresholds & 206AA penalty rate
   */
  public static calculateTds(params: {
    amount: number;
    section: '194C' | '194J' | '194I' | '194Q';
    hasValidPan: boolean;
    cumulativePreviousAmount?: number;
    cumulativeAmountYtd?: number;
  }): { tdsRate: number; tdsAmount: number; netPayable: number; isExempt?: boolean } {
    const prevAmount = params.cumulativeAmountYtd ?? params.cumulativePreviousAmount;
    const cumulativeTotal = (prevAmount || 0) + params.amount;

    // Thresholds: 194C: ₹1,00,000 (or ₹30,000 single); 194J: ₹30,000; 194I: ₹2,40,000; 194Q: ₹50,00,000
    const thresholds: Record<string, number> = {
      '194C': 100000,
      '194J': 30000,
      '194I': 240000,
      '194Q': 5000000,
    };
    const threshold = thresholds[params.section] || 0;

    // If cumulative total including current amount does not exceed threshold (and single 194C doesn't exceed 30,000):
    const isExempt =
      prevAmount !== undefined &&
      cumulativeTotal <= threshold &&
      (params.section !== '194C' || params.amount < 30000);

    if (isExempt) {
      return { tdsRate: 0, tdsAmount: 0, netPayable: params.amount, isExempt: true };
    }

    if (!params.hasValidPan) {
      // Mandated Section 206AA rate of 20% if PAN is missing or invalid
      const tdsAmount = Math.round(params.amount * 0.20 * 100) / 100;
      return { tdsRate: 20, tdsAmount, netPayable: params.amount - tdsAmount, isExempt: false };
    }

    let rate = 0;
    switch (params.section) {
      case '194C':
        rate = 1.0; // Contractor Individual/HUF (2% for Company)
        break;
      case '194J':
        rate = 10.0; // Professional Fees
        break;
      case '194I':
        rate = 10.0; // Rent for Land/Building
        break;
      case '194Q':
        rate = 0.1; // Purchase of Goods > 50L
        break;
    }

    const tdsAmount = Math.round(((params.amount * rate) / 100) * 100) / 100;
    return {
      tdsRate: rate,
      tdsAmount,
      netPayable: Math.round((params.amount - tdsAmount) * 100) / 100,
      isExempt: false,
    };
  }
}
