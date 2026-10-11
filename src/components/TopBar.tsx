import React from 'react';
import { Company } from '../core/types';
import { PublicUser } from '../core/securityTypes';

interface TopBarProps {
  company: Company;
  currentDate: string;
  currentUser?: PublicUser | null;
  onOpenGoTo: () => void;
  onOpenFeatures: () => void;
  onOpenSecurity: () => void;
  onOpenLogin: () => void;
  onExport: () => void;
  onNavigate: (view: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  company,
  currentDate,
  currentUser,
  onOpenGoTo,
  onOpenFeatures,
  onOpenSecurity,
  onOpenLogin,
  onExport,
  onNavigate,
}) => {
  return (
    <div className="bg-[#123846] text-[#e2ecf0] border-b border-[#255e74] flex flex-col text-xs select-none">
      {/* Upper Global Actions Ribbon */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#0e2c37] border-b border-[#1b4b5d]">
        <div className="flex items-center space-x-3">
          <span className="font-bold text-[#fbbf24] text-sm tracking-wide flex items-center gap-1.5">
            <span className="bg-[#fbbf24] text-[#0e2c37] px-1 rounded font-black text-xs">Tally</span>
            <span>PRIME</span>
            <span className="text-[10px] text-[#38bdf8] font-mono font-normal ml-1">GOLD v5.2</span>
          </span>

          <div className="h-4 w-[1px] bg-[#22576b]"></div>

          <div className="flex space-x-1">
            <button
              onClick={() => onNavigate('gateway')}
              className="px-2 py-0.5 hover:bg-[#1f566a] rounded transition text-[#e0ecf0]"
              title="Alt + K: Company Menu"
              aria-label="Navigate to Gateway Menu"
            >
              <u>K</u>: Company
            </button>
            <button
              onClick={onOpenSecurity}
              className="px-2 py-0.5 hover:bg-[#1f566a] rounded transition text-[#fbbf24]"
              title="Alt + K: Company Security & RBAC"
              aria-label="Open Security & Access Control Settings"
            >
              <u>S</u>: Security
            </button>
            <button
              onClick={onExport}
              className="px-2 py-0.5 hover:bg-[#1f566a] rounded transition text-[#e0ecf0]"
              title="Alt + Y: Data Backup & Restore"
              aria-label="Backup and Data Management"
            >
              <u>Y</u>: Data
            </button>
            <button
              onClick={() => onNavigate('statutory')}
              className="px-2 py-0.5 hover:bg-[#1f566a] rounded transition text-[#e0ecf0]"
              title="Alt + Z: Exchange & GST Sync"
              aria-label="Exchange and Statutory GST Sync"
            >
              <u>Z</u>: Exchange
            </button>
          </div>
        </div>

        {/* Center: Alt+G Go To Omnibar */}
        <div className="flex items-center">
          <button
            onClick={onOpenGoTo}
            className="flex items-center gap-2 bg-[#081e27] hover:bg-[#0c2b37] border border-[#2c6d86] text-[#f8fafc] px-4 py-1 rounded-sm shadow-inner transition group cursor-pointer"
            title="Press Alt + G to open universal search without losing context"
            aria-label="Universal Go To Search Omnibar"
          >
            <span className="text-[#fbbf24] font-bold">G: Go To</span>
            <span className="text-[#7c9aa6] text-[11px] font-mono group-hover:text-[#bae6fd]">
              (Alt+G Omnibar)
            </span>
          </button>
        </div>

        {/* Right Top Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onExport}
            className="px-2 py-0.5 hover:bg-[#1f566a] rounded transition cursor-pointer"
            title="Alt + E: Export to JSON, Excel, XML"
            aria-label="Export Enterprise Data"
          >
            <u>E</u>: Export
          </button>
          <button
            onClick={() => window.print()}
            className="px-2 py-0.5 hover:bg-[#1f566a] rounded transition cursor-pointer"
            title="Ctrl + P / Alt + P: Print"
            aria-label="Print Current Screen"
          >
            <u>P</u>: Print
          </button>
          <button
            onClick={onOpenFeatures}
            className="px-2 py-0.5 bg-[#1b4e60] hover:bg-[#23637a] text-[#fbbf24] font-semibold rounded transition cursor-pointer"
            title="F11: Company Features"
            aria-label="Open Company Features"
          >
            F11: Features
          </button>
        </div>
      </div>

      {/* Lower Breadcrumb & Active Context Strip */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#154252] text-[#c3d7df] text-[11px]">
        <div className="flex items-center space-x-2 font-mono">
          <span className="text-[#fbbf24] font-semibold">{company.name}</span>
          <span>|</span>
          <span>FY: {company.financialYearFrom.substring(0, 4)} - 2027</span>
          <span>|</span>
          <span className="text-[#38bdf8]">GSTIN: {company.gstin}</span>
        </div>
        <div className="flex items-center space-x-3 font-mono">
          <span className="text-[#10b981] font-semibold">● PORT 9000 XML: READY</span>
          <span>Date: {currentDate}</span>
          <div className="h-3 w-[1px] bg-[#22576b]"></div>
          <div className="flex items-center gap-1.5">
            <span className="text-[#8ba8b6]">User:</span>
            <span className="font-bold text-[#f1f5f9]">{currentUser?.username || 'admin'}</span>
            <span className="px-1.5 py-0.2 bg-[#0c2733] border border-[#205267] text-[#fbbf24] text-[10px] rounded font-bold">
              {currentUser?.role || 'ADMIN'}
            </span>
            <button
              onClick={onOpenLogin}
              className="text-[#38bdf8] hover:underline cursor-pointer ml-1 text-[10px]"
              title="Lock / Switch User (Alt+K)"
              aria-label="Switch User Account"
            >
              [Switch]
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
