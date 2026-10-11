import React, { useState } from 'react';
import { AuditTrailLog } from '../core/types';
import { AuditEngine } from '../core/auditEngine';

interface AuditTrailViewProps {
  logs: AuditTrailLog[];
  onBack: () => void;
}

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({ logs, onBack }) => {
  const [selectedLog, setSelectedLog] = useState<AuditTrailLog | null>(null);

  // Check integrity
  const engine = new AuditEngine(logs);
  const integrity = engine.verifyIntegrity();

  return (
    <div className="flex-1 flex flex-col bg-[#0b1f28] overflow-hidden text-xs font-mono">
      {/* View Header */}
      <div className="bg-[#144353] border-b border-[#246076] px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[#fbbf24] font-bold text-sm">
            MCA Section 134(5) Audit Trail (Edit Log)
          </span>

          {integrity.isValid ? (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#064e3b] text-[#34d399] border border-[#059669]">
              ✓ 100% Cryptographically Verified & Tamper-Proof
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#450a0a] text-[#f87171] border border-[#dc2626]">
              ⚠ Tampering Detected at Entry ID {integrity.corruptedAtId}
            </span>
          )}
        </div>

        <button
          onClick={onBack}
          className="px-3 py-1 bg-[#17485a] hover:bg-[#1f5f76] text-[#d6e3e8] rounded-xs font-semibold"
        >
          Esc: Gateway
        </button>
      </div>

      {/* Grid of Audit Logs */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-[#0e2c38] tally-panel-border p-3 space-y-2">
          <div className="text-[#38bdf8] font-bold flex justify-between">
            <span>Audit Trail Logs ({logs.length} Immutable Event Entries)</span>
            <span className="text-[#8ba8b6] font-normal text-[11px]">
              Non-disableable in Audit Log Edition
            </span>
          </div>

          <table className="tally-table">
            <thead>
              <tr>
                <th className="w-44">Timestamp (UTC)</th>
                <th className="w-24">Action</th>
                <th className="w-28">Entity Type</th>
                <th className="w-36">Entity ID</th>
                <th className="w-24">User</th>
                <th>Cryptographic Current SHA-256 Hash</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className={`tally-row cursor-pointer ${
                    selectedLog?.id === log.id ? 'tally-row-selected' : ''
                  }`}
                >
                  <td className="text-[#8ba8b6] font-mono">{log.timestamp.replace('T', ' ').substring(0, 19)}</td>
                  <td>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        log.action === 'CREATE'
                          ? 'bg-[#064e3b] text-[#34d399]'
                          : log.action === 'ALTER'
                          ? 'bg-[#1e3a5f] text-[#60a5fa]'
                          : 'bg-[#450a0a] text-[#f87171]'
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="text-[#f1f5f9] font-semibold">{log.entityType}</td>
                  <td className="text-[#fbbf24] font-mono">{log.entityId}</td>
                  <td className="text-[#cbd5e1] font-mono">{log.userId}</td>
                  <td className="text-[#38bdf8] font-mono text-[10px] truncate max-w-xs">
                    {log.currentHash}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Selected Log Inspector */}
        {selectedLog && (
          <div className="bg-[#0a222d] tally-panel-border p-4 rounded-xs space-y-3">
            <div className="text-[#fbbf24] font-bold border-b border-[#1b4e61] pb-2 flex justify-between">
              <span>Event Hash Proof & Field Delta: {selectedLog.id}</span>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-[#ef4444] font-bold px-2"
              >
                ✕ Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div className="space-y-1 bg-[#061821] p-2.5 rounded border border-[#173e4f]">
                <div className="text-[#7ea0af] text-[10px] font-bold">PREVIOUS HASH:</div>
                <div className="text-[#94a3b8] break-all text-[11px]">{selectedLog.previousHash}</div>
                <div className="text-[#7ea0af] text-[10px] font-bold mt-2">CURRENT HASH:</div>
                <div className="text-[#38bdf8] break-all text-[11px] font-bold">{selectedLog.currentHash}</div>
              </div>

              <div className="space-y-1 bg-[#061821] p-2.5 rounded border border-[#173e4f]">
                <div className="text-[#7ea0af] text-[10px] font-bold">MODIFIED FIELDS & VALUES:</div>
                <pre className="text-[#34d399] text-[11px] overflow-x-auto max-h-36">
                  {JSON.stringify(selectedLog.diff, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
