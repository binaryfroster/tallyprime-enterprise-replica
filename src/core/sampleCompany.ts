import {
  Company,
  LedgerMaster,
  StockItem,
  UnitOfMeasure,
  Godown,
  BillOfMaterials,
  Voucher,
  Employee,
  BankStatementTransaction,
} from './types';

export const SAMPLE_COMPANY: Company = {
  id: 'comp_acme_global',
  name: 'Acme Global Technologies Pvt Ltd',
  mailingName: 'Acme Global Technologies Private Limited',
  address: 'Level 8, Cyber Towers, Hitec City, Hyderabad / Nariman Point, Mumbai',
  state: 'Maharashtra',
  country: 'India',
  pincode: '400021',
  telephone: '+91-22-22880011',
  email: 'accounts@acmeglobal.in',
  currencySymbol: '₹',
  formalCurrencyName: 'INR',
  currencyDecimalPlaces: 2,
  financialYearFrom: '2026-04-01',
  booksBeginningFrom: '2026-04-01',
  gstin: '27AABCA1234F1Z8',
  stateCode: '27',
  pan: 'AABCA1234F',
  enableAuditTrail: true,
  features: {
    maintainBillByBill: true,
    maintainInventory: true,
    useSeparateActualBilledQty: true,
    enableMultiGodown: true,
    enableBatches: true,
    enableGst: true,
    enableTds: true,
    enablePayroll: true,
    enableBrs: true,
  },
};

export const SAMPLE_UNITS: UnitOfMeasure[] = [
  { id: 'u_nos', symbol: 'Nos', formalName: 'Numbers', decimalPlaces: 0, isCompound: false },
  { id: 'u_pcs', symbol: 'Pcs', formalName: 'Pieces', decimalPlaces: 0, isCompound: false },
  { id: 'u_box', symbol: 'Box', formalName: 'Box of 10 Nos', decimalPlaces: 0, isCompound: true, compoundFirstUnit: 'Box', compoundMultiplier: 10, compoundSecondUnit: 'Nos' },
];

export const SAMPLE_GODOWNS: Godown[] = [
  { id: 'g_main', name: 'Main Tech Godown', location: 'Navi Mumbai' },
  { id: 'g_prod', name: 'Assembly Plant Godown', location: 'Pune MIDC' },
];

