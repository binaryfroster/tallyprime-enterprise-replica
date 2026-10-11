import assert from 'node:assert';
import test from 'node:test';
import { SecurityEngine } from '../src/core/securityEngine';
import {
  encryptAesGcm,
  decryptAesGcm,
  hashPassword,
  generateSalt,
  generateApiKey,
} from '../src/core/securityCrypto';
import { TallyStore } from '../src/core/tallyStore';
import { createTallyServer } from '../src/core/port9000Server';
import http from 'node:http';

test('Security Crypto: PBKDF2 Key Derivation and AES-256-GCM Authenticated Encryption', async () => {
  const password = 'SuperSecretTallyVaultKey2026!';
  const secretPayload = JSON.stringify({
    company: 'Supreme Industries Ltd',
    secretNotes: 'Confidential corporate ledger accounts',
    taxId: '27AABCS1429B1Z2',
  });

  const encrypted = await encryptAesGcm(secretPayload, password);
  assert.ok(encrypted.ciphertextBase64.length > 0);
  assert.ok(encrypted.saltHex.length === 32);
  assert.ok(encrypted.ivHex.length === 24);

  // Decryption with matching password
  const decrypted = await decryptAesGcm(
    encrypted.ciphertextBase64,
    password,
    encrypted.saltHex,
    encrypted.ivHex
  );
  assert.strictEqual(decrypted, secretPayload);

  // Decryption with wrong password must fail (AEAD tag mismatch)
  await assert.rejects(
    async () => {
      await decryptAesGcm(
        encrypted.ciphertextBase64,
        'WrongPassword!',
        encrypted.saltHex,
        encrypted.ivHex
      );
    },
    /operation failed|authentication failed|tag mismatch|integrity/i
  );

  // Tampered ciphertext must fail
  const tamperedCiphertext =
    encrypted.ciphertextBase64.substring(0, 10) +
    (encrypted.ciphertextBase64[10] === 'A' ? 'B' : 'A') +
    encrypted.ciphertextBase64.substring(11);
  await assert.rejects(
    async () => {
      await decryptAesGcm(
        tamperedCiphertext,
        password,
        encrypted.saltHex,
        encrypted.ivHex
      );
    },
    /operation failed|authentication failed|tag mismatch|integrity/i
  );
});

test('Multi-User Authentication: Seed users, password hashing, and login sessions', () => {
  const engine = new SecurityEngine();

  // Initial users check
  const users = engine.getUsers();
  assert.strictEqual(users.length, 3);
  assert.ok(users.some((u) => u.username === 'admin' && u.role === 'ADMIN'));
  assert.ok(users.some((u) => u.username === 'operator' && u.role === 'DATA_ENTRY'));
  assert.ok(users.some((u) => u.username === 'auditor' && u.role === 'AUDITOR'));

  // Admin login succeeds
  const adminLogin = engine.login('admin', 'admin123');
  assert.strictEqual(adminLogin.success, true);
  assert.ok(adminLogin.session);
  assert.strictEqual(engine.getCurrentUser()?.username, 'admin');
  assert.strictEqual(engine.getCurrentUser()?.role, 'ADMIN');

  // Logout clears session
  engine.logout();
  assert.strictEqual(engine.getCurrentUser(), null);

  // Auditor login succeeds
  const auditorLogin = engine.login('auditor', 'auditor123');
  assert.strictEqual(auditorLogin.success, true);
  assert.strictEqual(engine.getCurrentUser()?.role, 'AUDITOR');
});

