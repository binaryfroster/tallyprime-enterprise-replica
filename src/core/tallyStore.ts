import {
  Company,
  LedgerMaster,
  StockItem,
  Voucher,
  AccountGroup,
  UnitOfMeasure,
  Godown,
  BillOfMaterials,
  Employee,
  BankStatementTransaction,
  AuditTrailLog,
} from './types';
import { PREDEFINED_GROUPS } from './chartOfAccounts';
import { AccountingEngine } from './accountingEngine';
import { InventoryEngine } from './inventoryEngine';
import { AuditEngine } from './auditEngine';
import { BankingEngine } from './bankingEngine';
import { SecurityEngine, globalSecurityEngine } from './securityEngine';
import { PublicUser } from './securityTypes';
import {
  SAMPLE_COMPANY,
  SAMPLE_LEDGERS,
  SAMPLE_STOCK_ITEMS,
  SAMPLE_VOUCHERS,
  SAMPLE_UNITS,
  SAMPLE_GODOWNS,
  SAMPLE_BOM,
  SAMPLE_EMPLOYEES,
  SAMPLE_BANK_STATEMENTS,
} from './sampleCompany';

export class TallyStore {
  private company: Company = SAMPLE_COMPANY;
  private groups: AccountGroup[] = [...PREDEFINED_GROUPS];
  private ledgers: LedgerMaster[] = [...SAMPLE_LEDGERS];
  private stockItems: StockItem[] = [...SAMPLE_STOCK_ITEMS];
  private units: UnitOfMeasure[] = [...SAMPLE_UNITS];
  private godowns: Godown[] = [...SAMPLE_GODOWNS];
  private boms: BillOfMaterials[] = [SAMPLE_BOM];
  private employees: Employee[] = [...SAMPLE_EMPLOYEES];
  private vouchers: Voucher[] = [...SAMPLE_VOUCHERS];
  private bankStatements: BankStatementTransaction[] = [...SAMPLE_BANK_STATEMENTS];

  private accountingEngine: AccountingEngine;
  private inventoryEngine: InventoryEngine;
  private auditEngine: AuditEngine;
  private securityEngine: SecurityEngine;

  private listeners: (() => void)[] = [];

