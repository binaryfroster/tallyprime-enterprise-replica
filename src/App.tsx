import React, { useState, useEffect } from 'react';
import { globalTallyStore } from './core/tallyStore';
import { Voucher, VoucherTypeCode, LedgerMaster, StockItem } from './core/types';
import { TopBar } from './components/TopBar';
import { SideBar } from './components/SideBar';
import { GatewayMenu } from './components/GatewayMenu';
import { VoucherScreen } from './components/VoucherScreen';
import { BalanceSheetView } from './components/BalanceSheetView';
import { ProfitLossView } from './components/ProfitLossView';
import { StockSummaryView } from './components/StockSummaryView';
import { DayBookView } from './components/DayBookView';
import { TrialBalanceView } from './components/TrialBalanceView';
import { StatutoryView } from './components/StatutoryView';
import { BankingView } from './components/BankingView';
import { AuditTrailView } from './components/AuditTrailView';
import { RatioAnalysisView } from './components/RatioAnalysisView';
import { GoToModal } from './components/GoToModal';
import { MasterCreationModal } from './components/MasterCreationModal';
import { LedgerMonthlyView } from './components/LedgerMonthlyView';
import { VoucherRegisterView } from './components/VoucherRegisterView';
import { QuitModal } from './components/QuitModal';
import { DateChangeModal } from './components/DateChangeModal';
import { FeaturesModal } from './components/FeaturesModal';
import { LoginModal } from './components/LoginModal';
import { SecurityControlModal } from './components/SecurityControlModal';
import { AccessDeniedModal } from './components/AccessDeniedModal';