test('Brute-Force Lockout Protection: 3 consecutive failed logins locks account', () => {
  const engine = new SecurityEngine();

  // Failed login 1
  const fail1 = engine.login('operator', 'wrong1');
  assert.strictEqual(fail1.success, false);
  assert.match(fail1.error || '', /2 attempts remaining/);

  // Failed login 2
  const fail2 = engine.login('operator', 'wrong2');
  assert.strictEqual(fail2.success, false);
  assert.match(fail2.error || '', /1 attempts remaining/);

  // Failed login 3 (triggers lockout)
  const fail3 = engine.login('operator', 'wrong3');
  assert.strictEqual(fail3.success, false);
  assert.match(fail3.error || '', /Account locked/);
  assert.ok(fail3.lockedUntilSeconds && fail3.lockedUntilSeconds > 0);

  // Attempt 4 during lockout must be immediately rejected
  const fail4 = engine.login('operator', 'operator123');
  assert.strictEqual(fail4.success, false);
  assert.match(fail4.error || '', /Account locked/);
});

test('RBAC Enforcement: DATA_ENTRY blocked from reports, masters, and back-dated vouchers', () => {
  const engine = new SecurityEngine();
  const loginRes = engine.login('operator', 'operator123');
  assert.strictEqual(loginRes.success, true);

  // DATA_ENTRY cannot view Balance Sheet, P&L, Ratio Analysis, Audit Trail, or Statutory
  assert.strictEqual(engine.canExecute('VIEW_BALANCE_SHEET').allowed, false);
  assert.strictEqual(engine.canExecute('VIEW_PROFIT_LOSS').allowed, false);
  assert.strictEqual(engine.canExecute('VIEW_RATIO_ANALYSIS').allowed, false);
  assert.strictEqual(engine.canExecute('VIEW_AUDIT_TRAIL').allowed, false);
  assert.strictEqual(engine.canExecute('VIEW_STATUTORY').allowed, false);

  // DATA_ENTRY cannot alter masters or delete vouchers
  assert.strictEqual(engine.canExecute('ALTER_MASTER').allowed, false);
  assert.strictEqual(engine.canExecute('DELETE_VOUCHER').allowed, false);

  // Transaction Back-Dating Limit: max 7 days
  // 1. Voucher within 7 days -> Allowed
  const allowedVoucher = engine.canExecute('CREATE_VOUCHER', {
    voucherDate: '2026-05-28',
    currentDate: '2026-05-31',
  });
  assert.strictEqual(allowedVoucher.allowed, true);

  // 2. Voucher older than 7 days (e.g. 15 days old) -> Denied
  const deniedVoucher = engine.canExecute('CREATE_VOUCHER', {
    voucherDate: '2026-05-10',
    currentDate: '2026-05-31',
  });
  assert.strictEqual(deniedVoucher.allowed, false);
  assert.match(deniedVoucher.reason || '', /Back-Dating Policy Violation/);
});

test('RBAC Enforcement: AUDITOR has read/audit access but is blocked from mutating vouchers/masters', () => {
  const engine = new SecurityEngine();
  engine.login('auditor', 'auditor123');

  // Auditor can inspect reports and audit trail
  assert.strictEqual(engine.canExecute('VIEW_BALANCE_SHEET').allowed, true);
  assert.strictEqual(engine.canExecute('VIEW_PROFIT_LOSS').allowed, true);
  assert.strictEqual(engine.canExecute('VIEW_AUDIT_TRAIL').allowed, true);
  assert.strictEqual(engine.canExecute('VIEW_STATUTORY').allowed, true);

  // Auditor is strictly forbidden from creating, altering, or deleting vouchers and masters
  assert.strictEqual(engine.canExecute('CREATE_VOUCHER').allowed, false);
  assert.strictEqual(engine.canExecute('ALTER_VOUCHER').allowed, false);
  assert.strictEqual(engine.canExecute('DELETE_VOUCHER').allowed, false);
  assert.strictEqual(engine.canExecute('CREATE_MASTER').allowed, false);
  assert.strictEqual(engine.canExecute('ALTER_MASTER').allowed, false);
});