export const SAMPLE_LEDGERS: LedgerMaster[] = [
  // Capital & Reserves
  {
    id: 'led_capital',
    name: 'Share Capital A/c',
    groupId: 'grp_capital_account',
    openingBalance: -10000000, // Cr 1,00,00,000 (1 Crore)
    currency: 'INR',
    maintainBillByBill: false,
  },
  {
    id: 'led_reserves',
    name: 'General Reserves',
    groupId: 'grp_reserves_surplus',
    openingBalance: -2500000, // Cr 25,00,000
    currency: 'INR',
    maintainBillByBill: false,
  },

  // Bank & Cash (Current Assets)
  {
    id: 'led_hdfc_bank',
    name: 'HDFC Bank Current A/c',
    groupId: 'grp_bank_accounts',
    openingBalance: 4500000, // Dr 45,00,000
    currency: 'INR',
    maintainBillByBill: false,
    bankAccountNo: '50200012345678',
    ifscCode: 'HDFC0000123',
    bankName: 'HDFC Bank Ltd',
    branchName: 'Nariman Point, Mumbai',
  },
  {
    id: 'led_sbi_bank',
    name: 'State Bank of India A/c',
    groupId: 'grp_bank_accounts',
    openingBalance: 2000000, // Dr 20,00,000
    currency: 'INR',
    maintainBillByBill: false,
    bankAccountNo: '30998877665',
    ifscCode: 'SBIN0000456',
    bankName: 'State Bank of India',
    branchName: 'Fort, Mumbai',
  },
  {
    id: 'led_cash',
    name: 'Cash-in-hand',
    groupId: 'grp_cash_in_hand',
    openingBalance: 150000, // Dr 1,50,000
    currency: 'INR',
    maintainBillByBill: false,
  },

  // Fixed Assets & Investments
  {
    id: 'led_factory_premises',
    name: 'Factory Premises & Land',
    groupId: 'grp_fixed_assets',
    openingBalance: 3800000, // Dr 38,00,000 to balance opening Trial Balance
    currency: 'INR',
    maintainBillByBill: false,
  },
  {
    id: 'led_computers_servers',
    name: 'Data Center Servers & Hardware',
    groupId: 'grp_fixed_assets',
    openingBalance: 3200000, // Dr 32,00,000
    currency: 'INR',
    maintainBillByBill: false,
  },
  {
    id: 'led_office_equipment',
    name: 'Office Equipment',
    groupId: 'grp_fixed_assets',
    openingBalance: 850000, // Dr 8,50,000
    currency: 'INR',
    maintainBillByBill: false,
  },

  // Sundry Debtors (Customers)
  {
    id: 'led_deb_infosys',
    name: 'Infosys BPM Solutions',
    alias: 'Infosys',
    groupId: 'grp_sundry_debtors',
    openingBalance: 1200000, // Dr 12,00,000
    currency: 'INR',
    maintainBillByBill: true,
    defaultCreditPeriodDays: 30,
    creditLimit: 5000000,
    gstRegistrationType: 'Regular',
    gstin: '29AABCI1234G1Z2', // Karnataka (Inter-State POS 29)
    placeOfSupply: '29',
    pan: 'AABCI1234G',
    state: 'Karnataka',
  },
  {
    id: 'led_deb_tata',
    name: 'Tata Consultancy Services Ltd',
    alias: 'TCS',
    groupId: 'grp_sundry_debtors',
    openingBalance: 2400000, // Dr 24,00,000
    currency: 'INR',
    maintainBillByBill: true,
    defaultCreditPeriodDays: 45,
    creditLimit: 10000000,
    gstRegistrationType: 'Regular',
    gstin: '27AABCT5678H1Z9', // Maharashtra (Intra-State POS 27)
    placeOfSupply: '27',
    pan: 'AABCT5678H',
    state: 'Maharashtra',
  },

  // Sundry Creditors (Vendors)
  {
    id: 'led_crd_intel',
    name: 'Intel Semiconductor India Pvt Ltd',
    alias: 'Intel',
    groupId: 'grp_sundry_creditors',
    openingBalance: -3500000, // Cr 35,00,000
    currency: 'INR',
    maintainBillByBill: true,
    defaultCreditPeriodDays: 30,
    gstRegistrationType: 'Regular',
    gstin: '29AABCI9876J1Z5',
    placeOfSupply: '29',
    pan: 'AABCI9876J',
    state: 'Karnataka',
  },
  {
    id: 'led_crd_samsung',
    name: 'Samsung Electronics India Ltd',
    alias: 'Samsung',
    groupId: 'grp_sundry_creditors',
    openingBalance: -2100000, // Cr 21,00,000
    currency: 'INR',
    maintainBillByBill: true,
    defaultCreditPeriodDays: 30,
    gstRegistrationType: 'Regular',
    gstin: '27AABCS4321K1Z1',
    placeOfSupply: '27',
    pan: 'AABCS4321K',
    state: 'Maharashtra',
  },

  // Sales & Incomes
  {
    id: 'led_sales_domestic',
    name: 'Domestic Hardware Sales 18%',
    groupId: 'grp_sales_accounts',
    openingBalance: 0,
    currency: 'INR',
    maintainBillByBill: false,
  },
  {
    id: 'led_sales_services',
    name: 'Cloud Infrastructure Services',
    groupId: 'grp_direct_incomes',
    openingBalance: 0,
    currency: 'INR',
    maintainBillByBill: false,
  },
  {
    id: 'led_interest_income',
    name: 'Bank Interest Received',
    groupId: 'grp_indirect_incomes',
    openingBalance: 0,
    currency: 'INR',
    maintainBillByBill: false,
  },

  // Purchases & Expenses
  {
    id: 'led_purchases_components',
    name: 'Hardware Components Purchase 18%',
    groupId: 'grp_purchase_accounts',
    openingBalance: 0,
    currency: 'INR',
    maintainBillByBill: false,
  },
  {
    id: 'led_rent_expense',
    name: 'Office Rent & Facility Charges',
    groupId: 'grp_indirect_expenses',
    openingBalance: 0,
    currency: 'INR',
    maintainBillByBill: false,
  },
  {
    id: 'led_salaries_expense',
    name: 'Salaries & Wages A/c',
    groupId: 'grp_indirect_expenses',
    openingBalance: 0,
    currency: 'INR',
    maintainBillByBill: false,
  },

  // Duties & Taxes
  {
    id: 'led_cgst_output',
    name: 'Output CGST 9%',
    groupId: 'grp_duties_taxes',
    openingBalance: 0,
    currency: 'INR',
    maintainBillByBill: false,
  },
  {
    id: 'led_sgst_output',
    name: 'Output SGST 9%',
    groupId: 'grp_duties_taxes',
    openingBalance: 0,
    currency: 'INR',
    maintainBillByBill: false,
  },
  {
    id: 'led_igst_output',
    name: 'Output IGST 18%',
    groupId: 'grp_duties_taxes',
    openingBalance: 0,
    currency: 'INR',
    maintainBillByBill: false,
  },
  {
    id: 'led_cgst_input',
    name: 'Input CGST 9%',
    groupId: 'grp_duties_taxes',
    openingBalance: 0,
    currency: 'INR',
    maintainBillByBill: false,
  },
  {
    id: 'led_sgst_input',
    name: 'Input SGST 9%',
    groupId: 'grp_duties_taxes',
    openingBalance: 0,
    currency: 'INR',
    maintainBillByBill: false,
  },
  {
    id: 'led_igst_input',
    name: 'Input IGST 18%',
    groupId: 'grp_duties_taxes',
    openingBalance: 0,
    currency: 'INR',
    maintainBillByBill: false,
  },

  // Payroll liabilities
  {
    id: 'led_salary_payable',
    name: 'Salary Payable A/c',
    groupId: 'grp_current_liabilities',
    openingBalance: 0,
    currency: 'INR',
    maintainBillByBill: false,
  },
  {
    id: 'led_pf_payable',
    name: 'PF Payable A/c',
    groupId: 'grp_provisions',
    openingBalance: 0,
    currency: 'INR',
    maintainBillByBill: false,
  },
  {
    id: 'led_esi_payable',
    name: 'ESI Payable A/c',
    groupId: 'grp_provisions',
    openingBalance: 0,
    currency: 'INR',
    maintainBillByBill: false,
  },
  {
    id: 'led_pt_payable',
    name: 'Professional Tax Payable A/c',
    groupId: 'grp_duties_taxes',
    openingBalance: 0,
    currency: 'INR',
    maintainBillByBill: false,
  },
];

