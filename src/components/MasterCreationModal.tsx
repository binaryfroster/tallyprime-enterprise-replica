import React, { useState } from 'react';
import { AccountGroup, LedgerMaster, StockItem, UnitOfMeasure } from '../core/types';

interface MasterCreationModalProps {
  type: 'ledger' | 'stockItem';
  groups: AccountGroup[];
  units: UnitOfMeasure[];
  isOpen: boolean;
  onClose: () => void;
  onSaveLedger: (ledger: LedgerMaster) => void;
  onSaveStockItem: (item: StockItem) => void;
}

export const MasterCreationModal: React.FC<MasterCreationModalProps> = ({
  type,
  groups,
  units,
  isOpen,
  onClose,
  onSaveLedger,
  onSaveStockItem,
}) => {
  const [activeType, setActiveType] = useState<'ledger' | 'stockItem'>(type);

  React.useEffect(() => {
    setActiveType(type);
  }, [type]);

  // Ledger Fields
  const [ledgerName, setLedgerName] = useState('');
  const [ledgerGroup, setLedgerGroup] = useState(groups[0]?.id || 'grp_current_assets');
  const [openingBalance, setOpeningBalance] = useState(0);
  const [drCr, setDrCr] = useState<'Dr' | 'Cr'>('Dr');
  const [gstin, setGstin] = useState('');
  const [pos, setPos] = useState('27');

  // Stock Item Fields
  const [itemName, setItemName] = useState('');
  const [partNo, setPartNo] = useState('');
  const [unit, setUnit] = useState(units[0]?.symbol || 'Nos');
  const [costingMethod, setCostingMethod] = useState<'FIFO' | 'LIFO' | 'Weighted Average' | 'Last Purchase Cost' | 'Standard Price'>('FIFO');
  const [openingQty, setOpeningQty] = useState(0);
  const [rate, setRate] = useState(1000);
  const [hsn, setHsn] = useState('8542');

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeType === 'ledger') {
      const signedBal = drCr === 'Dr' ? openingBalance : -openingBalance;
      const newLedger: LedgerMaster = {
        id: `led_${Date.now()}`,
        name: ledgerName,
        groupId: ledgerGroup,
        openingBalance: signedBal,
        currency: 'INR',
        maintainBillByBill: true,
        gstin,
        placeOfSupply: pos,
      };
      onSaveLedger(newLedger);
    } else {
      const newItem: StockItem = {
        id: `item_${Date.now()}`,
        name: itemName,
        partNumber: partNo,
        baseUnitId: unit,
        costingMethod,
        openingQuantity: openingQty,
        openingRate: rate,
        openingValue: openingQty * rate,
        hsnCode: hsn,
        gstRate: 18,
      };
      onSaveStockItem(newItem);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="w-[540px] max-w-[95vw] max-h-[90vh] bg-[#0c2733] border-2 border-[#fbbf24] shadow-2xl rounded-sm flex flex-col overflow-hidden font-mono text-xs">
        <div className="bg-[#fbbf24] text-[#0c2733] px-4 py-2 font-bold flex justify-between items-center text-sm">
          <div className="flex items-center gap-2">
            <span>Master Creation / Alteration:</span>
            <button
              type="button"
              onClick={() => setActiveType('ledger')}
              className={`px-2 py-0.5 text-xs rounded font-bold cursor-pointer ${
                activeType === 'ledger' ? 'bg-[#0c2733] text-[#fbbf24]' : 'bg-[#d97706] text-white'
              }`}
            >
              Ledger
            </button>
            <button
              type="button"
              onClick={() => setActiveType('stockItem')}
              className={`px-2 py-0.5 text-xs rounded font-bold cursor-pointer ${
                activeType === 'stockItem' ? 'bg-[#0c2733] text-[#fbbf24]' : 'bg-[#d97706] text-white'
              }`}
            >
              Stock Item
            </button>
          </div>
          <button onClick={onClose} className="hover:text-red-700 font-bold cursor-pointer px-1">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3 bg-[#081e28] overflow-y-auto flex-1">
          {activeType === 'ledger' ? (
            <>
              <div>
                <label className="text-[#7ea0af] block mb-1">Name:</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={ledgerName}
                  onChange={(e) => setLedgerName(e.target.value)}
                  placeholder="e.g. Reliance Industries Ltd"
                  className="w-full tally-input py-1 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="text-[#7ea0af] block mb-1">Under Group:</label>
                <select
                  value={ledgerGroup}
                  onChange={(e) => setLedgerGroup(e.target.value)}
                  className="w-full tally-input py-1 text-xs"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.nature})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#7ea0af] block mb-1">Opening Balance (₹):</label>
                  <input
                    type="number"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(parseFloat(e.target.value) || 0)}
                    className="w-full tally-input py-1 text-right font-mono"
                  />
                </div>
                <div>
                  <label className="text-[#7ea0af] block mb-1">Dr / Cr:</label>
                  <select
                    value={drCr}
                    onChange={(e) => setDrCr(e.target.value as 'Dr' | 'Cr')}
                    className="w-full tally-input py-1"
                  >
                    <option value="Dr">Dr (Asset / Expense / Debtor)</option>
                    <option value="Cr">Cr (Liability / Income / Creditor)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#7ea0af] block mb-1">GSTIN / UIN:</label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    placeholder="27AABCR1234K1Z1"
                    className="w-full tally-input py-1 font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="text-[#7ea0af] block mb-1">Place of Supply (State Code):</label>
                  <input
                    type="text"
                    value={pos}
                    onChange={(e) => setPos(e.target.value)}
                    placeholder="27"
                    className="w-full tally-input py-1 font-mono"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="text-[#7ea0af] block mb-1">Item Name:</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g. DDR5 ECC Server RAM 64GB"
                  className="w-full tally-input py-1 text-sm font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#7ea0af] block mb-1">Part / Model Number:</label>
                  <input
                    type="text"
                    value={partNo}
                    onChange={(e) => setPartNo(e.target.value)}
                    placeholder="RAM-DDR5-64"
                    className="w-full tally-input py-1 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[#7ea0af] block mb-1">Base Unit of Measure:</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full tally-input py-1"
                  >
                    {units.map((u) => (
                      <option key={u.id} value={u.symbol}>
                        {u.symbol} - {u.formalName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[#7ea0af] block mb-1">Costing Method:</label>
                <select
                  value={costingMethod}
                  onChange={(e) => setCostingMethod(e.target.value as any)}
                  className="w-full tally-input py-1 font-semibold text-[#fbbf24]"
                >
                  <option value="FIFO">FIFO (First In First Out)</option>
                  <option value="LIFO">LIFO (Last In First Out)</option>
                  <option value="Weighted Average">Weighted Average</option>
                  <option value="Last Purchase Cost">Last Purchase Cost</option>
                  <option value="Standard Price">Standard Price</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[#7ea0af] block mb-1">Opening Qty:</label>
                  <input
                    type="number"
                    value={openingQty}
                    onChange={(e) => setOpeningQty(parseFloat(e.target.value) || 0)}
                    className="w-full tally-input py-1 text-right font-mono"
                  />
                </div>
                <div>
                  <label className="text-[#7ea0af] block mb-1">Rate (₹):</label>
                  <input
                    type="number"
                    value={rate}
                    onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
                    className="w-full tally-input py-1 text-right font-mono"
                  />
                </div>
                <div>
                  <label className="text-[#7ea0af] block mb-1">HSN Code:</label>
                  <input
                    type="text"
                    value={hsn}
                    onChange={(e) => setHsn(e.target.value)}
                    className="w-full tally-input py-1 font-mono"
                  />
                </div>
              </div>
            </>
          )}

          <div className="pt-3 border-t border-[#1b4b5e] flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-[#173e4e] hover:bg-[#205267] text-[#d6e3e8] rounded-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-1.5 bg-[#0284c7] hover:bg-[#0396e3] text-white font-bold rounded-xs shadow"
            >
              Save Master (Ctrl+A)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