test('Auditor Cryptographic Digital Sign-off: Signature generation & tamper verification', () => {
  const engine = new SecurityEngine();
  engine.login('auditor', 'auditor123');

  const signoffRes = engine.signOffVoucher('vch_sales_001', 'Audited statutory GST compliance: 100% matched with GSTR-1');
  assert.strictEqual(signoffRes.success, true);
  assert.ok(signoffRes.record);

  const signoff = signoffRes.record;
  assert.strictEqual(signoff.entityId, 'vch_sales_001');
  assert.ok(signoff.signatureHash.length === 64);

  // Verification succeeds on authentic record
  assert.strictEqual(engine.verifySignoff(signoff), true);

  // Tampering with notes invalidates cryptographic signature
  const tamperedSignoff = { ...signoff, notes: 'Modified unauthorized note' };
  assert.strictEqual(engine.verifySignoff(tamperedSignoff), false);
});

test('TallyVault Full Pipeline: Encryption, export, and secure restoration', async () => {
  const store = new TallyStore();
  const engine = store.getSecurityEngine();
  const vaultPass = 'TallyVaultKey2026!';

  engine.setVaultPassword(vaultPass, 'Year2026');
  assert.strictEqual(engine.isVaultEnabled(), true);
  assert.strictEqual(engine.verifyVaultPassword(vaultPass), true);
  assert.strictEqual(engine.verifyVaultPassword('WrongPass'), false);

  // Export encrypted backup
  const encryptedBackupJson = await store.exportEncryptedVaultBackup(vaultPass);
  assert.ok(encryptedBackupJson.includes('TALLYVAULT_V1'));

  const envelope = JSON.parse(encryptedBackupJson);
  assert.strictEqual(envelope.magic, 'TALLYVAULT_V1');
  assert.strictEqual(envelope.cipher, 'AES-256-GCM');
  assert.ok(envelope.saltHex);
  assert.ok(envelope.ivHex);
  assert.ok(envelope.ciphertextBase64);

  // Restore with correct password
  const restoreGood = await store.restoreBackup(encryptedBackupJson, vaultPass);
  assert.strictEqual(restoreGood.success, true);

  // Restore with incorrect password fails
  const restoreBad = await store.restoreBackup(encryptedBackupJson, 'InvalidPassword!');
  assert.strictEqual(restoreBad.success, false);
  assert.match(restoreBad.error || '', /Failed to restore backup/);
});

test('Port 9000 Security Gateway: Auth guard, RBAC 403 on Balance Sheet, and Rate Limiting', async () => {
  const store = new TallyStore();
  const sec = store.getSecurityEngine();
  sec.updateConfig({ enableApiSecurity: true });

  const app = createTallyServer(store);
  const server = http.createServer(app);

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Unauthenticated request to /api/company receives 401
    const resUnauth = await fetch(`${baseUrl}/api/company`);
    assert.strictEqual(resUnauth.status, 401);

    // 2. Request with valid Admin API token receives 200
    const adminToken = sec.getConfig().apiKey;
    const resAuth = await fetch(`${baseUrl}/api/company`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(resAuth.status, 200);

    // 3. Login as operator via REST API and get operator session
    const opLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'operator', password: 'operator123' }),
    });
    assert.strictEqual(opLoginRes.status, 200);
    const opBody = await opLoginRes.json();
    const opSessionToken = opBody.session.token;

    // 4. Operator tries to access Balance Sheet -> 403 Forbidden
    const resOpBS = await fetch(`${baseUrl}/api/reports/balance-sheet`, {
      headers: { Authorization: `Bearer ${opSessionToken}` },
    });
    assert.strictEqual(resOpBS.status, 403);
    const opBsErr = await resOpBS.json();
    assert.match(opBsErr.error, /restricted/i);

    // 5. Rate limiting: send rapid requests to verify 429
    let rateLimited = false;
    for (let i = 0; i < 125; i++) {
      const res = await fetch(`${baseUrl}/api/reports/stock-summary`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.status === 429) {
        rateLimited = true;
        break;
      }
    }
    assert.strictEqual(rateLimited, true, 'Rate limiter must return 429 after 120 requests');
  } finally {
    server.close();
  }
});
