import assert from 'node:assert';
import test from 'node:test';
import { AuditEngine } from '../src/core/auditEngine';
import { pureSha256, sha256 } from '../src/core/cryptoUtils';

test('MCA Audit Trail records immutable events with valid cryptographic hash chain', () => {
  const audit = new AuditEngine();

  audit.recordChange({
    entityType: 'COMPANY',
    entityId: 'c1',
    action: 'CREATE',
    diff: [{ field: 'name', oldValue: null, newValue: 'Acme' }],
  });

  audit.recordChange({
    entityType: 'VOUCHER',
    entityId: 'v1',
    action: 'CREATE',
    diff: [{ field: 'amount', oldValue: null, newValue: 1000 }],
  });

  audit.recordChange({
    entityType: 'VOUCHER',
    entityId: 'v1',
    action: 'ALTER',
    diff: [{ field: 'amount', oldValue: 1000, newValue: 1200 }],
  });

  const logs = audit.getLogs();
  assert.strictEqual(logs.length, 3);

  // Verification of cryptographic chain
  const integrity = audit.verifyIntegrity();
  assert.strictEqual(integrity.isValid, true);

  // Verification of pure JS SHA-256 fallback algorithm against official NIST test vectors & UTF-8
  assert.strictEqual(
    pureSha256(''),
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  );
  assert.strictEqual(
    pureSha256('abc'),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
  );
  assert.strictEqual(
    pureSha256('The quick brown fox jumps over the lazy dog'),
    'd7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592'
  );
  // Verify Unicode / UTF-8 handling (e.g. Indian Rupee symbol ₹)
  assert.strictEqual(pureSha256('Acme ₹ 50,000'), sha256('Acme ₹ 50,000'));
  assert.ok(pureSha256('₹').length === 64);
});

test('MCA Audit Trail detects unauthorized tampering', () => {
  const audit = new AuditEngine();

  audit.recordChange({
    entityType: 'VOUCHER',
    entityId: 'v1',
    action: 'CREATE',
    diff: [{ field: 'amount', oldValue: null, newValue: 5000 }],
  });

  audit.recordChange({
    entityType: 'VOUCHER',
    entityId: 'v2',
    action: 'CREATE',
    diff: [{ field: 'amount', oldValue: null, newValue: 8000 }],
  });

  // Maliciously tamper with first entry's diff
  const logs = audit.getLogs();
  (logs[0].diff[0] as any).newValue = 999999;

  // Re-instantiate with tampered log
  const tamperedAudit = new AuditEngine(logs);
  const integrity = tamperedAudit.verifyIntegrity();
  assert.strictEqual(integrity.isValid, false);
  assert.strictEqual(integrity.corruptedAtId, logs[0].id);
});
