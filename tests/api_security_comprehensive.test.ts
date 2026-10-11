import assert from 'node:assert';
import test from 'node:test';
import http from 'node:http';
import { performance } from 'node:perf_hooks';
import { TallyStore } from '../src/core/tallyStore';
import { createTallyServer } from '../src/core/port9000Server';
import { Voucher } from '../src/core/types';

function startTestServer(store: TallyStore): Promise<{ server: http.Server; baseUrl: string }> {
  const app = createTallyServer(store);
  const server = http.createServer(app);
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as any).port;
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

test('API Tester - Port 9000 XML Gateway: Functional Export & XXE Injection Defense', async () => {
  const store = new TallyStore();
  const { server, baseUrl } = await startTestServer(store);

  try {
    // 1. Export Data - List of Ledgers
    const ledgerReq = `<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export Data</TALLYREQUEST><TYPE>Collection</TYPE><ID>List of Ledgers</ID></HEADER><BODY><DESC></DESC></BODY></ENVELOPE>`;
    const resLedgers = await fetch(`${baseUrl}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml' },
      body: ledgerReq,
    });
    assert.strictEqual(resLedgers.status, 200);
    const xmlLedgers = await resLedgers.text();
    assert.ok(xmlLedgers.includes('<LEDGER NAME="'));
    assert.ok(xmlLedgers.includes('<STATUS>1</STATUS>'));

    // 2. Export Data - Day Book
    const dayBookReq = `<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export Data</TALLYREQUEST><TYPE>Collection</TYPE><ID>Day Book</ID></HEADER><BODY><DESC></DESC></BODY></ENVELOPE>`;
    const resDayBook = await fetch(`${baseUrl}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml' },
      body: dayBookReq,
    });
    assert.strictEqual(resDayBook.status, 200);
    const xmlDayBook = await resDayBook.text();
    assert.ok(xmlDayBook.includes('<VOUCHER VCHTYPE='));
    assert.ok(xmlDayBook.includes('<ALLLEDGERENTRIES.LIST>'));

    // 3. Security Defense: XXE External Entity Injection (CWE-611) must be rejected
    const xxePayload = `<?xml version="1.0"?><!DOCTYPE foo [ <!ENTITY xxe SYSTEM "file:///etc/passwd"> ]><ENVELOPE>&xxe;</ENVELOPE>`;
    const resXxe = await fetch(`${baseUrl}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml' },
      body: xxePayload,
    });
    assert.strictEqual(resXxe.status, 400);
    const xxeErrText = await resXxe.text();
    assert.ok(xxeErrText.includes('XML Entity declarations and DTD references are forbidden'));

    // 4. Security Defense: Billion Laughs / DTD Entity expansion must be rejected
    const dtdPayload = `<!DOCTYPE lolz [ <!ENTITY lol "lol"> ]><ENVELOPE><DATA>&lol;</DATA></ENVELOPE>`;
    const resDtd = await fetch(`${baseUrl}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml' },
      body: dtdPayload,
    });
    assert.strictEqual(resDtd.status, 400);

    // 5. XML Gateway Auth Defense when API security is enabled
    store.getSecurityEngine().updateConfig({ enableApiSecurity: true });
    const resUnauth = await fetch(`${baseUrl}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml' },
      body: ledgerReq,
    });
    assert.strictEqual(resUnauth.status, 401);

    // Authorized request with API token succeeds
    const adminKey = store.getSecurityEngine().getConfig().apiKey;
    const resAuth = await fetch(`${baseUrl}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml',
        'x-tally-token': adminKey,
      },
      body: ledgerReq,
    });
    assert.strictEqual(resAuth.status, 200);

    // 6. Liveness Probe (GET /api/health)
    const resHealth = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(resHealth.status, 200);
    const healthData = await resHealth.json();
    assert.strictEqual(healthData.status, 'UP');
    assert.strictEqual(healthData.service, 'TallyPrime Core Gateway & REST Engine');
    assert.ok(healthData.vouchersCount >= 0);
    assert.ok(healthData.ledgersCount > 0);
  } finally {
    server.close();
  }
});