  constructor(securityEngine?: SecurityEngine) {
    this.accountingEngine = new AccountingEngine(this.groups, this.ledgers);
    this.inventoryEngine = new InventoryEngine(this.stockItems, this.boms);
    this.auditEngine = new AuditEngine();
    this.securityEngine = securityEngine || new SecurityEngine();

    // Initial audit log for company creation
    this.auditEngine.recordChange({
      entityType: 'COMPANY',
      entityId: this.company.id,
      action: 'CREATE',
      userId: this.securityEngine.getCurrentUser()?.username || 'admin',
      diff: [{ field: 'name', oldValue: null, newValue: this.company.name }],
    });
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  public getCompany(): Company {
    return this.company;
  }

  public setCompany(company: Company) {
    const old = this.company;
    this.company = company;
    this.auditEngine.recordChange({
      entityType: 'COMPANY',
      entityId: company.id,
      action: 'ALTER',
      diff: [{ field: 'all', oldValue: old, newValue: company }],
    });
    this.notify();
  }

  public getSecurityEngine(): SecurityEngine {
    return this.securityEngine;
  }

  public getAuditEngine(): AuditEngine {
    return this.auditEngine;
  }

  public getGroups(): AccountGroup[] {
    return this.groups;
  }

  public getLedgers(): LedgerMaster[] {
    return this.ledgers;
  }

  public getStockItems(): StockItem[] {
    return this.stockItems;
  }

  public getUnits(): UnitOfMeasure[] {
    return this.units;
  }

  public getGodowns(): Godown[] {
    return this.godowns;
  }

  public getBoms(): BillOfMaterials[] {
    return this.boms;
  }

  public getEmployees(): Employee[] {
    return this.employees;
  }

  public getVouchers(): Voucher[] {
    return this.vouchers;
  }

  public getBankStatements(): BankStatementTransaction[] {
    return this.bankStatements;
  }

  public getAuditLogs(): AuditTrailLog[] {
    return this.auditEngine.getLogs();
  }

  public addGroup(group: AccountGroup) {
    this.groups.push(group);
    this.accountingEngine.registerGroup(group);
    this.auditEngine.recordChange({
      entityType: 'MASTER',
      entityId: group.id,
      action: 'CREATE',
      diff: [
        { field: 'name', oldValue: null, newValue: group.name },
        { field: 'nature', oldValue: null, newValue: group.nature },
        { field: 'parentGroupId', oldValue: null, newValue: group.parentGroupId },
      ],
    });
    this.notify();
  }

  public addLedger(ledger: LedgerMaster, actingUser?: PublicUser): { success: boolean; error?: string } {
    const user = actingUser !== undefined ? actingUser : this.securityEngine.getCurrentUser();
    const auth = this.securityEngine.canExecute('CREATE_MASTER', { actingUser: user });
    if (!auth.allowed) {
      return { success: false, error: auth.reason };
    }

    this.ledgers.push(ledger);
    this.accountingEngine.registerLedger(ledger);
    this.auditEngine.recordChange({
      entityType: 'MASTER',
      entityId: ledger.id,
      action: 'CREATE',
      userId: user?.username || 'admin',
      diff: [
        { field: 'name', oldValue: null, newValue: ledger.name },
        { field: 'groupId', oldValue: null, newValue: ledger.groupId },
        { field: 'openingBalance', oldValue: null, newValue: ledger.openingBalance },
      ],
    });
    this.notify();
    return { success: true };
  }

  public addStockItem(item: StockItem, actingUser?: PublicUser): { success: boolean; error?: string } {
    const user = actingUser !== undefined ? actingUser : this.securityEngine.getCurrentUser();
    const auth = this.securityEngine.canExecute('CREATE_MASTER', { actingUser: user });
    if (!auth.allowed) {
      return { success: false, error: auth.reason };
    }

    this.stockItems.push(item);
    this.inventoryEngine.registerStockItem(item);
    this.auditEngine.recordChange({
      entityType: 'MASTER',
      entityId: item.id,
      action: 'CREATE',
      userId: user?.username || 'admin',
      diff: [
        { field: 'name', oldValue: null, newValue: item.name },
        { field: 'rate', oldValue: null, newValue: item.openingRate },
      ],
    });
    this.notify();
    return { success: true };
  }

  public addVoucher(voucher: Voucher, actingUser?: PublicUser): { success: boolean; error?: string } {
    // 0. Security & Back-dating Policy Guard
    const user = actingUser !== undefined ? actingUser : this.securityEngine.getCurrentUser();
    const auth = this.securityEngine.canExecute('CREATE_VOUCHER', {
      voucherDate: voucher.date,
      currentDate: new Date().toISOString().substring(0, 10),
      actingUser: user,
    });
    if (!auth.allowed) {
      return { success: false, error: auth.reason };
    }

    // 1. Double-Entry Validation
    if (voucher.voucherType !== 'MEMORANDUM') {
      const validation = AccountingEngine.validateVoucherDoubleEntry(voucher);
      if (!validation.isValid) {
        return { success: false, error: validation.error };
      }
    }

    // 2. Append Voucher
    this.vouchers.push(voucher);

    // 3. MCA Audit Log with Authenticated User Attribution
    this.auditEngine.recordChange({
      entityType: 'VOUCHER',
      entityId: voucher.id,
      action: 'CREATE',
      userId: user?.username || 'admin',
      diff: [
        { field: 'voucherNumber', oldValue: null, newValue: voucher.voucherNumber },
        { field: 'voucherType', oldValue: null, newValue: voucher.voucherType },
        { field: 'amount', oldValue: null, newValue: voucher.totalVoucherAmount },
        { field: 'date', oldValue: null, newValue: voucher.date },
      ],
    });

    this.notify();
    return { success: true };
  }

  public updateVoucher(voucher: Voucher, actingUser?: PublicUser): { success: boolean; error?: string } {
    // 0. Security Guard
    const user = actingUser !== undefined ? actingUser : this.securityEngine.getCurrentUser();
    const auth = this.securityEngine.canExecute('ALTER_VOUCHER', {
      voucherDate: voucher.date,
      currentDate: new Date().toISOString().substring(0, 10),
      actingUser: user,
    });
    if (!auth.allowed) {
      return { success: false, error: auth.reason };
    }

    // 1. Double-Entry Validation
    if (voucher.voucherType !== 'MEMORANDUM') {
      const validation = AccountingEngine.validateVoucherDoubleEntry(voucher);
      if (!validation.isValid) {
        return { success: false, error: validation.error };
      }
    }

    const idx = this.vouchers.findIndex((v) => v.id === voucher.id);
    if (idx === -1) {
      return this.addVoucher(voucher, actingUser);
    }

    const oldVch = this.vouchers[idx];
    const diff: { field: string; oldValue: any; newValue: any }[] = [];
    if (oldVch.totalVoucherAmount !== voucher.totalVoucherAmount) {
      diff.push({ field: 'amount', oldValue: oldVch.totalVoucherAmount, newValue: voucher.totalVoucherAmount });
    }
    if (oldVch.date !== voucher.date) {
      diff.push({ field: 'date', oldValue: oldVch.date, newValue: voucher.date });
    }
    if (oldVch.narration !== voucher.narration) {
      diff.push({ field: 'narration', oldValue: oldVch.narration, newValue: voucher.narration });
    }
    if (diff.length === 0) {
      diff.push({ field: 'updatedAt', oldValue: oldVch.updatedAt, newValue: voucher.updatedAt });
    }

    this.vouchers[idx] = voucher;

    this.auditEngine.recordChange({
      entityType: 'VOUCHER',
      entityId: voucher.id,
      action: 'ALTER',
      userId: user?.username || 'admin',
      diff,
    });

    this.notify();
    return { success: true };
  }

  public deleteVoucher(id: string, actingUser?: PublicUser): { success: boolean; error?: string } {
    // 0. Security Guard
    const user = actingUser !== undefined ? actingUser : this.securityEngine.getCurrentUser();
    const auth = this.securityEngine.canExecute('DELETE_VOUCHER', {
      actingUser: user,
    });
    if (!auth.allowed) {
      return { success: false, error: auth.reason };
    }

    const idx = this.vouchers.findIndex((v) => v.id === id);
    if (idx === -1) return { success: false, error: 'Voucher not found' };

    const deleted = this.vouchers[idx];
    this.vouchers.splice(idx, 1);

    this.auditEngine.recordChange({
      entityType: 'VOUCHER',
      entityId: id,
      action: 'DELETE',
      userId: user?.username || 'admin',
      diff: [
        { field: 'voucherNumber', oldValue: deleted.voucherNumber, newValue: null },
        { field: 'amount', oldValue: deleted.totalVoucherAmount, newValue: null },
      ],
    });

    this.notify();
    return { success: true };
  }

  public cancelVoucher(id: string, actingUser?: PublicUser): { success: boolean; error?: string } {
    const user = actingUser !== undefined ? actingUser : this.securityEngine.getCurrentUser();
    const auth = this.securityEngine.canExecute('ALTER_VOUCHER', {
      actingUser: user,
    });
    if (!auth.allowed) {
      return { success: false, error: auth.reason };
    }

    const vch = this.vouchers.find((v) => v.id === id);
    if (!vch) return { success: false, error: 'Voucher not found' };

    vch.isCancelled = true;
    this.auditEngine.recordChange({
      entityType: 'VOUCHER',
      entityId: id,
      action: 'CANCEL',
      userId: user?.username || 'admin',
      diff: [{ field: 'isCancelled', oldValue: false, newValue: true }],
    });

    this.notify();
    return { success: true };
  }

  // --- Real-time reporting queries ---

  public getBalanceSheet(asOfDate?: string) {
    const stockSummary = this.inventoryEngine.calculateStockSummary(this.vouchers);
    const totalClosingStock = stockSummary.reduce((sum, item) => sum + item.closingValue, 0);
    return this.accountingEngine.generateBalanceSheet(this.vouchers, totalClosingStock, asOfDate);
  }

  public getProfitAndLoss(asOfDate?: string) {
    const stockSummary = this.inventoryEngine.calculateStockSummary(this.vouchers);
    const totalClosingStock = stockSummary.reduce((sum, item) => sum + item.closingValue, 0);
    const openingStock = this.stockItems.reduce((sum, item) => sum + item.openingValue, 0);
    return this.accountingEngine.generateProfitAndLoss(
      this.vouchers,
      totalClosingStock,
      openingStock,
      undefined,
      asOfDate
    );
  }

  public getStockSummary() {
    return this.inventoryEngine.calculateStockSummary(this.vouchers);
  }

  public getBillWiseAging(asOfDate?: string) {
    return this.accountingEngine.generateBillWiseAging(this.vouchers, asOfDate);
  }

  public getRatioAnalysis(asOfDate?: string) {
    const stockSummary = this.inventoryEngine.calculateStockSummary(this.vouchers);
    const totalClosingStock = stockSummary.reduce((sum, item) => sum + item.closingValue, 0);
    return this.accountingEngine.generateRatioAnalysis(this.vouchers, totalClosingStock, asOfDate);
  }

  public getBRS(bankLedgerId: string) {
    const ledger = this.ledgers.find((l) => l.id === bankLedgerId);
    if (!ledger) return null;
    return BankingEngine.generateBRS({
      bankLedger: ledger,
      vouchers: this.vouchers,
      statementTransactions: this.bankStatements,
    });
  }

  public exportBackup(): string {
    return JSON.stringify(
      {
        company: this.company,
        groups: this.groups,
        ledgers: this.ledgers,
        stockItems: this.stockItems,
        units: this.units,
        godowns: this.godowns,
        boms: this.boms,
        employees: this.employees,
        vouchers: this.vouchers,
        bankStatements: this.bankStatements,
        auditLogs: this.auditEngine.getLogs(),
        securityUsers: this.securityEngine.getUsers(),
        securityConfig: this.securityEngine.getConfig(),
        signoffs: this.securityEngine.getAllSignoffs(),
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );
  }

  public async exportEncryptedVaultBackup(vaultPassword?: string): Promise<string> {
    const rawBackup = this.exportBackup();
    const envelope = await this.securityEngine.encryptVaultBackup(rawBackup, vaultPassword);
    return JSON.stringify(envelope, null, 2);
  }

  public async restoreBackup(
    backupContent: string,
    vaultPassword?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      let rawJson = backupContent;
      if (backupContent.includes('TALLYVAULT_V1')) {
        const envelope = JSON.parse(backupContent);
        if (!vaultPassword) {
          return {
            success: false,
            error: 'Authentication failed: Password required to restore TallyVault-encrypted backup.',
          };
        }
        rawJson = await this.securityEngine.decryptVaultBackup(envelope, vaultPassword);
      }

      const data = JSON.parse(rawJson);
      if (data.company) this.company = data.company;
      if (data.groups) this.groups = data.groups;
      if (data.ledgers) this.ledgers = data.ledgers;
      if (data.stockItems) this.stockItems = data.stockItems;
      if (data.vouchers) this.vouchers = data.vouchers;
      if (data.units) this.units = data.units;
      if (data.godowns) this.godowns = data.godowns;
      if (data.boms) this.boms = data.boms;
      if (data.employees) this.employees = data.employees;
      if (data.bankStatements) this.bankStatements = data.bankStatements;

      this.accountingEngine = new AccountingEngine(this.groups, this.ledgers);
      this.inventoryEngine = new InventoryEngine(this.stockItems, this.boms);

      this.auditEngine.recordChange({
        entityType: 'COMPANY',
        entityId: this.company.id,
        action: 'ALTER',
        userId: this.securityEngine.getCurrentUser()?.username || 'admin',
        diff: [{ field: 'restore', oldValue: null, newValue: 'Database restored from backup' }],
      });

      this.notify();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: 'Failed to restore backup: ' + (e.message || 'Corrupted data') };
    }
  }
}

// Global Singleton Instance
export const globalTallyStore = new TallyStore(globalSecurityEngine);