export const SAMPLE_STOCK_ITEMS: StockItem[] = [
  {
    id: 'item_cpu_xeon',
    name: 'Intel Xeon 3.4GHz Processor IC',
    partNumber: 'XEON-8490',
    baseUnitId: 'Nos',
    costingMethod: 'FIFO',
    openingQuantity: 150,
    openingRate: 35000,
    openingValue: 5250000,
    godownId: 'g_main',
    hsnCode: '85423100',
    gstRate: 18,
    reorderLevel: 25,
  },
  {
    id: 'item_nvme_ssd',
    name: 'Samsung 2TB Enterprise NVMe SSD',
    partNumber: 'MZ-QL23T80',
    baseUnitId: 'Nos',
    costingMethod: 'Weighted Average',
    openingQuantity: 300,
    openingRate: 12000,
    openingValue: 3600000,
    godownId: 'g_main',
    hsnCode: '84717020',
    gstRate: 18,
    reorderLevel: 50,
  },
  {
    id: 'item_server_blade',
    name: 'Acme Apex Cloud Server Blade X1',
    partNumber: 'ACME-SRV-X1',
    baseUnitId: 'Nos',
    costingMethod: 'FIFO',
    openingQuantity: 20,
    openingRate: 125000,
    openingValue: 2500000,
    godownId: 'g_prod',
    hsnCode: '84715000',
    gstRate: 18,
    reorderLevel: 5,
  },
];

export const SAMPLE_BOM: BillOfMaterials = {
  id: 'bom_server_blade',
  name: 'Standard Cloud Server Blade Recipe',
  finishedStockItemId: 'item_server_blade',
  outputQuantity: 1,
  components: [
    { stockItemId: 'item_cpu_xeon', quantity: 2, unit: 'Nos' },
    { stockItemId: 'item_nvme_ssd', quantity: 4, unit: 'Nos' },
  ],
};