test('API Tester - Authentication & Session Lifecycle (/api/auth/*)', async () => {
  const store = new TallyStore();
  const { server, baseUrl } = await startTestServer(store);

  try {
    // 1. Correct credentials return 200 and session token
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    });
    assert.strictEqual(loginRes.status, 200);
    const loginData = await loginRes.json();
    assert.strictEqual(loginData.success, true);
    assert.ok(loginData.session?.token);
    assert.strictEqual(loginData.session.user.role, 'ADMIN');

    // 2. Incorrect credentials return 401
    const badLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'incorrectPassword' }),
    });
    assert.strictEqual(badLoginRes.status, 401);

    // 3. Brute force defense: consecutive failed attempts
    let lockoutOccurred = false;
    for (let i = 0; i < 4; i++) {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'operator', password: 'wrongPassword' }),
      });
      const data = await res.json();
      if (data.lockedUntilSeconds) {
        lockoutOccurred = true;
        break;
      }
    }
    assert.strictEqual(lockoutOccurred, true, 'Account lockout must trigger on 3 failed attempts');

    // 4. Session inspection and logout
    const sessionRes = await fetch(`${baseUrl}/api/auth/session`);
    assert.strictEqual(sessionRes.status, 200);

    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, { method: 'POST' });
    assert.strictEqual(logoutRes.status, 200);
    const logoutData = await logoutRes.json();
    assert.strictEqual(logoutData.success, true);
  } finally {
    server.close();
  }
});

test('API Tester - RBAC Report Isolation (Broken Function Level Authorization - BFLA Defense)', async () => {
  const store = new TallyStore();
  store.getSecurityEngine().updateConfig({ enableApiSecurity: true });
  const { server, baseUrl } = await startTestServer(store);

  try {
    // Authenticate as Operator (DATA_ENTRY)
    const opLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'operator', password: 'operator123' }),
    });
    const opToken = (await opLogin.json()).session.token;

    // Authenticate as Auditor (AUDITOR)
    const audLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'auditor', password: 'auditor123' }),
    });
    const audToken = (await audLogin.json()).session.token;

    // Authenticate as Admin (ADMIN)
    const adminToken = store.getSecurityEngine().getConfig().apiKey;

    // 1. Balance Sheet: Operator -> 403, Auditor -> 200, Admin -> 200
    const resOpBS = await fetch(`${baseUrl}/api/reports/balance-sheet`, {
      headers: { Authorization: `Bearer ${opToken}` },
    });
    assert.strictEqual(resOpBS.status, 403);

    const resAudBS = await fetch(`${baseUrl}/api/reports/balance-sheet`, {
      headers: { Authorization: `Bearer ${audToken}` },
    });
    assert.strictEqual(resAudBS.status, 200);

    const resAdminBS = await fetch(`${baseUrl}/api/reports/balance-sheet`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(resAdminBS.status, 200);

    // 2. Profit & Loss: Operator -> 403, Admin -> 200
    const resOpPL = await fetch(`${baseUrl}/api/reports/profit-loss`, {
      headers: { Authorization: `Bearer ${opToken}` },
    });
    assert.strictEqual(resOpPL.status, 403);

    const resAdminPL = await fetch(`${baseUrl}/api/reports/profit-loss`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(resAdminPL.status, 200);

    // 3. Ratio Analysis: Operator -> 403, Admin -> 200
    const resOpRatio = await fetch(`${baseUrl}/api/reports/ratio-analysis`, {
      headers: { Authorization: `Bearer ${opToken}` },
    });
    assert.strictEqual(resOpRatio.status, 403);

    // 4. Audit Trail: Operator -> 403, Auditor -> 200, Admin -> 200
    const resOpAudit = await fetch(`${baseUrl}/api/audit-trail`, {
      headers: { Authorization: `Bearer ${opToken}` },
    });
    assert.strictEqual(resOpAudit.status, 403);

    const resAudAudit = await fetch(`${baseUrl}/api/audit-trail`, {
      headers: { Authorization: `Bearer ${audToken}` },
    });
    assert.strictEqual(resAudAudit.status, 200);

    // 5. Stock Summary is accessible to all authenticated roles
    const resOpStock = await fetch(`${baseUrl}/api/reports/stock-summary`, {
      headers: { Authorization: `Bearer ${opToken}` },
    });
    assert.strictEqual(resOpStock.status, 200);
  } finally {
    server.close();
  }
});

