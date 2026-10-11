import React, { useState, useEffect } from 'react';
import { Company } from '../core/types';

interface MenuItem {
  id: string;
  label: string;
  hotkey: string;
  view: string;
  category?: string;
}

const MENU_ITEMS: MenuItem[] = [
  // Masters
  { id: 'create', label: 'Create', hotkey: 'C', view: 'create_master', category: 'MASTERS' },
  { id: 'alter', label: 'Alter', hotkey: 'A', view: 'alter_master', category: 'MASTERS' },
  { id: 'chart', label: 'CHArt of Accounts', hotkey: 'H', view: 'chart_of_accounts', category: 'MASTERS' },

  // Transactions
  { id: 'vouchers', label: 'Vouchers', hotkey: 'V', view: 'vouchers', category: 'TRANSACTIONS' },
  { id: 'daybook', label: 'Day Book', hotkey: 'K', view: 'daybook', category: 'TRANSACTIONS' },

  // Utilities
  { id: 'banking', label: 'Banking', hotkey: 'N', view: 'banking', category: 'UTILITIES' },

  // Reports
  { id: 'balance_sheet', label: 'Balance Sheet', hotkey: 'B', view: 'balance_sheet', category: 'REPORTS' },
  { id: 'profit_loss', label: 'Profit & Loss A/c', hotkey: 'P', view: 'profit_loss', category: 'REPORTS' },
  { id: 'stock_summary', label: 'Stock Summary', hotkey: 'S', view: 'stock_summary', category: 'REPORTS' },
  { id: 'ratio_analysis', label: 'Ratio Analysis', hotkey: 'R', view: 'ratio_analysis', category: 'REPORTS' },
  { id: 'display_more', label: 'Display More Reports', hotkey: 'D', view: 'display_reports', category: 'REPORTS' },
  { id: 'quit', label: 'Quit', hotkey: 'Q', view: 'quit', category: 'REPORTS' },
];

interface GatewayMenuProps {
  company: Company;
  currentDate: string;
  lastVoucherDate: string;
  onNavigate: (view: string) => void;
}

export const GatewayMenu: React.FC<GatewayMenuProps> = ({
  company,
  currentDate,
  lastVoucherDate,
  onNavigate,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(3); // default focus on Vouchers (index 3)

  // Arrow key & keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If user presses hotkey directly
      const key = e.key.toUpperCase();
      const matched = MENU_ITEMS.find((item) => item.hotkey === key);
      if (matched && !e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onNavigate(matched.view);
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % MENU_ITEMS.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + MENU_ITEMS.length) % MENU_ITEMS.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onNavigate(MENU_ITEMS[selectedIndex].view);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, onNavigate]);

  const renderLabel = (item: MenuItem) => {
    const hotkey = item.hotkey;
    const parts = item.label.split(new RegExp(`(${hotkey})`, 'i'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toUpperCase() === hotkey ? (
            <span key={i} className="hotkey-letter">
              {part}
            </span>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

  // Group items by category
  const categories = ['MASTERS', 'TRANSACTIONS', 'UTILITIES', 'REPORTS'];

  return (
    <div className="flex-1 flex overflow-hidden p-6 gap-6 justify-center items-start">
      {/* Left Column: Company & Period Info Panel */}
      <div className="w-[420px] bg-[#0d2a36] tally-panel-border flex flex-col shadow-2xl">
        <div className="bg-[#17485a] text-[#fbbf24] px-4 py-2 font-bold text-xs uppercase tracking-wider border-b border-[#246177]">
          Current Status & Company Details
        </div>

        <div className="p-4 space-y-4 text-xs font-mono">
          <div className="grid grid-cols-2 gap-2 border-b border-[#1c4b5e] pb-3">
            <div>
              <div className="text-[#7ea0af] text-[11px]">Current Period:</div>
              <div className="text-[#f1f5f9] font-bold">
                01-Apr-2026 to 31-Mar-2027
              </div>
            </div>
            <div>
              <div className="text-[#7ea0af] text-[11px]">Current Date:</div>
              <div className="text-[#f1f5f9] font-bold">{currentDate}</div>
            </div>
          </div>

          <div>
            <div className="text-[#7ea0af] text-[11px] mb-1">List of Selected Companies:</div>
            <div className="bg-[#091b23] border border-[#1b4e61] p-3 rounded-sm space-y-1.5">
              <div className="text-[#38bdf8] font-bold text-sm">{company.name}</div>
              <div className="text-[#94a3b8] text-[11px] flex justify-between">
                <span>Date of Last Entry:</span>
                <span className="text-[#fbbf24] font-semibold">{lastVoucherDate}</span>
              </div>
              <div className="text-[#94a3b8] text-[11px] flex justify-between">
                <span>Financial Year:</span>
                <span>From 1-Apr-2026</span>
              </div>
              <div className="text-[#94a3b8] text-[11px] flex justify-between">
                <span>State & GSTIN:</span>
                <span>Maharashtra ({company.gstin})</span>
              </div>
            </div>
          </div>

          <div className="bg-[#123847] border border-[#23586d] p-3 rounded-sm text-[11px] space-y-1">
            <div className="text-[#fbbf24] font-bold">⚡ Keyboard Shortcuts Guide</div>
            <div className="text-[#cbd5e1] space-y-0.5 text-[10px]">
              <div>• Press highlighted letter (e.g. <span className="hotkey-letter">B</span> for Balance Sheet)</div>
              <div>• Use <span className="text-[#38bdf8]">↑</span> / <span className="text-[#38bdf8]">↓</span> arrow keys + <span className="text-[#38bdf8]">Enter</span></div>
              <div>• Press <span className="text-[#fbbf24]">Alt + G</span> for universal Go To search</div>
              <div>• Press <span className="text-[#fbbf24]">Esc</span> to exit or go back</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Gateway of Tally Menu */}
      <div className="w-[380px] bg-[#0d2a36] tally-panel-border flex flex-col shadow-2xl">
        <div className="bg-[#fbbf24] text-[#0e2c37] px-4 py-2 font-black text-center text-sm tracking-wider uppercase shadow">
          Gateway of Tally
        </div>

        <div className="p-3 space-y-3">
          {categories.map((cat) => {
            const catItems = MENU_ITEMS.filter((m) => m.category === cat);
            return (
              <div key={cat} className="space-y-1">
                <div className="text-[10px] text-[#7198a8] font-bold tracking-wider px-2">
                  {cat}
                </div>
                <div className="space-y-0.5">
                  {catItems.map((item) => {
                    const itemGlobalIndex = MENU_ITEMS.findIndex((m) => m.id === item.id);
                    const isSelected = itemGlobalIndex === selectedIndex;
                    return (
                      <div
                        key={item.id}
                        onClick={() => onNavigate(item.view)}
                        className={`px-3 py-1.5 cursor-pointer text-xs flex justify-between items-center rounded-sm transition ${
                          isSelected
                            ? 'tally-row-selected'
                            : 'text-[#d7e5eb] hover:bg-[#164658]'
                        }`}
                      >
                        <div className="font-medium">{renderLabel(item)}</div>
                        <div className="text-[10px] opacity-75 font-mono">
                          [{item.hotkey}]
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
