import React, { useState, useEffect } from 'react';
import { SecurityEngine } from '../core/securityEngine';
import { PublicUser, UserRole } from '../core/securityTypes';

interface SecurityControlModalProps {
  isOpen: boolean;
  securityEngine: SecurityEngine;
  onClose: () => void;
  onConfigUpdated: () => void;
}

export const SecurityControlModal: React.FC<SecurityControlModalProps> = ({
  isOpen,
  securityEngine,
  onClose,
  onConfigUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'tallyvault' | 'api'>('users');
  const [users, setUsers] = useState<PublicUser[]>([]);
  const config = securityEngine.getConfig();

  // Add User Form State
  const [newUsername, setNewUsername] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('DATA_ENTRY');
  const [newPassword, setNewPassword] = useState('');
  const [newBackdatedDays, setNewBackdatedDays] = useState(7);
  const [formMsg, setFormMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // TallyVault Form State
  const [vaultPassword, setVaultPassword] = useState('');
  const [vaultHint, setVaultHint] = useState('');
  const [vaultMsg, setVaultMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // API Security State
  const [apiSecEnabled, setApiSecEnabled] = useState(config.enableApiSecurity);
  const [apiKey, setApiKey] = useState(config.apiKey);

  const refreshUsers = () => {
    setUsers(securityEngine.getUsers());
  };

  useEffect(() => {
    if (isOpen) {
      refreshUsers();
      setFormMsg(null);
      setVaultMsg(null);
      setApiSecEnabled(config.enableApiSecurity);
      setApiKey(config.apiKey);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFormMsg(null);

    const result = securityEngine.addUser({
      username: newUsername,
      fullName: newFullName || newUsername,
      role: newRole,
      password: newPassword,
      allowedBackDatedDays: newRole === 'DATA_ENTRY' ? newBackdatedDays : undefined,
    });

    if (result.success) {
      setFormMsg({ type: 'success', text: `✓ User "${newUsername}" successfully created!` });
      setNewUsername('');
      setNewFullName('');
      setNewPassword('');
      refreshUsers();
    } else {
      setFormMsg({ type: 'error', text: result.error || 'Failed to add user.' });
    }
  };

  const handleDeleteUser = (userId: string) => {
    if (window.confirm('Are you sure you want to remove this user account?')) {
      const result = securityEngine.deleteUser(userId);
      if (result.success) {
        refreshUsers();
      } else {
        alert(result.error || 'Failed to delete user.');
      }
    }
  };

  const handleToggleVault = (e: React.FormEvent) => {
    e.preventDefault();
    setVaultMsg(null);

    if (securityEngine.isVaultEnabled()) {
      const res = securityEngine.disableTallyVault(vaultPassword);
      if (res.success) {
        setVaultMsg({ type: 'success', text: '✓ TallyVault encryption successfully deactivated.' });
        setVaultPassword('');
        onConfigUpdated();
      } else {
        setVaultMsg({ type: 'error', text: res.error || 'Failed to disable TallyVault.' });
      }
    } else {
      const res = securityEngine.enableTallyVault(vaultPassword, vaultHint);
      if (res.success) {
        setVaultMsg({
          type: 'success',
          text: '✓ TallyVault AES-256-GCM Military-Grade Database Encryption Activated!',
        });
        setVaultPassword('');
        onConfigUpdated();
      } else {
        setVaultMsg({ type: 'error', text: res.error || 'Failed to enable TallyVault.' });
      }
    }
  };

  const handleSaveApiSecurity = () => {
    securityEngine.updateConfig({
      enableApiSecurity: apiSecEnabled,
      apiKey,
    });
    onConfigUpdated();
    alert('✓ Port 9000 XML & REST API Security Settings Saved!');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="w-[640px] max-w-[95vw] max-h-[90vh] bg-[#0c2733] border-2 border-[#fbbf24] shadow-2xl rounded-sm flex flex-col overflow-hidden font-mono text-xs">
        {/* Header */}
        <div className="bg-[#fbbf24] text-[#0c2733] px-4 py-2 font-bold flex justify-between items-center text-sm">
          <div className="flex items-center gap-2">
            <span>🛡 Company Security Control & Governance</span>
            <span className="text-xs font-normal">[Alt+K]</span>
          </div>
          <button onClick={onClose} className="hover:text-red-700 font-bold px-1 cursor-pointer">
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-[#0e2c38] px-4 pt-2 border-b border-[#1b4b5d] flex space-x-2">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-1.5 font-bold rounded-t-xs text-xs transition cursor-pointer ${
              activeTab === 'users'
                ? 'bg-[#184859] text-[#fbbf24] border-t-2 border-[#fbbf24]'
                : 'text-[#8ca6b3] hover:bg-[#143e4f]'
            }`}
          >
            Users & Roles (RBAC)
          </button>
          <button
            onClick={() => setActiveTab('tallyvault')}
            className={`px-4 py-1.5 font-bold rounded-t-xs text-xs transition cursor-pointer ${
              activeTab === 'tallyvault'
                ? 'bg-[#184859] text-[#fbbf24] border-t-2 border-[#fbbf24]'
                : 'text-[#8ca6b3] hover:bg-[#143e4f]'
            }`}
          >
            TallyVault Encryption
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`px-4 py-1.5 font-bold rounded-t-xs text-xs transition cursor-pointer ${
              activeTab === 'api'
                ? 'bg-[#184859] text-[#fbbf24] border-t-2 border-[#fbbf24]'
                : 'text-[#8ca6b3] hover:bg-[#143e4f]'
            }`}
          >
            Port 9000 API Gateway
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 bg-[#081e28] overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: USERS & PASSWORDS */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="bg-[#0c242e] tally-panel-border p-3 space-y-2">
                <div className="text-[#38bdf8] font-bold text-xs flex justify-between">
                  <span>Authorized Users Directory ({users.length} Active Accounts)</span>
                  <span className="text-[#7ea0af] font-normal">Active Session: {securityEngine.getCurrentUser()?.username}</span>
                </div>

                <table className="tally-table">
                  <thead>
                    <tr>
                      <th>User Name</th>
                      <th>Full Name</th>
                      <th className="w-28">Role</th>
                      <th className="w-28 text-center">Back-Dated</th>
                      <th className="w-16 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="tally-row">
                        <td className="font-bold text-[#f1f5f9]">{u.username}</td>
                        <td className="text-[#cbd5e1]">{u.fullName}</td>
                        <td>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              u.role === 'ADMIN'
                                ? 'bg-[#1e3a5f] text-[#60a5fa]'
                                : u.role === 'AUDITOR'
                                ? 'bg-[#064e3b] text-[#34d399]'
                                : 'bg-[#1c3829] text-[#fbbf24]'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="text-center font-mono text-[#8ba8b6]">
                          {u.allowedBackDatedDays !== undefined ? `Max ${u.allowedBackDatedDays}d` : 'Unlimited'}
                        </td>
                        <td className="text-center">
                          {u.username !== 'admin' && (
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              className="text-[#ef4444] hover:font-bold px-1 cursor-pointer"
                              title="Delete user"
                            >
                              ✕
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add User Sub-Form */}
              <form onSubmit={handleAddUser} className="bg-[#0e2c38] border border-[#1b4b5d] p-3 rounded-xs space-y-3">
                <div className="text-[#fbbf24] font-bold text-xs uppercase">
                  + Create New Authorized User
                </div>

                {formMsg && (
                  <div
                    className={`p-2 rounded-xs text-xs font-semibold ${
                      formMsg.type === 'success'
                        ? 'bg-[#064e3b] text-[#34d399] border border-[#059669]'
                        : 'bg-[#3b1717] text-[#f87171] border border-[#ef4444]'
                    }`}
                  >
                    {formMsg.text}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[#7ea0af] block mb-1">User Name:</label>
                    <input
                      type="text"
                      required
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="e.g. accts_mgr"
                      className="w-full tally-input py-1 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[#7ea0af] block mb-1">Full Name:</label>
                    <input
                      type="text"
                      required
                      value={newFullName}
                      onChange={(e) => setNewFullName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full tally-input py-1 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[#7ea0af] block mb-1">Role Type:</label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as UserRole)}
                      className="w-full tally-input py-1 text-xs"
                    >
                      <option value="DATA_ENTRY">Data Entry Operator</option>
                      <option value="AUDITOR">Statutory Auditor</option>
                      <option value="ADMIN">Administrator</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[#7ea0af] block mb-1">Password:</label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full tally-input py-1 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[#7ea0af] block mb-1">Backdated Days:</label>
                    <input
                      type="number"
                      min="0"
                      max="365"
                      disabled={newRole !== 'DATA_ENTRY'}
                      value={newBackdatedDays}
                      onChange={(e) => setNewBackdatedDays(parseInt(e.target.value) || 0)}
                      className="w-full tally-input py-1 text-right text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#0284c7] hover:bg-[#0396e3] text-white font-bold rounded-xs cursor-pointer shadow"
                  >
                    Save User Account
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: TALLYVAULT ENCRYPTION */}
          {activeTab === 'tallyvault' && (
            <div className="space-y-4">
              <div className="bg-[#0c242e] tally-panel-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#fbbf24]">
                    TallyVault Status:
                  </span>
                  <span
                    className={`px-3 py-1 rounded font-bold text-xs ${
                      securityEngine.isVaultEnabled()
                        ? 'bg-[#064e3b] text-[#34d399] border border-[#059669]'
                        : 'bg-[#3b1717] text-[#f87171] border border-[#ef4444]'
                    }`}
                  >
                    {securityEngine.isVaultEnabled() ? '● ACTIVE (AES-256-GCM)' : '○ INACTIVE'}
                  </span>
                </div>

                <div className="text-xs text-[#cbd5e1] leading-relaxed">
                  TallyVault provides military-grade 256-bit AES-GCM database encryption with PBKDF2
                  key stretching. When active, all backup archives, exported files, and internal records
                  are cryptographically locked.
                </div>

                <div className="p-2.5 bg-[#2a1318] border border-[#7f1d1d] rounded-xs text-[#fecaca] text-[11px] space-y-1">
                  <span className="font-bold text-[#f87171]">⚠ IMPORTANT SECURITY NOTICE:</span>
                  <div>
                    Tally does not possess any backdoor or recovery key. If you forget your TallyVault
                    password, your accounting data is permanently irreversible and mathematically unrecoverable.
                  </div>
                </div>
              </div>

              {vaultMsg && (
                <div
                  className={`p-2.5 rounded-xs text-xs font-semibold ${
                    vaultMsg.type === 'success'
                      ? 'bg-[#064e3b] text-[#34d399] border border-[#059669]'
                      : 'bg-[#3b1717] text-[#f87171] border border-[#ef4444]'
                  }`}
                >
                  {vaultMsg.text}
                </div>
              )}

              <form onSubmit={handleToggleVault} className="bg-[#0e2c38] border border-[#1b4b5d] p-4 rounded-xs space-y-3">
                <div className="text-[#38bdf8] font-bold text-xs">
                  {securityEngine.isVaultEnabled()
                    ? 'Deactivate TallyVault Encryption'
                    : 'Activate TallyVault Master Encryption'}
                </div>

                <div>
                  <label className="text-[#7ea0af] block mb-1">
                    {securityEngine.isVaultEnabled() ? 'Current Vault Password:' : 'Set Vault Password (Min 6 chars):'}
                  </label>
                  <input
                    type="password"
                    required
                    value={vaultPassword}
                    onChange={(e) => setVaultPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full tally-input py-1 text-sm font-bold text-[#f8fafc]"
                  />
                </div>

                {!securityEngine.isVaultEnabled() && (
                  <div>
                    <label className="text-[#7ea0af] block mb-1">Password Hint (Optional):</label>
                    <input
                      type="text"
                      value={vaultHint}
                      onChange={(e) => setVaultHint(e.target.value)}
                      placeholder="e.g. Founders birth year"
                      className="w-full tally-input py-1 text-xs"
                    />
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className={`px-5 py-1.5 font-bold rounded-xs cursor-pointer shadow ${
                      securityEngine.isVaultEnabled()
                        ? 'bg-[#b91c1c] hover:bg-[#dc2626] text-white'
                        : 'bg-[#0284c7] hover:bg-[#0396e3] text-white'
                    }`}
                  >
                    {securityEngine.isVaultEnabled() ? 'Deactivate Vault' : 'Activate TallyVault'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: PORT 9000 API GATEWAY */}
          {activeTab === 'api' && (
            <div className="space-y-4">
              <div className="bg-[#0c242e] tally-panel-border p-4 space-y-3">
                <div className="text-[#fbbf24] font-bold text-xs uppercase">
                  Port 9000 XML & REST API Security Configuration
                </div>
                <div className="text-xs text-[#cbd5e1] leading-relaxed">
                  Controls external third-party access to the TallyPort 9000 server. When enabled, all
                  ERP requests, webhooks, and REST endpoints require HTTP Basic Auth or Bearer API token.
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="enableApiSecurity"
                    checked={apiSecEnabled}
                    onChange={(e) => setApiSecEnabled(e.target.checked)}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="enableApiSecurity" className="text-xs font-bold text-[#f8fafc] cursor-pointer">
                    Enable Mandatory Authentication for Port 9000 Gateway
                  </label>
                </div>
              </div>

              <div className="bg-[#0e2c38] border border-[#1b4b5d] p-4 rounded-xs space-y-3">
                <div>
                  <label className="text-[#7ea0af] block mb-1">Active Secret API Key:</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={apiKey}
                      className="flex-1 tally-input py-1 text-xs font-mono text-[#38bdf8]"
                    />
                    <button
                      type="button"
                      onClick={() => setApiKey('tally_sk_' + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2))}
                      className="px-3 py-1 bg-[#17485a] hover:bg-[#1f5f76] text-[#fbbf24] rounded-xs font-bold cursor-pointer"
                    >
                      Regenerate
                    </button>
                  </div>
                </div>

                <div className="text-[10px] text-[#7192a0] bg-[#0c242e] p-2.5 border border-[#173e4f] rounded-xs space-y-1">
                  <div className="font-bold text-[#cbd5e1]">Integration Examples:</div>
                  <div>• <code>curl -H "X-Tally-Token: {apiKey.substring(0, 16)}..." http://localhost:9000/api/reports/balance-sheet</code></div>
                  <div>• <code>curl -u admin:admin123 http://localhost:9000/api/vouchers</code></div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleSaveApiSecurity}
                    className="px-5 py-1.5 bg-[#0284c7] hover:bg-[#0396e3] text-white font-bold rounded-xs cursor-pointer shadow"
                  >
                    Save API Policy
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#0c2632] border-t border-[#1b4b5e] px-4 py-2 flex items-center justify-between text-xs">
          <span className="text-[#7192a0] text-[10px]">
            Security Control Audit Mode: Active (MCA Sec 134(5) Enforced)
          </span>
          <button
            onClick={onClose}
            className="px-5 py-1.5 bg-[#173e4e] hover:bg-[#205267] text-[#d6e3e8] font-bold rounded-xs cursor-pointer"
          >
            Esc: Close
          </button>
        </div>
      </div>
    </div>
  );
};