test('API Tester - Voucher Postings, Double-Entry Validation & Back-Dating Policy', async () => {
  const store = new TallyStore();
  store.getSecurityEngine().updateConfig({ enableApiSecurity: true });
  const { server, baseUrl } = await startTestServer(store);

  try {
    // 1. Authenticate Operator
    const opLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'operator', password: 'operator123' }),
    });
    const opToken = (await opLogin.json()).session.token;

    // 2. Authenticate Auditor
    const audLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'auditor', password: 'auditor123' }),
    });
    const audToken = (await audLogin.json()).session.token;

    const validVoucher: Voucher = {
      id: 'vch_api_test_01',
      voucherNumber: 'API/REC/001',
      voucherType: 'RECEIPT',
      date: new Date().toISOString().substring(0, 10), // Today's date
      invoicingMode: 'AS_VOUCHER',
      totalVoucherAmount: 10000,
      ledgerEntries: [
        { id: '1', ledgerId: 'led_bank_hdfc', ledgerName: 'HDFC Bank', amount: 10000 },
        { id: '2', ledgerId: 'led_debtor_sharma', ledgerName: 'Sharma Electronics', amount: -10000 },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'operator',
    };

    // Operator can create current voucher -> 200 OK
    const resOpCreate = await fetch(`${baseUrl}/api/vouchers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${opToken}`,
      },
      body: JSON.stringify(validVoucher),
    });
    assert.strictEqual(resOpCreate.status, 200);

    // Auditor CANNOT create voucher -> 403 Forbidden
    const resAudCreate = await fetch(`${baseUrl}/api/vouchers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${audToken}`,
      },
      body: JSON.stringify({ ...validVoucher, id: 'vch_api_aud_01' }),
    });
    assert.strictEqual(resAudCreate.status, 403);

    // Operator Back-dating policy: voucher older than 7 days -> 403 Forbidden
    const backDatedDate = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().substring(0, 10);
    const resBackdated = await fetch(`${baseUrl}/api/vouchers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${opToken}`,
      },
      body: JSON.stringify({
        ...validVoucher,
        id: 'vch_api_backdated',
        voucherNumber: 'API/OLD/001',
        date: backDatedDate,
      }),
    });
    assert.strictEqual(resBackdated.status, 403);
    const backdateErr = await resBackdated.json();
    assert.match(backdateErr.error, /Back-Dating Policy Violation/);

    // Double-entry validation: Imbalanced voucher -> 400 Bad Request
    const imbalancedVoucher = {
      ...validVoucher,
      id: 'vch_imbalanced',
      ledgerEntries: [
        { id: '1', ledgerId: 'led_bank_hdfc', ledgerName: 'HDFC Bank', amount: 10000 },
        { id: '2', ledgerId: 'led_debtor_sharma', ledgerName: 'Sharma Electronics', amount: -9000 }, // Imbalance!
      ],
    };
    const adminToken = store.getSecurityEngine().getConfig().apiKey;
    const resImbalanced = await fetch(`${baseUrl}/api/vouchers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(imbalancedVoucher),
    });
    assert.strictEqual(resImbalanced.status, 400);

    // 5. REST Master Creation (POST /api/ledgers): Operator blocked -> 403, Admin -> 201
    const newLedger = {
      id: 'led_test_api_ledger',
      name: 'API Cloud Infrastructure Exp',
      groupId: 'grp_indirect_expenses',
      openingBalance: 0,
      currency: 'INR',
    };
    const resOpLedger = await fetch(`${baseUrl}/api/ledgers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${opToken}`,
      },
      body: JSON.stringify(newLedger),
    });
    assert.strictEqual(resOpLedger.status, 403);

    const resAdminLedger = await fetch(`${baseUrl}/api/ledgers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(newLedger),
    });
    assert.strictEqual(resAdminLedger.status, 201);
  } finally {
    server.close();
  }
});

