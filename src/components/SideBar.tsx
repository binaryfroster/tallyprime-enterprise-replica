import React from 'react';
import { VoucherTypeCode } from '../core/types';

interface SideBarProps {
  currentView: string;
  activeVoucherType?: VoucherTypeCode;
  onSelectVoucherType: (type: VoucherTypeCode) => void;
  onNavigate: (view: string) => void;
  onChangeDate: () => void;
}

export const SideBar: React.FC<SideBarProps> = ({
  currentView,
  activeVoucherType,
  onSelectVoucherType,
  onNavigate,
  onChangeDate,
}) => {
  return (
    <div className="w-48 bg-[#0c242f] border-l border-[#1d4d5e] flex flex-col p-1.5 space-y-1 select-none overflow-y-auto">
      <div className="text-[10px] text-[#7192a0] uppercase font-bold px-2 py-0.5 border-b border-[#183d4c] mb-1">
        Function Keys
      </div>

      <button
        onClick={onChangeDate}
        className="tally-btn"
        title="F2: Change current transaction date"
      >
        <span>F2: Date</span>
      </button>

      <button
        onClick={() => onNavigate('gateway')}
        className="tally-btn"
        title="F3: Company selection & switch"
      >
        <span>F3: Company</span>
      </button>

      <div className="text-[9px] text-[#5b7a87] uppercase font-bold px-2 pt-2 border-b border-[#183d4c]">
        Voucher Types
      </div>

      <button
        onClick={() => {
          onNavigate('vouchers');
          onSelectVoucherType('CONTRA');
        }}
        className={`tally-btn ${activeVoucherType === 'CONTRA' && currentView === 'vouchers' ? 'bg-[#0284c7] text-white font-bold' : ''}`}
        title="F4: Contra (Bank <-> Cash transfers)"
      >
        <span>F4: Contra</span>
      </button>

      <button
        onClick={() => {
          onNavigate('vouchers');
          onSelectVoucherType('PAYMENT');
        }}
        className={`tally-btn ${activeVoucherType === 'PAYMENT' && currentView === 'vouchers' ? 'bg-[#0284c7] text-white font-bold' : ''}`}
        title="F5: Payment (Cash/Bank Outflows)"
      >
        <span>F5: Payment</span>
      </button>

      <button
        onClick={() => {
          onNavigate('vouchers');
          onSelectVoucherType('RECEIPT');
        }}
        className={`tally-btn ${activeVoucherType === 'RECEIPT' && currentView === 'vouchers' ? 'bg-[#0284c7] text-white font-bold' : ''}`}
        title="F6: Receipt (Inward Funds)"
      >
        <span>F6: Receipt</span>
      </button>

      <button
        onClick={() => {
          onNavigate('vouchers');
          onSelectVoucherType('JOURNAL');
        }}
        className={`tally-btn ${activeVoucherType === 'JOURNAL' && currentView === 'vouchers' ? 'bg-[#0284c7] text-white font-bold' : ''}`}
        title="F7: Journal (Non-cash Adjustments)"
      >
        <span>F7: Journal</span>
      </button>

      <button
        onClick={() => {
          onNavigate('vouchers');
          onSelectVoucherType('SALES');
        }}
        className={`tally-btn ${activeVoucherType === 'SALES' && currentView === 'vouchers' ? 'bg-[#0284c7] text-white font-bold' : ''}`}
        title="F8: Sales Invoice"
      >
        <span>F8: Sales</span>
      </button>

      <button
        onClick={() => {
          onNavigate('vouchers');
          onSelectVoucherType('PURCHASE');
        }}
        className={`tally-btn ${activeVoucherType === 'PURCHASE' && currentView === 'vouchers' ? 'bg-[#0284c7] text-white font-bold' : ''}`}
        title="F9: Purchase Bill"
      >
        <span>F9: Purchase</span>
      </button>

      <div className="text-[9px] text-[#5b7a87] uppercase font-bold px-2 pt-2 border-b border-[#183d4c]">
        Special Vouchers
      </div>

      <button
        onClick={() => {
          onNavigate('vouchers');
          onSelectVoucherType('DEBIT_NOTE');
        }}
        className={`tally-btn ${activeVoucherType === 'DEBIT_NOTE' && currentView === 'vouchers' ? 'bg-[#0284c7] text-white font-bold' : ''}`}
        title="Alt + F5: Debit Note (Purchase Return)"
      >
        <span><u>F5</u>: Debit Note</span>
      </button>

      <button
        onClick={() => {
          onNavigate('vouchers');
          onSelectVoucherType('CREDIT_NOTE');
        }}
        className={`tally-btn ${activeVoucherType === 'CREDIT_NOTE' && currentView === 'vouchers' ? 'bg-[#0284c7] text-white font-bold' : ''}`}
        title="Alt + F6: Credit Note (Sales Return)"
      >
        <span><u>F6</u>: Credit Note</span>
      </button>

      <button
        onClick={() => {
          onNavigate('vouchers');
          onSelectVoucherType('STOCK_JOURNAL');
        }}
        className={`tally-btn ${activeVoucherType === 'STOCK_JOURNAL' && currentView === 'vouchers' ? 'bg-[#0284c7] text-white font-bold' : ''}`}
        title="Alt + F7: Stock Journal & Manufacturing"
      >
        <span><u>F7</u>: Stk Journal</span>
      </button>

      <button
        onClick={() => {
          onNavigate('vouchers');
          onSelectVoucherType('PAYROLL');
        }}
        className={`tally-btn ${activeVoucherType === 'PAYROLL' && currentView === 'vouchers' ? 'bg-[#0284c7] text-white font-bold' : ''}`}
        title="Ctrl + F4: Payroll Voucher"
      >
        <span><u>F4</u>: Payroll</span>
      </button>

      <div className="flex-1"></div>

      <div className="pt-2 border-t border-[#183d4c] space-y-1">
        <button
          onClick={() => onNavigate('gateway')}
          className="tally-btn text-[#fbbf24] font-semibold"
          title="Esc: Universal Back / Exit"
        >
          <span>Esc: Back</span>
        </button>
      </div>
    </div>
  );
};
