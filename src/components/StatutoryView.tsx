import React, { useState } from 'react';
import { Company, Voucher, LedgerMaster } from '../core/types';
import { StatutoryEngine } from '../core/statutoryEngine';

interface StatutoryViewProps {
  company: Company;
  vouchers: Voucher[];
  ledgers: LedgerMaster[];
  onBack: () => void;
}

export const StatutoryView: React.FC<StatutoryViewProps> = ({
  company,
  vouchers,
  ledgers,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<'gstr1' | 'gstr3b' | 'eway' | 'einvoice'>('gstr1');

  const gstr1 = StatutoryEngine.generateGSTR1({
    vouchers,
    company,
    ledgers,
    returnPeriod: '042026',
  });

  const gstr3b = StatutoryEngine.generateGSTR3B({
    vouchers,
    company,
    returnPeriod: '042026',
  });

  const salesVouchers = vouchers.filter((v) => v.voucherType === 'SALES' && !v.isCancelled);
  const largeSalesVoucher = salesVouchers.find((v) => v.totalVoucherAmount >= 50000) || salesVouchers[0];
  const party = largeSalesVoucher ? ledgers.find((l) => l.id === largeSalesVoucher.partyLedgerId) : undefined;

  const ewayResult = largeSalesVoucher && party
    ? StatutoryEngine.generateEWayBill({
        voucher: largeSalesVoucher,
        company,
        party,
      })
    : null;

  const einvoiceResult = largeSalesVoucher && party
    ? StatutoryEngine.generateEInvoiceIRN({
        voucher: largeSalesVoucher,
        company,
        party,
      })
    : null;

  const downloadJson = (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0b1f28] overflow-hidden text-xs font-mono">
      {/* View Header */}
      <div className="bg-[#144353] border-b border-[#246076] px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[#fbbf24] font-bold text-sm">GST & Statutory Compliance Center</span>
          <span className="text-[#38bdf8] text-[11px] font-semibold">
            GSTIN: {company.gstin} ({company.state})
          </span>
        </div>

        <button
          onClick={onBack}
          className="px-3 py-1 bg-[#17485a] hover:bg-[#1f5f76] text-[#d6e3e8] rounded-xs font-semibold"
        >
          Esc: Gateway
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-[#0e2c38] px-4 pt-2 border-b border-[#1b4b5d] flex space-x-2">
        <button
          onClick={() => setActiveTab('gstr1')}
          className={`px-4 py-1.5 font-bold rounded-t-xs text-xs transition ${
            activeTab === 'gstr1'
              ? 'bg-[#184859] text-[#fbbf24] border-t-2 border-[#fbbf24]'
              : 'text-[#8ca6b3] hover:bg-[#143e4f]'
          }`}
        >
          GSTR-1 (Outward Supplies)
        </button>
        <button
          onClick={() => setActiveTab('gstr3b')}
          className={`px-4 py-1.5 font-bold rounded-t-xs text-xs transition ${
            activeTab === 'gstr3b'
              ? 'bg-[#184859] text-[#fbbf24] border-t-2 border-[#fbbf24]'
              : 'text-[#8ca6b3] hover:bg-[#143e4f]'
          }`}
        >
          GSTR-3B (Monthly Summary)
        </button>
        <button
          onClick={() => setActiveTab('eway')}
          className={`px-4 py-1.5 font-bold rounded-t-xs text-xs transition ${
            activeTab === 'eway'
              ? 'bg-[#184859] text-[#fbbf24] border-t-2 border-[#fbbf24]'
              : 'text-[#8ca6b3] hover:bg-[#143e4f]'
          }`}
        >
          E-Way Bill Generator
        </button>
        <button
          onClick={() => setActiveTab('einvoice')}
          className={`px-4 py-1.5 font-bold rounded-t-xs text-xs transition ${
            activeTab === 'einvoice'
              ? 'bg-[#184859] text-[#fbbf24] border-t-2 border-[#fbbf24]'
              : 'text-[#8ca6b3] hover:bg-[#143e4f]'
          }`}
        >
          E-Invoicing (IRN & QR)
        </button>
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'gstr1' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-[#0e2c38] p-3 border border-[#1b4b5e] rounded-xs">
              <div>
                <div className="font-bold text-sm text-[#f1f5f9]">GSTR-1 Statement of Outward Supplies</div>
                <div className="text-[11px] text-[#789ca9]">
                  Period: 04/2026 • Registered B2B: {gstr1.b2b.length} Parties • B2CS: {gstr1.b2cs.length}
                </div>
              </div>
              <button
                onClick={() => downloadJson(gstr1, `GSTR1_${company.gstin}_042026.json`)}
                className="px-4 py-1.5 bg-[#0284c7] hover:bg-[#0396e3] text-white font-bold rounded-xs shadow"
              >
                📥 Download GSTR-1 JSON for Portal
              </button>
            </div>

            {/* B2B Table */}
            <div className="bg-[#0e2c38] tally-panel-border p-3 space-y-2">
              <div className="text-[#fbbf24] font-bold">Table 4: B2B Invoices (Registered Dealers)</div>
              <table className="tally-table">
                <thead>
                  <tr>
                    <th>Recipient GSTIN</th>
                    <th>Invoice No</th>
                    <th>Invoice Date</th>
                    <th>POS</th>
                    <th className="text-right">Invoice Val (₹)</th>
                    <th className="text-right">Taxable Val (₹)</th>
                    <th className="text-right">CGST (₹)</th>
                    <th className="text-right">SGST (₹)</th>
                    <th className="text-right">IGST (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {gstr1.b2b.map((party) =>
                    party.inv.map((inv) => (
                      <tr key={inv.inum} className="tally-row">
                        <td className="text-[#38bdf8] font-bold">{party.ctin}</td>
                        <td className="font-mono text-[#fbbf24]">{inv.inum}</td>
                        <td>{inv.idt}</td>
                        <td>{inv.pos}</td>
                        <td className="text-right font-mono font-bold">₹{inv.val.toLocaleString('en-IN')}</td>
                        <td className="text-right font-mono">₹{inv.itms[0].itm_det.txval.toLocaleString('en-IN')}</td>
                        <td className="text-right font-mono">₹{inv.itms[0].itm_det.camt.toLocaleString('en-IN')}</td>
                        <td className="text-right font-mono">₹{inv.itms[0].itm_det.samt.toLocaleString('en-IN')}</td>
                        <td className="text-right font-mono">₹{inv.itms[0].itm_det.iamt.toLocaleString('en-IN')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* HSN Table 12 */}
            <div className="bg-[#0e2c38] tally-panel-border p-3 space-y-2">
              <div className="text-[#fbbf24] font-bold">Table 12: HSN Summary of Outward Supplies</div>
              <table className="tally-table">
                <thead>
                  <tr>
                    <th>HSN / SAC</th>
                    <th>Description</th>
                    <th>UQC</th>
                    <th className="text-right">Total Qty</th>
                    <th className="text-right">Taxable Value (₹)</th>
                    <th className="text-right">Integrated Tax (₹)</th>
                    <th className="text-right">Central Tax (₹)</th>
                    <th className="text-right">State Tax (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {gstr1.hsn.data.map((hsn) => (
                    <tr key={hsn.hsn_sc} className="tally-row">
                      <td className="text-[#38bdf8] font-bold">{hsn.hsn_sc}</td>
                      <td>{hsn.desc}</td>
                      <td>{hsn.uqc}</td>
                      <td className="text-right font-mono">{hsn.qty}</td>
                      <td className="text-right font-mono font-bold">₹{hsn.txval.toLocaleString('en-IN')}</td>
                      <td className="text-right font-mono">₹{hsn.iamt.toLocaleString('en-IN')}</td>
                      <td className="text-right font-mono">₹{hsn.camt.toLocaleString('en-IN')}</td>
                      <td className="text-right font-mono">₹{hsn.samt.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'gstr3b' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-[#0e2c38] p-3 border border-[#1b4b5e] rounded-xs">
              <div>
                <div className="font-bold text-sm text-[#f1f5f9]">GSTR-3B Monthly Return Summary</div>
                <div className="text-[11px] text-[#789ca9]">
                  Period: 04/2026 • Return Status: Ready to File
                </div>
              </div>
              <button
                onClick={() => downloadJson(gstr3b, `GSTR3B_${company.gstin}_042026.json`)}
                className="px-4 py-1.5 bg-[#0284c7] hover:bg-[#0396e3] text-white font-bold rounded-xs shadow"
              >
                📥 Download GSTR-3B JSON
              </button>
            </div>

            {/* Table 3.1 Outward */}
            <div className="bg-[#0e2c38] tally-panel-border p-3 space-y-2">
              <div className="text-[#fbbf24] font-bold">
                3.1 Details of Outward Supplies and inward supplies liable to reverse charge
              </div>
              <table className="tally-table">
                <thead>
                  <tr>
                    <th>Nature of Supplies</th>
                    <th className="text-right">Total Taxable Value (₹)</th>
                    <th className="text-right">Integrated Tax (₹)</th>
                    <th className="text-right">Central Tax (₹)</th>
                    <th className="text-right">State / UT Tax (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="tally-row font-semibold">
                    <td>(a) Outward taxable supplies (other than zero rated, nil and exempted)</td>
                    <td className="text-right font-mono font-bold text-[#fbbf24]">
                      ₹{gstr3b.sup_details.osup_det.txval.toLocaleString('en-IN')}
                    </td>
                    <td className="text-right font-mono">
                      ₹{gstr3b.sup_details.osup_det.iamt.toLocaleString('en-IN')}
                    </td>
                    <td className="text-right font-mono">
                      ₹{gstr3b.sup_details.osup_det.camt.toLocaleString('en-IN')}
                    </td>
                    <td className="text-right font-mono">
                      ₹{gstr3b.sup_details.osup_det.samt.toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Table 4 Eligible ITC */}
            <div className="bg-[#0e2c38] tally-panel-border p-3 space-y-2">
              <div className="text-[#fbbf24] font-bold">4. Eligible Input Tax Credit (ITC) Available</div>
              <table className="tally-table">
                <thead>
                  <tr>
                    <th>Details</th>
                    <th className="text-right">Integrated Tax (₹)</th>
                    <th className="text-right">Central Tax (₹)</th>
                    <th className="text-right">State / UT Tax (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="tally-row font-semibold">
                    <td>(A)(5) All other ITC (Purchases from Registered Suppliers)</td>
                    <td className="text-right font-mono font-bold text-[#10b981]">
                      ₹{gstr3b.itc_elg.itc_avl[0]?.iamt.toLocaleString('en-IN')}
                    </td>
                    <td className="text-right font-mono font-bold text-[#10b981]">
                      ₹{gstr3b.itc_elg.itc_avl[0]?.camt.toLocaleString('en-IN')}
                    </td>
                    <td className="text-right font-mono font-bold text-[#10b981]">
                      ₹{gstr3b.itc_elg.itc_avl[0]?.samt.toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'eway' && (
          <div className="bg-[#0e2c38] tally-panel-border p-4 space-y-3">
            <div className="flex justify-between items-center border-b border-[#1b4e61] pb-2">
              <div>
                <div className="font-bold text-sm text-[#f1f5f9]">National NIC E-Way Bill JSON Generation</div>
                <div className="text-[11px] text-[#789ca9]">
                  Voucher: {largeSalesVoucher?.voucherNumber} • Total Consignment Value: ₹{largeSalesVoucher?.totalVoucherAmount.toLocaleString('en-IN')}
                </div>
              </div>
              {ewayResult?.isApplicable && (
                <button
                  onClick={() => downloadJson(ewayResult.payload, `EWAY_${largeSalesVoucher?.voucherNumber.replace(/\//g, '_')}.json`)}
                  className="px-4 py-1.5 bg-[#0284c7] hover:bg-[#0396e3] text-white font-bold rounded-xs shadow"
                >
                  📥 Export E-Way Bill JSON
                </button>
              )}
            </div>

            {ewayResult?.isApplicable ? (
              <pre className="p-3 bg-[#07161e] border border-[#1b4b5e] rounded-xs text-[#38bdf8] text-xs font-mono overflow-x-auto">
                {JSON.stringify(ewayResult.payload, null, 2)}
              </pre>
            ) : (
              <div className="text-[#ef4444] font-semibold">{ewayResult?.reason}</div>
            )}
          </div>
        )}

        {activeTab === 'einvoice' && (
          <div className="bg-[#0e2c38] tally-panel-border p-4 space-y-3">
            <div className="flex justify-between items-center border-b border-[#1b4e61] pb-2">
              <div>
                <div className="font-bold text-sm text-[#f1f5f9]">
                  E-Invoicing: 64-Character SHA-256 IRN & Signed QR Code
                </div>
                <div className="text-[11px] text-[#789ca9]">
                  Voucher: {largeSalesVoucher?.voucherNumber} • Party: {party?.name}
                </div>
              </div>
              {einvoiceResult && (
                <button
                  onClick={() => downloadJson(einvoiceResult, `EINVOICE_${largeSalesVoucher?.voucherNumber.replace(/\//g, '_')}.json`)}
                  className="px-4 py-1.5 bg-[#0284c7] hover:bg-[#0396e3] text-white font-bold rounded-xs shadow"
                >
                  📥 Export E-Invoice JSON
                </button>
              )}
            </div>

            {einvoiceResult && (
              <div className="space-y-3">
                <div className="p-3 bg-[#081f29] border border-[#23586d] rounded-xs space-y-1">
                  <div className="text-[#7ea0af] text-[10px] font-bold uppercase">
                    Invoice Reference Number (IRN):
                  </div>
                  <div className="text-[#fbbf24] font-mono font-bold break-all text-sm">
                    {einvoiceResult.irn}
                  </div>
                </div>

                <div className="p-3 bg-[#081f29] border border-[#23586d] rounded-xs space-y-1">
                  <div className="text-[#7ea0af] text-[10px] font-bold uppercase">
                    Signed QR Code Payload:
                  </div>
                  <div className="text-[#38bdf8] font-mono break-all text-xs">
                    {einvoiceResult.signedQrCode}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