test('API Tester - Security Administration & Auditor Sign-off Endpoints', async () => {
  const store = new TallyStore();
  store.getSecurityEngine().updateConfig({ enableApiSecurity: true });
  const { server, baseUrl } = await startTestServer(store);

  try {
    const adminToken = store.getSecurityEngine().getConfig().apiKey;

    const opLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'operator', password: 'operator123' }),
    });
    const opToken = (await opLogin.json()).session.token;

    const audLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'auditor', password: 'auditor123' }),
    });
    const audToken = (await audLogin.json()).session.token;

    // 1. User Management: Operator blocked -> 403, Admin permitted -> 200
    const resOpUsers = await fetch(`${baseUrl}/api/security/users`, {
      headers: { Authorization: `Bearer ${opToken}` },
    });
    assert.strictEqual(resOpUsers.status, 403);

    const resAdminUsers = await fetch(`${baseUrl}/api/security/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(resAdminUsers.status, 200);

    // 2. Add New User: Admin -> 200
    const resAddUser = await fetch(`${baseUrl}/api/security/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        username: 'intern_accountant',
        fullName: 'Trainee Accountant',
        role: 'DATA_ENTRY',
        password: 'internPassword123',
        allowedBackDatedDays: 2,
      }),
    });
    assert.strictEqual(resAddUser.status, 200);

    // 3. Auditor Sign-off: Operator blocked -> 403, Auditor permitted -> 200
    const resOpSignoff = await fetch(`${baseUrl}/api/security/signoff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${opToken}`,
      },
      body: JSON.stringify({ voucherId: 'vch_sales_001', notes: 'Unauthorized signoff attempt' }),
    });
    assert.strictEqual(resOpSignoff.status, 403);

    const resAudSignoff = await fetch(`${baseUrl}/api/security/signoff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${audToken}`,
      },
      body: JSON.stringify({ voucherId: 'vch_sales_001', notes: 'Verified GST B2B tax invoice against supplier GSTR-1' }),
    });
    assert.strictEqual(resAudSignoff.status, 200);

    // Retrieve signoffs
    const resListSignoffs = await fetch(`${baseUrl}/api/security/signoffs`, {
      headers: { Authorization: `Bearer ${audToken}` },
    });
    assert.strictEqual(resListSignoffs.status, 200);
    const signoffs = await resListSignoffs.json();
    assert.ok(signoffs.signoffs.length > 0);

    // 4. Secure Defaults Verification: Newly created DATA_ENTRY inherits policy restrictions
    const internLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'intern_accountant', password: 'internPassword123' }),
    });
    assert.strictEqual(internLogin.status, 200);
    const internToken = (await internLogin.json()).session.token;

    // Intern must be blocked from Balance Sheet via inherited secure defaults
    const resInternBS = await fetch(`${baseUrl}/api/reports/balance-sheet`, {
      headers: { Authorization: `Bearer ${internToken}` },
    });
    assert.strictEqual(resInternBS.status, 403);

    // 5. Password Change Security: Operator cannot change admin password -> 403
    const resOpPwd = await fetch(`${baseUrl}/api/security/users/usr_admin/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${opToken}`,
      },
      body: JSON.stringify({ newPassword: 'HackedPassword123!' }),
    });
    assert.strictEqual(resOpPwd.status, 403);

    // 6. User Deletion Security: Operator blocked -> 403, Admin succeeds -> 200
    const addedUserData = await resAddUser.json();
    const internUserId = addedUserData.user.id;

    const resOpDel = await fetch(`${baseUrl}/api/security/users/${internUserId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${opToken}` },
    });
    assert.strictEqual(resOpDel.status, 403);

    const resAdminDel = await fetch(`${baseUrl}/api/security/users/${internUserId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(resAdminDel.status, 200);

    // Deleting only remaining admin is blocked
    const resDelAdmin = await fetch(`${baseUrl}/api/security/users/usr_admin`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(resDelAdmin.status, 400);
  } finally {
    server.close();
  }
});

test('API Tester - Fuzzing, Malformed Inputs & Error Robustness', async () => {
  const store = new TallyStore();
  const { server, baseUrl } = await startTestServer(store);

  try {
    // 1. Malformed JSON payload -> 400 Bad Request (handled safely without crash)
    const resMalformedJson = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"username": "admin", "password": invalid_json_syntax',
    });
    assert.strictEqual(resMalformedJson.status, 400);

    // 2. Malformed Basic auth header (corrupted base64)
    const resMalformedBasic = await fetch(`${baseUrl}/api/company`, {
      headers: { Authorization: 'Basic !!!invalid-base64!!!' },
    });
    assert.ok(resMalformedBasic.status === 400 || resMalformedBasic.status === 401);

    // 3. Nonexistent endpoint -> 404 Not Found
    const res404 = await fetch(`${baseUrl}/api/nonexistent-route`);
    assert.strictEqual(res404.status, 404);
  } finally {
    server.close();
  }
});

test('API Tester - Performance SLA & Concurrency Benchmark (<200ms latency target)', async () => {
  const store = new TallyStore();
  const adminToken = store.getSecurityEngine().getConfig().apiKey;
  const { server, baseUrl } = await startTestServer(store);

  try {
    const concurrentRequests = 50;
    const start = performance.now();

    const promises = Array(concurrentRequests)
      .fill(null)
      .map(() =>
        fetch(`${baseUrl}/api/reports/stock-summary`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );

    const responses = await Promise.all(promises);
    const elapsed = performance.now() - start;
    const avgLatency = elapsed / concurrentRequests;

    // Verify all requests succeeded
    const all200 = responses.every((r) => r.status === 200);
    assert.strictEqual(all200, true, 'All concurrent API requests must return 200 OK');

    // Verify SLA performance: average latency under 200ms
    assert.ok(
      avgLatency < 200,
      `Average latency (${avgLatency.toFixed(2)}ms) must be well under 200ms SLA`
    );
  } finally {
    server.close();
  }
});
