export type GroupNature = 'Liabilities' | 'Assets' | 'Income' | 'Expense';

export interface AccountGroup {
  id: string;
  name: string;
  parentGroupId: string | null;
  nature: GroupNature;
  isPrimary: boolean;
  affectsGrossProfit: boolean;
  isSubLedger?: boolean;
  nettGrossBalance?: boolean;
  isAddlCostAllocation?: boolean;
}

export interface LedgerMaster {
  id: string;
  name: string;
  alias?: string;
  groupId: string;
  openingBalance: number; // positive = Dr, negative = Cr
  currency: string;
  maintainBillByBill: boolean;
  defaultCreditPeriodDays?: number;
  creditLimit?: number;
  // Mailing Details
  mailingName?: string;
  address?: string;
  state?: string;
  country?: string;
  pincode?: string;
  // Banking
  bankAccountNo?: string;
  ifscCode?: string;
  bankName?: string;
  branchName?: string;
  // Statutory
  pan?: string;
  gstRegistrationType?: 'Regular' | 'Composition' | 'Unregistered' | 'Consumer' | 'SEZ';
  gstin?: string;
  placeOfSupply?: string;
  // TDS / TCS
  isTdsApplicable?: boolean;
  tdsSection?: string;
  tdsRate?: number;
}

export type VoucherTypeCode =
  | 'CONTRA'
  | 'PAYMENT'
  | 'RECEIPT'
  | 'JOURNAL'
  | 'SALES'
  | 'PURCHASE'
  | 'DEBIT_NOTE'
  | 'CREDIT_NOTE'
  | 'DELIVERY_NOTE'
  | 'RECEIPT_NOTE'
  | 'SALES_ORDER'
  | 'PURCHASE_ORDER'
  | 'STOCK_JOURNAL'
  | 'PHYSICAL_STOCK'
  | 'PAYROLL'
  | 'ATTENDANCE'
  | 'MEMORANDUM'
  | 'REVERSING_JOURNAL';

export type InvoicingMode = 'ITEM_INVOICE' | 'ACCOUNTING_INVOICE' | 'AS_VOUCHER';

export type BillRefType = 'New Ref' | 'Agst Ref' | 'Advance' | 'On Account';

export interface BillAllocation {
  id: string;
  type: BillRefType;
  refName: string;
  amount: number; // positive = Dr, negative = Cr
  creditDays?: number;
  dueDate?: string;
}

export interface BatchAllocation {
  batchNumber: string;
  godownId: string;
  quantity: number;
  billedQuantity: number;
  rate: number;
  amount: number;
  mfgDate?: string;
  expiryDate?: string;
}

export interface InventoryItemLine {
  id: string;
  stockItemId: string;
  stockItemName: string;
  godownId: string;
  actualQty: number;
  billedQty: number;
  unit: string;
  rate: number;
  discountPercent?: number;
  amount: number;
  hsnCode?: string;
  gstRate?: number;
  batchAllocations?: BatchAllocation[];
}

export interface LedgerEntryLine {
  id: string;
  ledgerId: string;
  ledgerName: string;
  amount: number; // positive = Dr, negative = Cr
  isDeemedPositive?: boolean; // Tally XML format flag (true = Dr, false = Cr)
  billAllocations?: BillAllocation[];
  narration?: string;
}

export interface Voucher {
  id: string;
  voucherNumber: string;
  voucherType: VoucherTypeCode;
  date: string; // YYYY-MM-DD
  effectiveDate?: string;
  invoicingMode: InvoicingMode;
  partyLedgerId?: string;
  partyName?: string;
  narration?: string;
  referenceNumber?: string;
  referenceDate?: string;
  ledgerEntries: LedgerEntryLine[];
  inventoryEntries?: InventoryItemLine[];
  // Statutory calculations
  totalTaxableAmount?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  roundOffAmount?: number;
  totalVoucherAmount: number;
  gstDetails?: {
    isReverseChargeApplicable?: boolean;
    placeOfSupply?: string;
    gstRate?: number;
    [key: string]: any;
  };
  // Audit & Status
  isCancelled?: boolean;
  isOptional?: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface UnitOfMeasure {
  id: string;
  symbol: string;
  formalName: string;
  decimalPlaces: number;
  isCompound: boolean;
  compoundFirstUnit?: string;
  compoundMultiplier?: number;
  compoundSecondUnit?: string;
}

export type CostingMethod =
  | 'Weighted Average'
  | 'FIFO'
  | 'LIFO'
  | 'Last Purchase Cost'
  | 'Standard Price'
  | 'High Cost'
  | 'Zero Cost';

export interface StockItem {
  id: string;
  name: string;
  partNumber?: string;
  categoryId?: string;
  baseUnitId: string;
  alternateUnitId?: string;
  conversionNumerator?: number;
  conversionDenominator?: number;
  costingMethod: CostingMethod;
  openingQuantity: number;
  openingRate: number;
  openingValue: number;
  godownId?: string;
  hsnCode?: string;
  gstRate: number; // e.g. 18 for 18%
  reorderLevel?: number;
}

export interface Godown {
  id: string;
  name: string;
  parentGodownId?: string | null;
  location?: string;
}

export interface BillOfMaterialsComponent {
  stockItemId: string;
  quantity: number;
  unit: string;
  scrapPercentage?: number;
}

export interface BillOfMaterials {
  id: string;
  name: string;
  finishedStockItemId: string;
  outputQuantity: number;
  components: BillOfMaterialsComponent[];
}

export interface AuditTrailLog {
  id: string;
  timestamp: string;
  entityType: 'MASTER' | 'VOUCHER' | 'COMPANY';
  entityId: string;
  action: 'CREATE' | 'ALTER' | 'DELETE' | 'CANCEL';
  userId: string;
  ipAddress?: string;
  previousHash: string;
  currentHash: string;
  diff: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
}

export interface Company {
  id: string;
  name: string;
  mailingName: string;
  address: string;
  state: string;
  country: string;
  pincode: string;
  telephone?: string;
  email?: string;
  currencySymbol: string;
  formalCurrencyName: string;
  currencyDecimalPlaces: number;
  financialYearFrom: string;
  booksBeginningFrom: string;
  gstin: string;
  stateCode: string;
  pan: string;
  enableAuditTrail: boolean;
  features: {
    maintainBillByBill: boolean;
    maintainInventory: boolean;
    useSeparateActualBilledQty: boolean;
    enableMultiGodown: boolean;
    enableBatches: boolean;
    enableGst: boolean;
    enableTds: boolean;
    enablePayroll: boolean;
    enableBrs: boolean;
  };
}

export interface Employee {
  id: string;
  name: string;
  employeeCode: string;
  designation: string;
  department: string;
  dateOfJoining: string;
  pan: string;
  aadhaar?: string;
  bankAccountNo: string;
  ifscCode: string;
  pfNumber?: string;
  esiNumber?: string;
  basicSalary: number;
  hra: number;
  specialAllowance: number;
}

export interface BankStatementTransaction {
  id: string;
  date: string;
  description: string;
  chequeOrRefNo: string;
  debit: number;
  credit: number;
  balance: number;
  matchedVoucherId?: string;
  reconciledDate?: string;
}