export const SAMPLE_EMPLOYEES: Employee[] = [
  {
    id: 'emp_01',
    name: 'Vikramaditya Sharma',
    employeeCode: 'EMP-101',
    designation: 'Principal Systems Architect',
    department: 'Engineering',
    dateOfJoining: '2023-01-15',
    pan: 'ABVPS1234K',
    bankAccountNo: '5010022334455',
    ifscCode: 'HDFC0000123',
    pfNumber: 'MH/BAN/0012345/000/101',
    basicSalary: 120000,
    hra: 50000,
    specialAllowance: 30000,
  },
  {
    id: 'emp_02',
    name: 'Ananya Deshmukh',
    employeeCode: 'EMP-102',
    designation: 'Senior DevOps Specialist',
    department: 'Infrastructure',
    dateOfJoining: '2023-06-01',
    pan: 'ACXPD5678M',
    bankAccountNo: '5010099887766',
    ifscCode: 'HDFC0000123',
    pfNumber: 'MH/BAN/0012345/000/102',
    basicSalary: 80000,
    hra: 32000,
    specialAllowance: 20000,
  },
];

export const SAMPLE_VOUCHERS: Voucher[] = [
  // 1. Inward Sales Invoice to Tata Consultancy Services (Intra-State: CGST + SGST)
  {
    id: 'vch_001_sales_tcs',
    voucherNumber: 'INV/2026/001',
    voucherType: 'SALES',
    date: '2026-04-10',
    invoicingMode: 'ITEM_INVOICE',
    partyLedgerId: 'led_deb_tata',
    partyName: 'Tata Consultancy Services Ltd',
    referenceNumber: 'PO/TCS/8871',
    narration: 'Supply of Cloud Server Blades for Hinjewadi Phase 3 Data Center',
    totalTaxableAmount: 1250000,
    cgstAmount: 112500,
    sgstAmount: 112500,
    igstAmount: 0,
    totalVoucherAmount: 1475000,
    ledgerEntries: [
      {
        id: 'le_1',
        ledgerId: 'led_deb_tata',
        ledgerName: 'Tata Consultancy Services Ltd',
        amount: 1475000, // Dr (Customer owes)
        isDeemedPositive: true,
        billAllocations: [
          {
            id: 'ba_1',
            type: 'New Ref',
            refName: 'INV/2026/001',
            amount: 1475000,
            creditDays: 45,
            dueDate: '2026-05-25',
          },
        ],
      },
      {
        id: 'le_2',
        ledgerId: 'led_sales_domestic',
        ledgerName: 'Domestic Hardware Sales 18%',
        amount: -1250000, // Cr
        isDeemedPositive: false,
      },
      {
        id: 'le_3',
        ledgerId: 'led_cgst_output',
        ledgerName: 'Output CGST 9%',
        amount: -112500, // Cr
        isDeemedPositive: false,
      },
      {
        id: 'le_4',
        ledgerId: 'led_sgst_output',
        ledgerName: 'Output SGST 9%',
        amount: -112500, // Cr
        isDeemedPositive: false,
      },
    ],
    inventoryEntries: [
      {
        id: 'ie_1',
        stockItemId: 'item_server_blade',
        stockItemName: 'Acme Apex Cloud Server Blade X1',
        godownId: 'g_prod',
        actualQty: 10,
        billedQty: 10,
        unit: 'Nos',
        rate: 125000,
        amount: 1250000,
        hsnCode: '84715000',
        gstRate: 18,
      },
    ],
    createdAt: '2026-04-10T10:30:00Z',
    updatedAt: '2026-04-10T10:30:00Z',
    createdBy: 'sr_accountant',
  },

  // 2. Inter-State Sales Invoice to Infosys (Inter-State: IGST)
  {
    id: 'vch_002_sales_infosys',
    voucherNumber: 'INV/2026/002',
    voucherType: 'SALES',
    date: '2026-04-15',
    invoicingMode: 'ITEM_INVOICE',
    partyLedgerId: 'led_deb_infosys',
    partyName: 'Infosys BPM Solutions',
    referenceNumber: 'PO/INFY/9920',
    narration: 'Inter-state supply of Server Blades to Bangalore campus',
    totalTaxableAmount: 625000,
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: 112500,
    totalVoucherAmount: 737500,
    ledgerEntries: [
      {
        id: 'le_5',
        ledgerId: 'led_deb_infosys',
        ledgerName: 'Infosys BPM Solutions',
        amount: 737500, // Dr
        isDeemedPositive: true,
        billAllocations: [
          {
            id: 'ba_2',
            type: 'New Ref',
            refName: 'INV/2026/002',
            amount: 737500,
            creditDays: 30,
            dueDate: '2026-05-15',
          },
        ],
      },
      {
        id: 'le_6',
        ledgerId: 'led_sales_domestic',
        ledgerName: 'Domestic Hardware Sales 18%',
        amount: -625000, // Cr
        isDeemedPositive: false,
      },
      {
        id: 'le_7',
        ledgerId: 'led_igst_output',
        ledgerName: 'Output IGST 18%',
        amount: -112500, // Cr
        isDeemedPositive: false,
      },
    ],
    inventoryEntries: [
      {
        id: 'ie_2',
        stockItemId: 'item_server_blade',
        stockItemName: 'Acme Apex Cloud Server Blade X1',
        godownId: 'g_prod',
        actualQty: 5,
        billedQty: 5,
        unit: 'Nos',
        rate: 125000,
        amount: 625000,
        hsnCode: '84715000',
        gstRate: 18,
      },
    ],
    createdAt: '2026-04-15T14:15:00Z',
    updatedAt: '2026-04-15T14:15:00Z',
    createdBy: 'sr_accountant',
  },

  // 3. Receipt from Tata Consultancy Services against INV/2026/001 (Receipt F6)
  {
    id: 'vch_003_receipt_tcs',
    voucherNumber: 'REC/2026/001',
    voucherType: 'RECEIPT',
    date: '2026-04-25',
    invoicingMode: 'AS_VOUCHER',
    partyLedgerId: 'led_deb_tata',
    partyName: 'Tata Consultancy Services Ltd',
    referenceNumber: 'NEFT-TCS-901122',
    narration: 'Settlement received via NEFT for invoice INV/2026/001',
    totalVoucherAmount: 1475000,
    ledgerEntries: [
      {
        id: 'le_8',
        ledgerId: 'led_hdfc_bank',
        ledgerName: 'HDFC Bank Current A/c',
        amount: 1475000, // Dr (Bank increases)
        isDeemedPositive: true,
      },
      {
        id: 'le_9',
        ledgerId: 'led_deb_tata',
        ledgerName: 'Tata Consultancy Services Ltd',
        amount: -1475000, // Cr (Debtor decreases)
        isDeemedPositive: false,
        billAllocations: [
          {
            id: 'ba_3',
            type: 'Agst Ref',
            refName: 'INV/2026/001',
            amount: -1475000,
          },
        ],
      },
    ],
    createdAt: '2026-04-25T11:00:00Z',
    updatedAt: '2026-04-25T11:00:00Z',
    createdBy: 'cashier',
  },

  // 4. Component Purchase from Intel (Purchase F9)
  {
    id: 'vch_004_purchase_intel',
    voucherNumber: 'PUR/2026/001',
    voucherType: 'PURCHASE',
    date: '2026-05-02',
    invoicingMode: 'ITEM_INVOICE',
    partyLedgerId: 'led_crd_intel',
    partyName: 'Intel Semiconductor India Pvt Ltd',
    referenceNumber: 'INTEL/BLR/88219',
    narration: 'Procurement of 50 units Intel Xeon Processors',
    totalTaxableAmount: 1750000,
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: 315000,
    totalVoucherAmount: 2065000,
    ledgerEntries: [
      {
        id: 'le_10',
        ledgerId: 'led_purchases_components',
        ledgerName: 'Hardware Components Purchase 18%',
        amount: 1750000, // Dr
        isDeemedPositive: true,
      },
      {
        id: 'le_11',
        ledgerId: 'led_igst_input',
        ledgerName: 'Input IGST 18%',
        amount: 315000, // Dr (ITC increases)
        isDeemedPositive: true,
      },
      {
        id: 'le_12',
        ledgerId: 'led_crd_intel',
        ledgerName: 'Intel Semiconductor India Pvt Ltd',
        amount: -2065000, // Cr (Vendor liability)
        isDeemedPositive: false,
        billAllocations: [
          {
            id: 'ba_4',
            type: 'New Ref',
            refName: 'INTEL/BLR/88219',
            amount: -2065000,
            creditDays: 30,
            dueDate: '2026-06-01',
          },
        ],
      },
    ],
    inventoryEntries: [
      {
        id: 'ie_3',
        stockItemId: 'item_cpu_xeon',
        stockItemName: 'Intel Xeon 3.4GHz Processor IC',
        godownId: 'g_main',
        actualQty: 50,
        billedQty: 50,
        unit: 'Nos',
        rate: 35000,
        amount: 1750000,
        hsnCode: '85423100',
        gstRate: 18,
      },
    ],
    createdAt: '2026-05-02T16:00:00Z',
    updatedAt: '2026-05-02T16:00:00Z',
    createdBy: 'purchase_mgr',
  },

  // 5. Contra Transfer: HDFC Current A/c to SBI A/c (Contra F4)
  {
    id: 'vch_005_contra_bank_transfer',
    voucherNumber: 'CNT/2026/001',
    voucherType: 'CONTRA',
    date: '2026-05-05',
    invoicingMode: 'AS_VOUCHER',
    referenceNumber: 'RTGS-TRF-001',
    narration: 'Inter-bank fund transfer from HDFC Bank to SBI A/c',
    totalVoucherAmount: 500000,
    ledgerEntries: [
      {
        id: 'le_13',
        ledgerId: 'led_sbi_bank',
        ledgerName: 'State Bank of India A/c',
        amount: 500000, // Dr
        isDeemedPositive: true,
      },
      {
        id: 'le_14',
        ledgerId: 'led_hdfc_bank',
        ledgerName: 'HDFC Bank Current A/c',
        amount: -500000, // Cr
        isDeemedPositive: false,
      },
    ],
    createdAt: '2026-05-05T12:00:00Z',
    updatedAt: '2026-05-05T12:00:00Z',
    createdBy: 'accountant',
  },

  // 6. Payment to Intel against bill INTEL/BLR/88219 (Payment F5)
  {
    id: 'vch_006_payment_intel',
    voucherNumber: 'PMT/2026/001',
    voucherType: 'PAYMENT',
    date: '2026-05-20',
    invoicingMode: 'AS_VOUCHER',
    partyLedgerId: 'led_crd_intel',
    partyName: 'Intel Semiconductor India Pvt Ltd',
    referenceNumber: 'CHQ-890012',
    narration: 'Partial settlement to Intel via HDFC Cheque 890012',
    totalVoucherAmount: 1000000,
    ledgerEntries: [
      {
        id: 'le_15',
        ledgerId: 'led_crd_intel',
        ledgerName: 'Intel Semiconductor India Pvt Ltd',
        amount: 1000000, // Dr (Liability reduced)
        isDeemedPositive: true,
        billAllocations: [
          {
            id: 'ba_5',
            type: 'Agst Ref',
            refName: 'INTEL/BLR/88219',
            amount: 1000000,
          },
        ],
      },
      {
        id: 'le_16',
        ledgerId: 'led_hdfc_bank',
        ledgerName: 'HDFC Bank Current A/c',
        amount: -1000000, // Cr (Bank reduced)
        isDeemedPositive: false,
      },
    ],
    createdAt: '2026-05-20T15:30:00Z',
    updatedAt: '2026-05-20T15:30:00Z',
    createdBy: 'cashier',
  },

  // 7. Monthly Office Rent Payment (Journal / Payment F5)
  {
    id: 'vch_007_rent_payment',
    voucherNumber: 'PMT/2026/002',
    voucherType: 'PAYMENT',
    date: '2026-05-31',
    invoicingMode: 'ACCOUNTING_INVOICE',
    narration: 'Office Rent for May 2026 paid via SBI NetBanking',
    totalVoucherAmount: 150000,
    ledgerEntries: [
      {
        id: 'le_17',
        ledgerId: 'led_rent_expense',
        ledgerName: 'Office Rent & Facility Charges',
        amount: 150000, // Dr
        isDeemedPositive: true,
      },
      {
        id: 'le_18',
        ledgerId: 'led_sbi_bank',
        ledgerName: 'State Bank of India A/c',
        amount: -150000, // Cr
        isDeemedPositive: false,
      },
    ],
    createdAt: '2026-05-31T17:00:00Z',
    updatedAt: '2026-05-31T17:00:00Z',
    createdBy: 'accountant',
  },
];

export const SAMPLE_BANK_STATEMENTS: BankStatementTransaction[] = [
  {
    id: 'stmt_1',
    date: '2026-04-26',
    chequeOrRefNo: 'NEFT-TCS-901122',
    description: 'NEFT CR-TATA CONSULTANCY SERVICES-SETTLEMENT',
    debit: 0,
    credit: 1475000,
    balance: 5975000,
  },
  {
    id: 'stmt_2',
    date: '2026-05-05',
    chequeOrRefNo: 'RTGS-TRF-001',
    description: 'RTGS DR-OWN ACC TRF TO SBI-MUMBAI',
    debit: 500000,
    credit: 0,
    balance: 5475000,
  },
  // Note: Cheque CHQ-890012 for 10,00,000 issued to Intel on 2026-05-20 is deliberately unpresented!
  // This cleanly tests and showcases the BRS engine detecting unpresented cheques.
];
