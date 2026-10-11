import React, { useState, useEffect, useRef } from 'react';

interface GoToItem {
  id: string;
  title: string;
  category: string;
  view: string;
  description: string;
}

const SEARCH_CATALOG: GoToItem[] = [
  { id: 'bs', title: 'Balance Sheet', category: 'Reports', view: 'balance_sheet', description: 'Assets & Liabilities Statement' },
  { id: 'pnl', title: 'Profit & Loss Account', category: 'Reports', view: 'profit_loss', description: 'Trading & Income Statement' },
  { id: 'tb', title: 'Trial Balance', category: 'Reports', view: 'trial_balance', description: 'Grouped & Detailed GL Balances' },
  { id: 'ss', title: 'Stock Summary', category: 'Inventory', view: 'stock_summary', description: 'Real-time Stock Valuation & Quantities' },
  { id: 'db', title: 'Day Book', category: 'Transactions', view: 'daybook', description: 'Chronological Register of All Vouchers' },
  { id: 'ra', title: 'Ratio Analysis', category: 'Analytics', view: 'ratio_analysis', description: 'Liquidity, Solvency & Turnover Ratios' },
  { id: 'brs', title: 'Bank Reconciliation (BRS)', category: 'Banking', view: 'banking', description: 'Bank Statement vs Books Matching' },
  { id: 'gst', title: 'GST Center & Returns', category: 'Statutory', view: 'statutory', description: 'GSTR-1, GSTR-3B, E-Way Bill, E-Invoice' },
  { id: 'audit', title: 'MCA Audit Trail (Edit Log)', category: 'Compliance', view: 'audit_trail', description: 'Immutable SHA-256 Event Log' },
  { id: 'chart', title: 'Chart of Accounts', category: 'Masters', view: 'chart_of_accounts', description: '28 Predefined Groups Hierarchy' },
  { id: 'vch_sales', title: 'Sales Invoice (F8)', category: 'Vouchers', view: 'vouchers:SALES', description: 'Record Outward Supply Invoice' },
  { id: 'vch_purchase', title: 'Purchase Bill (F9)', category: 'Vouchers', view: 'vouchers:PURCHASE', description: 'Record Inward Procurement Bill' },
  { id: 'vch_receipt', title: 'Receipt Voucher (F6)', category: 'Vouchers', view: 'vouchers:RECEIPT', description: 'Record Inward Cash/Bank Receipts' },
  { id: 'vch_payment', title: 'Payment Voucher (F5)', category: 'Vouchers', view: 'vouchers:PAYMENT', description: 'Record Outward Payments' },
  { id: 'vch_contra', title: 'Contra Voucher (F4)', category: 'Vouchers', view: 'vouchers:CONTRA', description: 'Bank to Cash / Bank to Bank Transfers' },
  { id: 'vch_journal', title: 'Journal Voucher (F7)', category: 'Vouchers', view: 'vouchers:JOURNAL', description: 'Non-cash Adjustment & Provisions' },
  { id: 'vch_stock', title: 'Stock Journal (Alt+F7)', category: 'Inventory', view: 'vouchers:STOCK_JOURNAL', description: 'BOM Manufacturing & Godown Transfer' },
  { id: 'vch_payroll', title: 'Payroll Voucher (Ctrl+F4)', category: 'Payroll', view: 'vouchers:PAYROLL', description: 'Automated Monthly Salary Computation' },
  { id: 'create_ledger', title: 'Create Ledger', category: 'Masters', view: 'create_master:ledger', description: 'Create Customer, Vendor, Bank or Expense Ledger' },
  { id: 'create_item', title: 'Create Stock Item', category: 'Masters', view: 'create_master:item', description: 'Create Inventory Item with Units & Tax' },
];

interface GoToModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (view: string) => void;
}

export const GoToModal: React.FC<GoToModalProps> = ({ isOpen, onClose, onSelect }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredItems = SEARCH_CATALOG.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase()) ||
      item.description.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        onSelect(filteredItems[selectedIndex].view);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-start justify-center pt-16 z-50 p-4">
      <div className="w-[640px] max-w-[95vw] max-h-[85vh] bg-[#0c2733] border-2 border-[#fbbf24] shadow-2xl rounded-sm flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
        {/* Header */}
        <div className="bg-[#fbbf24] text-[#0c2733] px-4 py-2 flex items-center justify-between font-bold text-sm">
          <div className="flex items-center gap-2">
            <span className="bg-[#0c2733] text-[#fbbf24] px-1.5 py-0.5 rounded text-xs font-black">
              Alt + G
            </span>
            <span>Go To - Universal Search & Multi-Tasking</span>
          </div>
          <span className="text-xs font-mono font-normal">Press Esc to close</span>
        </div>

        {/* Input */}
        <div className="p-3 bg-[#081e28] border-b border-[#1b4b5e]">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type report name, voucher type, or master action..."
            className="w-full tally-input text-base text-[#f8fafc] px-3 py-2 rounded-sm"
          />
        </div>

        {/* Results List */}
        <div className="max-h-[360px] overflow-y-auto p-1.5 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="p-6 text-center text-[#7e9ea8] text-xs">
              No matching reports or actions found for "{query}"
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => onSelect(item.view)}
                  className={`px-3 py-2 text-xs flex items-center justify-between cursor-pointer rounded-sm ${
                    isSelected
                      ? 'tally-row-selected'
                      : 'text-[#d6e4ea] hover:bg-[#143e4f]'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-sm flex items-center gap-2">
                      <span>{item.title}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#091f29] text-[#38bdf8] border border-[#1e4d5f]">
                        {item.category}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#86a3ae] mt-0.5">
                      {item.description}
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-[#fbbf24]">
                    Enter ↵
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Hint */}
        <div className="bg-[#091d26] text-[#71929f] px-3 py-1.5 text-[10px] flex justify-between border-t border-[#184252]">
          <span>↑/↓ to navigate • Enter to Select</span>
          <span>Context is preserved upon return</span>
        </div>
      </div>
    </div>
  );
};
