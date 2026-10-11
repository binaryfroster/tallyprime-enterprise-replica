import React, { useState, useEffect, useRef } from 'react';
import { SecurityEngine } from '../core/securityEngine';

interface LoginModalProps {
  isOpen: boolean;
  securityEngine: SecurityEngine;
  companyName: string;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  securityEngine,
  companyName,
  onClose,
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);
  const [lockedSeconds, setLockedSeconds] = useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setLockedSeconds(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (lockedSeconds && lockedSeconds > 0) {
      const timer = setInterval(() => {
        setLockedSeconds((prev) => (prev && prev > 1 ? prev - 1 : null));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [lockedSeconds]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = securityEngine.login(username, password);
    if (result.success) {
      onLoginSuccess();
      onClose();
    } else {
      setError(result.error || 'Login failed.');
      if (result.lockedUntilSeconds) {
        setLockedSeconds(result.lockedUntilSeconds);
      }
    }
  };

  const handleQuickSwitch = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError(null);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="w-[420px] max-w-[95vw] bg-[#0c2733] border-2 border-[#fbbf24] shadow-2xl rounded-sm flex flex-col overflow-hidden font-mono text-xs">
        {/* Header */}
        <div className="bg-[#fbbf24] text-[#0c2733] px-4 py-2 font-bold flex justify-between items-center text-sm">
          <span>Company Security & User Login</span>
          <span className="text-[11px] font-normal">[Alt+K]</span>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 bg-[#081e28]">
          <div className="text-[11px] text-[#7ea0af] bg-[#0c242e] p-2.5 border border-[#173e4f] rounded-xs space-y-1">
            <div className="text-[#38bdf8] font-bold text-xs">{companyName}</div>
            <div className="text-[10px] text-[#cbd5e1]">
              Enter authorized TallyPrime credentials to establish authenticated session.
            </div>
          </div>

          {error && (
            <div className="p-2.5 bg-[#3b1717] border border-[#ef4444] rounded-xs text-[#f87171] text-xs">
              <span className="font-bold">⚠ Error: </span>
              {error}
              {lockedSeconds && (
                <div className="text-[10px] text-[#fecaca] mt-1 font-semibold">
                  Locked for {lockedSeconds} more seconds...
                </div>
              )}
            </div>
          )}

          <div>
            <label className="text-[#7ea0af] block mb-1 font-semibold">User Name:</label>
            <input
              ref={inputRef}
              type="text"
              required
              disabled={lockedSeconds !== null && lockedSeconds > 0}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full tally-input py-1 text-sm font-bold text-[#f8fafc]"
              placeholder="e.g. admin or operator"
            />
          </div>

          <div>
            <label className="text-[#7ea0af] block mb-1 font-semibold">Password:</label>
            <input
              type="password"
              required
              disabled={lockedSeconds !== null && lockedSeconds > 0}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full tally-input py-1 text-sm font-bold text-[#f8fafc]"
              placeholder="••••••••"
            />
          </div>

          {/* Quick Demo Role Switcher */}
          <div className="pt-2 border-t border-[#1b4b5e] space-y-1.5">
            <div className="text-[10px] text-[#7198a8] font-bold uppercase">
              Quick Role Selection (Demo Profiles):
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleQuickSwitch('admin', 'admin123')}
                className="flex-1 py-1 px-1.5 bg-[#143e4f] hover:bg-[#1f566a] text-[#38bdf8] rounded-xs text-[10px] font-bold text-center border border-[#1d5b70] cursor-pointer"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickSwitch('operator', 'operator123')}
                className="flex-1 py-1 px-1.5 bg-[#143e4f] hover:bg-[#1f566a] text-[#fbbf24] rounded-xs text-[10px] font-bold text-center border border-[#1d5b70] cursor-pointer"
              >
                Data Entry
              </button>
              <button
                type="button"
                onClick={() => handleQuickSwitch('auditor', 'auditor123')}
                className="flex-1 py-1 px-1.5 bg-[#143e4f] hover:bg-[#1f566a] text-[#34d399] rounded-xs text-[10px] font-bold text-center border border-[#1d5b70] cursor-pointer"
              >
                Auditor
              </button>
            </div>
          </div>

          {/* Form Consent Opt-in Checkbox (GDPR, DPDPA & Legal Compliance) */}
          <div className="flex items-start gap-2 pt-2 text-[11px] text-[#94a3b8]">
            <input
              type="checkbox"
              id="auth-consent-checkbox"
              defaultChecked
              required
              className="mt-0.5 accent-[#38bdf8] cursor-pointer"
            />
            <label htmlFor="auth-consent-checkbox" className="leading-tight select-text cursor-pointer">
              I agree to the{' '}
              <a href="/privacy.html" target="_blank" rel="noopener noreferrer" className="text-[#38bdf8] underline hover:text-[#7dd3fc]">
                Privacy Policy
              </a>{' '}
              and{' '}
              <a href="/terms.html" target="_blank" rel="noopener noreferrer" className="text-[#38bdf8] underline hover:text-[#7dd3fc]">
                Terms &amp; Conditions
              </a>.
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#1b4b5e]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-[#173e4e] hover:bg-[#205267] text-[#d6e3e8] font-semibold rounded-xs cursor-pointer"
            >
              Esc: Cancel
            </button>
            <button
              type="submit"
              disabled={lockedSeconds !== null && lockedSeconds > 0}
              className="px-6 py-1.5 bg-[#0284c7] hover:bg-[#0396e3] text-white font-bold rounded-xs shadow cursor-pointer disabled:opacity-50"
            >
              Enter: Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