export const App: React.FC = () => {
  // Store state triggers
  const [, setTick] = useState(0);
  useEffect(() => {
    return globalTallyStore.subscribe(() => setTick((t) => t + 1));
  }, []);

  const company = globalTallyStore.getCompany();
  const ledgers = globalTallyStore.getLedgers();
  const stockItems = globalTallyStore.getStockItems();
  const groups = globalTallyStore.getGroups();
  const units = globalTallyStore.getUnits();
  const vouchers = globalTallyStore.getVouchers();
  const bankStatements = globalTallyStore.getBankStatements();
  const auditLogs = globalTallyStore.getAuditLogs();
  const securityEngine = globalTallyStore.getSecurityEngine();
  const currentUser = securityEngine.getCurrentUser();

  // Navigation state
  const [currentView, setCurrentView] = useState<string>('gateway');
  const [viewStack, setViewStack] = useState<string[]>([]);
  const [activeVoucherType, setActiveVoucherType] = useState<VoucherTypeCode>('SALES');
  const [currentDate, setCurrentDate] = useState('2026-05-31');

  // Drilldown and voucher edit state
  const [selectedDrillLedger, setSelectedDrillLedger] = useState<LedgerMaster | null>(null);
  const [selectedDrillMonth, setSelectedDrillMonth] = useState<{
    monthIndex: number;
    year: number;
    monthName: string;
  } | null>(null);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);

  // Modals
  const [isGoToOpen, setIsGoToOpen] = useState(false);
  const [altCModal, setAltCModal] = useState<'ledger' | 'stockItem' | null>(null);
  const [isQuitModalOpen, setIsQuitModalOpen] = useState(false);
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [isFeaturesModalOpen, setIsFeaturesModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isAccessDeniedOpen, setIsAccessDeniedOpen] = useState(false);
  const [accessDeniedReason, setAccessDeniedReason] = useState<string>('');

  // Navigate with stack push & RBAC permission guards
  const navigate = (newView: string) => {
    if (newView === 'quit') {
      setIsQuitModalOpen(true);
      return;
    }

    // RBAC report guards
    const reportMap: Record<string, 'VIEW_BALANCE_SHEET' | 'VIEW_PROFIT_LOSS' | 'VIEW_RATIO_ANALYSIS' | 'VIEW_AUDIT_TRAIL' | 'VIEW_STATUTORY'> = {
      balance_sheet: 'VIEW_BALANCE_SHEET',
      profit_loss: 'VIEW_PROFIT_LOSS',
      ratio_analysis: 'VIEW_RATIO_ANALYSIS',
      audit_trail: 'VIEW_AUDIT_TRAIL',
      statutory: 'VIEW_STATUTORY',
    };

    const guardedAction = reportMap[newView];
    if (guardedAction) {
      const perm = securityEngine.canExecute(guardedAction);
      if (!perm.allowed) {
        setAccessDeniedReason(perm.reason || 'Management report access is restricted.');
        setIsAccessDeniedOpen(true);
        return;
      }
    }

    if (newView.startsWith('vouchers:')) {
      const type = newView.split(':')[1] as VoucherTypeCode;
      setActiveVoucherType(type);
      setEditingVoucher(null);
      newView = 'vouchers';
    } else if (newView === 'vouchers') {
      setEditingVoucher(null);
    } else if (newView === 'create_master' || newView.startsWith('create_master:')) {
      const perm = securityEngine.canExecute('CREATE_MASTER');
      if (!perm.allowed) {
        setAccessDeniedReason(perm.reason || 'Master creation restricted.');
        setIsAccessDeniedOpen(true);
        return;
      }
      const target = newView.includes(':') ? (newView.split(':')[1] as 'ledger' | 'stockItem') : 'ledger';
      setAltCModal(target);
      return;
    } else if (newView === 'alter_master' || newView.startsWith('alter_master:')) {
      const perm = securityEngine.canExecute('ALTER_MASTER');
      if (!perm.allowed) {
        setAccessDeniedReason(perm.reason || 'Master alteration restricted.');
        setIsAccessDeniedOpen(true);
        return;
      }
      setAltCModal('ledger');
      return;
    }

    setViewStack((prev) => [...prev, currentView]);
    setCurrentView(newView);
  };

  // Pop view stack (Esc)
  const popStack = () => {
    if (isLoginModalOpen) {
      setIsLoginModalOpen(false);
      return;
    }
    if (isSecurityModalOpen) {
      setIsSecurityModalOpen(false);
      return;
    }
    if (isAccessDeniedOpen) {
      setIsAccessDeniedOpen(false);
      return;
    }
    if (isQuitModalOpen) {
      setIsQuitModalOpen(false);
      return;
    }
    if (isDateModalOpen) {
      setIsDateModalOpen(false);
      return;
    }
    if (isFeaturesModalOpen) {
      setIsFeaturesModalOpen(false);
      return;
    }
    if (isGoToOpen) {
      setIsGoToOpen(false);
      return;
    }
    if (altCModal) {
      setAltCModal(null);
      return;
    }
    if (editingVoucher) {
      setEditingVoucher(null);
    }

    if (viewStack.length > 0) {
      const prev = viewStack[viewStack.length - 1];
      setViewStack((s) => s.slice(0, -1));
      setCurrentView(prev);
    } else {
      if (currentView === 'gateway') {
        setIsQuitModalOpen(true);
      } else {
        setCurrentView('gateway');
      }
    }
  };

  // Global Keyboard event handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt + G: Go To Omnibar
      if (e.altKey && (e.key === 'g' || e.key === 'G')) {
        e.preventDefault();
        setIsGoToOpen(true);
        return;
      }

      // Alt + S: Security Governance
      if (e.altKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        setIsSecurityModalOpen(true);
        return;
      }

      // Alt + U: User Switch / Login
      if (e.altKey && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        setIsLoginModalOpen(true);
        return;
      }

      // Escape key
      if (e.key === 'Escape') {
        e.preventDefault();
        popStack();
        return;
      }

      // Function keys F2, F4 - F9, F11 inside non-input fields
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isInput = targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select';

      if (!isInput && !e.altKey && !e.ctrlKey) {
        if (e.key === 'F2') {
          e.preventDefault();
          setIsDateModalOpen(true);
        } else if (e.key === 'F11') {
          e.preventDefault();
          setIsFeaturesModalOpen(true);
        } else if (e.key === 'F4') {
          e.preventDefault();
          setActiveVoucherType('CONTRA');
          navigate('vouchers');
        } else if (e.key === 'F5') {
          e.preventDefault();
          setActiveVoucherType('PAYMENT');
          navigate('vouchers');
        } else if (e.key === 'F6') {
          e.preventDefault();
          setActiveVoucherType('RECEIPT');
          navigate('vouchers');
        } else if (e.key === 'F7') {
          e.preventDefault();
          setActiveVoucherType('JOURNAL');
          navigate('vouchers');
        } else if (e.key === 'F8') {
          e.preventDefault();
          setActiveVoucherType('SALES');
          navigate('vouchers');
        } else if (e.key === 'F9') {
          e.preventDefault();
          setActiveVoucherType('PURCHASE');
          navigate('vouchers');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGoToOpen, isSecurityModalOpen, isLoginModalOpen, isAccessDeniedOpen, altCModal, isQuitModalOpen, isDateModalOpen, isFeaturesModalOpen, currentView, viewStack, editingVoucher]);

  const handleSaveVoucher = (vch: Voucher) => {
    const action = editingVoucher ? 'ALTER_VOUCHER' : 'CREATE_VOUCHER';
    const perm = securityEngine.canExecute(action, { voucherDate: vch.date, currentDate });
    if (!perm.allowed) {
      setAccessDeniedReason(perm.reason || 'Transaction operation restricted.');
      setIsAccessDeniedOpen(true);
      return;
    }

    if (editingVoucher) {
      const result = globalTallyStore.updateVoucher(vch);
      if (!result.success) {
        setAccessDeniedReason(result.error || 'Voucher update rejected.');
        setIsAccessDeniedOpen(true);
        return;
      }
      alert(`✓ Voucher ${vch.voucherNumber} successfully updated & audit-logged!`);
      setEditingVoucher(null);
      popStack();
    } else {
      const result = globalTallyStore.addVoucher(vch);
      if (!result.success) {
        setAccessDeniedReason(result.error || 'Voucher creation rejected.');
        setIsAccessDeniedOpen(true);
        return;
      }
      alert(`✓ Voucher ${vch.voucherNumber} (${vch.voucherType}) successfully saved & balanced!`);
      setCurrentView('daybook');
    }
  };

  const handleDeleteVoucher = (voucherId: string) => {
    const perm = securityEngine.canExecute('DELETE_VOUCHER');
    if (!perm.allowed) {
      setAccessDeniedReason(perm.reason || 'Voucher deletion restricted.');
      setIsAccessDeniedOpen(true);
      return;
    }

    if (window.confirm('Are you sure you want to delete this voucher? (MCA Audit Log will record deletion)')) {
      const result = globalTallyStore.deleteVoucher(voucherId);
      if (!result.success) {
        setAccessDeniedReason(result.error || 'Voucher deletion failed.');
        setIsAccessDeniedOpen(true);
        return;
      }
      alert('✓ Voucher deleted and recorded in MCA Edit Log.');
      setEditingVoucher(null);
      popStack();
    }
  };

  const handleOpenEditVoucher = (vch: Voucher) => {
    setEditingVoucher(vch);
    setActiveVoucherType(vch.voucherType);
    setViewStack((prev) => [...prev, currentView]);
    setCurrentView('vouchers');
  };

  const handleSaveLedger = (l: LedgerMaster) => {
    const perm = securityEngine.canExecute('CREATE_MASTER');
    if (!perm.allowed) {
      setAccessDeniedReason(perm.reason || 'Master creation restricted.');
      setIsAccessDeniedOpen(true);
      return;
    }
    const res = globalTallyStore.addLedger(l);
    if (!res.success) {
      setAccessDeniedReason(res.error || 'Failed to add ledger.');
      setIsAccessDeniedOpen(true);
      return;
    }
    alert(`✓ Master Ledger "${l.name}" created and added to Chart of Accounts!`);
  };

  const handleSaveStockItem = (item: StockItem) => {
    const perm = securityEngine.canExecute('CREATE_MASTER');
    if (!perm.allowed) {
      setAccessDeniedReason(perm.reason || 'Master creation restricted.');
      setIsAccessDeniedOpen(true);
      return;
    }
    const res = globalTallyStore.addStockItem(item);
    if (!res.success) {
      setAccessDeniedReason(res.error || 'Failed to add stock item.');
      setIsAccessDeniedOpen(true);
      return;
    }
    alert(`✓ Stock Item "${item.name}" created with costing method "${item.costingMethod}"!`);
  };

  const handleExportData = async () => {
    if (securityEngine.isVaultEnabled()) {
      try {
        const backupJson = await globalTallyStore.exportEncryptedVaultBackup();
        const blob = new Blob([backupJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `TallyVault_Encrypted_${company.name.replace(/\s+/g, '_')}_${Date.now()}.tve`;
        a.click();
        URL.revokeObjectURL(url);
        alert('✓ TallyVault Military-Grade AES-256-GCM encrypted backup (.tve) exported successfully.');
      } catch (err: any) {
        alert(`Failed to export encrypted backup: ${err.message}`);
      }
    } else {
      const backupJson = globalTallyStore.exportBackup();
      const blob = new Blob([backupJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TallyPrime_Backup_${company.name.replace(/\s+/g, '_')}_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const lastVoucherDate = vouchers[vouchers.length - 1]?.date || '31-May-2026';

  // Real-time calculations
  const balanceSheet = globalTallyStore.getBalanceSheet();
  const pnl = globalTallyStore.getProfitAndLoss();
  const stockSummary = globalTallyStore.getStockSummary();
  const ratios = globalTallyStore.getRatioAnalysis();
  const ledgerBalances = (globalTallyStore as any).accountingEngine.calculateLedgerBalances(vouchers);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0b1f28] text-[#d6e2e7] overflow-hidden select-none">
      {/* 1. Universal Top Navigation Bar */}
      <TopBar
        company={company}
        currentDate={currentDate}
        currentUser={currentUser}
        onOpenGoTo={() => setIsGoToOpen(true)}
        onOpenFeatures={() => setIsFeaturesModalOpen(true)}
        onOpenSecurity={() => setIsSecurityModalOpen(true)}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onExport={handleExportData}
        onNavigate={navigate}
      />

      {/* 2. Middle Body: Active Screen + Right Side Function Bar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Dynamic Screen View */}
        {currentView === 'gateway' && (
          <GatewayMenu
            company={company}
            currentDate={currentDate}
            lastVoucherDate={lastVoucherDate}
            onNavigate={navigate}
          />
        )}

        {currentView === 'vouchers' && (
          <VoucherScreen
            initialType={activeVoucherType}
            initialVoucher={editingVoucher || undefined}
            company={company}
            ledgers={ledgers}
            stockItems={stockItems}
            currentDate={currentDate}
            onSave={handleSaveVoucher}
            onCancel={popStack}
            onDelete={handleDeleteVoucher}
            onOpenAltC={(t) => setAltCModal(t)}
          />
        )}

        {currentView === 'balance_sheet' && (
          <BalanceSheetView
            balanceSheet={balanceSheet}
            accountingEngine={(globalTallyStore as any).accountingEngine}
            vouchers={vouchers}
            onBack={popStack}
            onDrillIntoLedger={(ledId) => {
              const led = ledgers.find((l) => l.id === ledId);
              if (led) {
                setSelectedDrillLedger(led);
                setViewStack((prev) => [...prev, currentView]);
                setCurrentView('ledger_monthly');
              } else {
                navigate('daybook');
              }
            }}
          />
        )}

        {currentView === 'profit_loss' && (
          <ProfitLossView
            pnl={pnl}
            onBack={popStack}
            onDrillIntoLedger={(targetId) => {
              const led = ledgers.find((l) => l.id === targetId);
              if (led) {
                setSelectedDrillLedger(led);
                setViewStack((prev) => [...prev, currentView]);
                setCurrentView('ledger_monthly');
              } else {
                navigate('balance_sheet');
              }
            }}
          />
        )}

        {currentView === 'stock_summary' && (
          <StockSummaryView stockSummary={stockSummary} onBack={popStack} />
        )}

        {currentView === 'daybook' && (
          <DayBookView
            vouchers={vouchers}
            onBack={popStack}
            onSelectVoucher={handleOpenEditVoucher}
          />
        )}

        {currentView === 'ledger_monthly' && selectedDrillLedger && (
          <LedgerMonthlyView
            ledger={selectedDrillLedger}
            vouchers={vouchers}
            financialYear={2026}
            onSelectMonth={(monthIndex, year, monthName) => {
              setSelectedDrillMonth({ monthIndex, year, monthName });
              setViewStack((prev) => [...prev, currentView]);
              setCurrentView('voucher_register');
            }}
            onBack={popStack}
          />
        )}

        {currentView === 'voucher_register' && selectedDrillLedger && selectedDrillMonth && (
          <VoucherRegisterView
            ledger={selectedDrillLedger}
            monthIndex={selectedDrillMonth.monthIndex}
            year={selectedDrillMonth.year}
            monthName={selectedDrillMonth.monthName}
            vouchers={vouchers}
            onSelectVoucher={handleOpenEditVoucher}
            onBack={popStack}
          />
        )}

        {currentView === 'trial_balance' && (
          <TrialBalanceView
            groups={groups}
            balances={ledgerBalances}
            onBack={popStack}
            onDrillIntoGroup={() => navigate('balance_sheet')}
          />
        )}

        {currentView === 'statutory' && (
          <StatutoryView
            company={company}
            vouchers={vouchers}
            ledgers={ledgers}
            onBack={popStack}
          />
        )}

        {currentView === 'banking' && (
          <BankingView
            ledgers={ledgers}
            vouchers={vouchers}
            bankStatements={bankStatements}
            onBack={popStack}
          />
        )}

        {currentView === 'audit_trail' && (
          <AuditTrailView logs={auditLogs} onBack={popStack} />
        )}

        {currentView === 'ratio_analysis' && (
          <RatioAnalysisView ratios={ratios} onBack={popStack} />
        )}

        {currentView === 'chart_of_accounts' && (
          <TrialBalanceView
            groups={groups}
            balances={ledgerBalances}
            onBack={popStack}
            onDrillIntoGroup={() => navigate('balance_sheet')}
          />
        )}

        {currentView === 'display_reports' && (
          <div className="flex-1 p-6 flex flex-col items-center justify-center space-y-4">
            <div className="w-[420px] bg-[#0d2a36] tally-panel-border p-4 space-y-2">
              <div className="text-[#fbbf24] font-bold text-center border-b border-[#1c4b5e] pb-2 text-sm">
                Display More Reports
              </div>
              <button
                onClick={() => navigate('trial_balance')}
                className="w-full tally-btn text-xs py-2 px-3"
              >
                <span><u>T</u>rial Balance</span>
                <span className="font-mono text-[#fbbf24]">[T]</span>
              </button>
              <button
                onClick={() => navigate('daybook')}
                className="w-full tally-btn text-xs py-2 px-3"
              >
                <span>Day Boo<u>k</u></span>
                <span className="font-mono text-[#fbbf24]">[K]</span>
              </button>
              <button
                onClick={() => navigate('statutory')}
                className="w-full tally-btn text-xs py-2 px-3"
              >
                <span><u>G</u>ST Reports (GSTR-1, 3B, E-Way)</span>
                <span className="font-mono text-[#fbbf24]">[G]</span>
              </button>
              <button
                onClick={() => navigate('audit_trail')}
                className="w-full tally-btn text-xs py-2 px-3"
              >
                <span><u>A</u>udit Trail / MCA Edit Log</span>
                <span className="font-mono text-[#fbbf24]">[A]</span>
              </button>
              <button
                onClick={() => navigate('banking')}
                className="w-full tally-btn text-xs py-2 px-3"
              >
                <span><u>B</u>ank Reconciliation (BRS)</span>
                <span className="font-mono text-[#fbbf24]">[B]</span>
              </button>
              <button
                onClick={() => navigate('ratio_analysis')}
                className="w-full tally-btn text-xs py-2 px-3"
              >
                <span><u>R</u>atio Analysis</span>
                <span className="font-mono text-[#fbbf24]">[R]</span>
              </button>
            </div>
          </div>
        )}

        {/* Right Side Function Key Toolbar */}
        <SideBar
          currentView={currentView}
          activeVoucherType={activeVoucherType}
          onSelectVoucherType={(t) => {
            setActiveVoucherType(t);
            setCurrentView('vouchers');
          }}
          onNavigate={navigate}
          onChangeDate={() => setIsDateModalOpen(true)}
        />
      </div>

      {/* 2.5 Authentic Tally Status & Enterprise Legal Compliance Footer */}
      <footer
        className="h-7 bg-[#081e28] border-t border-[#1a4454] px-3 flex items-center justify-between text-[11px] font-mono text-[#7ea0af] select-none z-10 shrink-0"
        aria-label="Enterprise Compliance & Legal Status Bar"
      >
        <div className="flex items-center gap-3 overflow-hidden text-ellipsis whitespace-nowrap">
          <span className="text-[#38bdf8] font-bold">Suvarna ERP Solutions Pvt. Ltd.</span>
          <span className="text-[#3b6678]">|</span>
          <span className="hidden md:inline text-[#94a3b8]">AMR Tech Park II, Hosur Rd, Bangalore 560068</span>
          <span className="hidden md:inline text-[#3b6678]">|</span>
          <span className="hidden lg:inline text-[#cbd5e1]">Tel: +91-80-68282828</span>
          <span className="hidden lg:inline text-[#3b6678]">|</span>
          <span className="text-[#34d399] font-semibold">● MCA Audit Trail Active</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="/privacy.html"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#38bdf8] underline"
            aria-label="View Privacy Policy"
          >
            Privacy
          </a>
          <span className="text-[#3b6678]">·</span>
          <a
            href="/terms.html"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#38bdf8] underline"
            aria-label="View Terms and Conditions"
          >
            Terms
          </a>
          <span className="text-[#3b6678]">·</span>
          <a
            href="/cookies.html"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#38bdf8] underline"
            aria-label="View Cookie Policy"
          >
            Cookies
          </a>
          <span className="text-[#3b6678]">·</span>
          <a
            href="/refund.html"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#38bdf8] underline"
            aria-label="View Refund Policy"
          >
            Refunds
          </a>
          <span className="text-[#3b6678]">·</span>
          <button
            type="button"
            onClick={() => (window as any).openCookiePreferences?.()}
            className="text-[#fbbf24] hover:underline cursor-pointer"
            aria-label="Manage Cookie Settings"
          >
            Cookie Settings
          </button>
        </div>
      </footer>

      {/* 3. Universal Alt+G Omnibar Modal */}
      <GoToModal
        isOpen={isGoToOpen}
        onClose={() => setIsGoToOpen(false)}
        onSelect={(target) => {
          setIsGoToOpen(false);
          navigate(target);
        }}
      />

      {/* 4. Alt+C Inline Master Creation Modal */}
      <MasterCreationModal
        type={altCModal || 'ledger'}
        groups={groups}
        units={units}
        isOpen={altCModal !== null}
        onClose={() => setAltCModal(null)}
        onSaveLedger={handleSaveLedger}
        onSaveStockItem={handleSaveStockItem}
      />

      {/* 5. Authentic Tally Quit Confirmation Modal */}
      <QuitModal
        isOpen={isQuitModalOpen}
        onConfirm={() => {
          setIsQuitModalOpen(false);
          alert('Tally session exited safely. Database state preserved in localStorage.');
        }}
        onCancel={() => setIsQuitModalOpen(false)}
      />

      {/* 6. F2 Date Change Modal */}
      <DateChangeModal
        isOpen={isDateModalOpen}
        currentDate={currentDate}
        onSave={(newDate) => setCurrentDate(newDate)}
        onClose={() => setIsDateModalOpen(false)}
      />

      {/* 7. F11 Features Modal */}
      <FeaturesModal
        isOpen={isFeaturesModalOpen}
        onClose={() => setIsFeaturesModalOpen(false)}
      />

      {/* 8. User Login / Switch Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        securityEngine={securityEngine}
        companyName={company.name}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={() => {
          setTick((t) => t + 1);
        }}
      />

      {/* 9. Security & Access Control Modal */}
      <SecurityControlModal
        isOpen={isSecurityModalOpen}
        securityEngine={securityEngine}
        onClose={() => setIsSecurityModalOpen(false)}
        onConfigUpdated={() => {
          setTick((t) => t + 1);
        }}
      />

      {/* 10. Access Denied / Security Violation Alert Modal */}
      <AccessDeniedModal
        isOpen={isAccessDeniedOpen}
        reason={accessDeniedReason}
        onClose={() => setIsAccessDeniedOpen(false)}
        onSwitchUser={() => {
          setIsAccessDeniedOpen(false);
          setIsLoginModalOpen(true);
        }}
      />
    </div>
  );
};
