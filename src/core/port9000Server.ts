import express from 'express';
import cors from 'cors';
import { TallyStore, globalTallyStore } from './tallyStore';
import { Voucher } from './types';

export function createTallyServer(store: TallyStore = globalTallyStore) {
  const app = express();
  app.use(cors());

  // Technical Security Headers (OWASP, Nishant Chahar Final Security Check)
  app.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  // Serve static compliance & legal pages (privacy, terms, cookies, refunds)
  app.use(express.static('public'));

  app.use(express.text({ type: ['text/xml', 'application/xml', 'text/plain'], limit: '2mb' }));
  app.use(express.json({ limit: '2mb' }));

  // In-memory rate limiter (Rolling 1-minute window, max 120 req/min)
  const ipRequestCounts = new Map<string, { count: number; resetTime: number }>();
  app.use((req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const now = Date.now();
    const record = ipRequestCounts.get(ip);
    if (!record || record.resetTime <= now) {
      ipRequestCounts.set(ip, { count: 1, resetTime: now + 60000 });
      return next();
    }
    record.count++;
    if (record.count > 120) {
      return res.status(429).json({
        error: 'Too Many Requests: Rate limit exceeded (max 120 requests/minute per client).',
      });
    }
    next();
  });

  // API Authentication Middleware
  const authMiddleware: express.RequestHandler = (req, res, next) => {
    const security = store.getSecurityEngine();
    const authHeader = req.headers.authorization;
    const apiKeyHeader = (req.headers['x-tally-token'] as string) || authHeader;
    const access = security.verifyApiAccess(authHeader, apiKeyHeader);
    if (!access.success) {
      return res.status(access.status || 401).json({ error: access.error });
    }
    (req as any).apiUser = access.user;
    next();
  };

  // 1. Standard Port 9000 Tally XML Gateway
  app.post('/', (req, res) => {
    const rawXml = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    // XXE & DTD External Entity Injection Defense (CWE-611)
    if (
      /<!DOCTYPE/i.test(rawXml) ||
      /<!ENTITY/i.test(rawXml) ||
      /SYSTEM\s+["']/i.test(rawXml) ||
      /PUBLIC\s+["']/i.test(rawXml)
    ) {
      res.set('Content-Type', 'text/xml');
      return res.status(400).send(
        `<ENVELOPE><HEADER><STATUS>0</STATUS></HEADER><BODY><DATA>ERROR: 400 Bad Request - XML Entity declarations and DTD references are forbidden for security.</DATA></BODY></ENVELOPE>`
      );
    }

    const security = store.getSecurityEngine();
    if (security.getConfig().enableApiSecurity) {
      const authHeader = req.headers.authorization;
      const apiKeyHeader = req.headers['x-tally-token'] as string;
      const access = security.verifyApiAccess(authHeader, apiKeyHeader);
      if (!access.success) {
        res.set('Content-Type', 'text/xml');
        return res.status(401).send(
          `<ENVELOPE><HEADER><STATUS>0</STATUS></HEADER><BODY><DATA>ERROR: 401 Unauthorized - Valid Tally API credentials required</DATA></BODY></ENVELOPE>`
        );
      }
    }

    if (rawXml.includes('Export Data') || rawXml.includes('Export')) {
      // Handle Report / Master Export requests
      if (rawXml.includes('List of Ledgers') || rawXml.includes('Ledger')) {
        const ledgers = store.getLedgers();
        const xmlResponse = `
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <STATUS>1</STATUS>
  </HEADER>
  <BODY>
    <DATA>
      <COLLECTION>
        ${ledgers
          .map(
            (l) => `
        <LEDGER NAME="${l.name}">
          <NAME>${l.name}</NAME>
          <PARENT>${l.groupId}</PARENT>
          <OPENINGBALANCE>${l.openingBalance}</OPENINGBALANCE>
          <CURRENCY>${l.currency}</CURRENCY>
        </LEDGER>`
          )
          .join('\n')}
      </COLLECTION>
    </DATA>
  </BODY>
</ENVELOPE>`.trim();
        res.set('Content-Type', 'text/xml');
        return res.send(xmlResponse);
      }

      if (rawXml.includes('Day Book') || rawXml.includes('Voucher')) {
        const vouchers = store.getVouchers();
        const xmlResponse = `
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <STATUS>1</STATUS>
  </HEADER>
  <BODY>
    <DATA>
      <COLLECTION>
        ${vouchers
          .map(
            (v) => `
        <VOUCHER VCHTYPE="${v.voucherType}" ACTION="Create">
          <DATE>${v.date.replace(/-/g, '')}</DATE>
          <VOUCHERNUMBER>${v.voucherNumber}</VOUCHERNUMBER>
          <PARTYLEDGERNAME>${v.partyName || ''}</PARTYLEDGERNAME>
          <NARRATION>${v.narration || ''}</NARRATION>
          ${v.ledgerEntries
            .map(
              (e) => `
          <ALLLEDGERENTRIES.LIST>
            <LEDGERNAME>${e.ledgerName}</LEDGERNAME>
            <ISDEEMEDPOSITIVE>${e.amount > 0 ? 'Yes' : 'No'}</ISDEEMEDPOSITIVE>
            <AMOUNT>${-e.amount}</AMOUNT>
          </ALLLEDGERENTRIES.LIST>`
            )
            .join('\n')}
        </VOUCHER>`
          )
          .join('\n')}
      </COLLECTION>
    </DATA>
  </BODY>
</ENVELOPE>`.trim();
        res.set('Content-Type', 'text/xml');
        return res.send(xmlResponse);
      }

      // Default XML Response for other reports
      const xmlResponse = `
<ENVELOPE>
  <HEADER>
    <STATUS>1</STATUS>
  </HEADER>
  <BODY>
    <DATA>
      <COMPANYNAME>${store.getCompany().name}</COMPANYNAME>
      <TOTALVOUCHERS>${store.getVouchers().length}</TOTALVOUCHERS>
    </DATA>
  </BODY>
</ENVELOPE>`.trim();
      res.set('Content-Type', 'text/xml');
      return res.send(xmlResponse);
    }

    // Default response
    res.set('Content-Type', 'text/xml');
    res.send('<ENVELOPE><HEADER><STATUS>1</STATUS></HEADER><BODY><DATA>OK</DATA></BODY></ENVELOPE>');
  });

  // 1b. Health & Status Check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'UP',
      service: 'TallyPrime Core Gateway & REST Engine',
      port: 9000,
      timestamp: new Date().toISOString(),
      company: store.getCompany().name,
      vouchersCount: store.getVouchers().length,
      ledgersCount: store.getLedgers().length,
    });
  });

  // 2. Authentication & Session REST API
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    const result = store.getSecurityEngine().login(username, password);
    if (!result.success) {
      return res.status(401).json({ error: result.error, lockedUntilSeconds: result.lockedUntilSeconds });
    }
    res.json({
      success: true,
      token: result.session?.token,
      session: result.session,
    });
  });

  app.post('/api/auth/logout', (req, res) => {
    store.getSecurityEngine().logout();
    res.json({ success: true, message: 'Logged out successfully' });
  });

  app.get('/api/auth/session', authMiddleware, (req, res) => {
    const apiUser = (req as any).apiUser;
    res.json({ session: { user: apiUser } });
  });

  // 3. Authenticated REST Endpoints
  app.get('/api/company', authMiddleware, (req, res) => {
    res.json(store.getCompany());
  });

  app.get('/api/ledgers', authMiddleware, (req, res) => {
    res.json(store.getLedgers());
  });

  app.post('/api/ledgers', authMiddleware, (req, res) => {
    const apiUser = (req as any).apiUser;
    const ledger = req.body;
    if (!ledger?.name || !ledger?.groupId) {
      return res.status(400).json({ error: 'Ledger name and groupId are required.' });
    }
    const result = store.addLedger(ledger, apiUser);
    if (!result.success) {
      const isForbidden = result.error?.includes('Access Denied') || result.error?.includes('restricted');
      return res.status(isForbidden ? 403 : 400).json({ error: result.error });
    }
    res.status(201).json({ success: true, ledger });
  });

  app.get('/api/vouchers', authMiddleware, (req, res) => {
    res.json(store.getVouchers());
  });

  app.post('/api/vouchers', authMiddleware, (req, res) => {
    const apiUser = (req as any).apiUser;
    if (apiUser?.disallowedActions?.includes('CREATE_VOUCHER')) {
      return res.status(403).json({ error: `Access Denied: Role ${apiUser.role} cannot create vouchers.` });
    }

    const vch: Voucher = req.body;
    const result = store.addVoucher(vch, apiUser);
    if (!result.success) {
      const isForbidden =
        result.error?.includes('Access Denied') ||
        result.error?.includes('Back-Dating') ||
        result.error?.includes('restricted');
      return res.status(isForbidden ? 403 : 400).json({ error: result.error });
    }
    res.json({ success: true, voucher: vch });
  });

  // Protected Financial Reports with RBAC guards
  app.get('/api/reports/balance-sheet', authMiddleware, (req, res) => {
    const apiUser = (req as any).apiUser;
    if (apiUser?.role === 'DATA_ENTRY' || apiUser?.disallowedReports?.includes('balance_sheet')) {
      return res.status(403).json({ error: 'Access Denied: Role DATA_ENTRY is restricted from viewing Balance Sheet.' });
    }
    res.json(store.getBalanceSheet());
  });

  app.get('/api/reports/profit-loss', authMiddleware, (req, res) => {
    const apiUser = (req as any).apiUser;
    if (apiUser?.role === 'DATA_ENTRY' || apiUser?.disallowedReports?.includes('profit_loss')) {
      return res.status(403).json({ error: 'Access Denied: Role DATA_ENTRY is restricted from viewing Profit & Loss Account.' });
    }
    res.json(store.getProfitAndLoss());
  });

  app.get('/api/reports/stock-summary', authMiddleware, (req, res) => {
    res.json(store.getStockSummary());
  });

  app.get('/api/reports/ratio-analysis', authMiddleware, (req, res) => {
    const apiUser = (req as any).apiUser;
    if (apiUser?.role === 'DATA_ENTRY' || apiUser?.disallowedReports?.includes('ratio_analysis')) {
      return res.status(403).json({ error: 'Access Denied: Role DATA_ENTRY is restricted from viewing Ratio Analysis.' });
    }
    res.json(store.getRatioAnalysis());
  });

  app.get('/api/audit-trail', authMiddleware, (req, res) => {
    const apiUser = (req as any).apiUser;
    if (apiUser?.role === 'DATA_ENTRY') {
      return res.status(403).json({ error: 'Access Denied: MCA Audit Trail inspection is restricted for DATA_ENTRY role.' });
    }
    res.json(store.getAuditLogs());
  });

  // 4. Security & User Management Endpoints (Admin Only)
  app.get('/api/security/users', authMiddleware, (req, res) => {
    const apiUser = (req as any).apiUser;
    if (apiUser?.role !== 'ADMIN' && apiUser?.role !== 'OWNER') {
      return res.status(403).json({ error: 'Access Denied: Administrator role required.' });
    }
    res.json({ users: store.getSecurityEngine().getUsers() });
  });

  app.post('/api/security/users', authMiddleware, (req, res) => {
    const apiUser = (req as any).apiUser;
    if (apiUser?.role !== 'ADMIN' && apiUser?.role !== 'OWNER') {
      return res.status(403).json({ error: 'Access Denied: Administrator role required.' });
    }
    const result = store.getSecurityEngine().addUser(req.body, apiUser);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.json(result);
  });

  app.delete('/api/security/users/:id', authMiddleware, (req, res) => {
    const apiUser = (req as any).apiUser;
    if (apiUser?.role !== 'ADMIN' && apiUser?.role !== 'OWNER') {
      return res.status(403).json({ error: 'Access Denied: Administrator role required.' });
    }
    const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = store.getSecurityEngine().deleteUser(userId, apiUser);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.json(result);
  });

  app.post('/api/security/users/:id/change-password', authMiddleware, (req, res) => {
    const apiUser = (req as any).apiUser;
    const { newPassword } = req.body;
    const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = store.getSecurityEngine().changePassword(userId, newPassword, apiUser);
    if (!result.success) {
      const isForbidden = result.error?.includes('Access Denied');
      return res.status(isForbidden ? 403 : 400).json({ error: result.error });
    }
    res.json(result);
  });

  app.get('/api/security/config', authMiddleware, (req, res) => {
    const apiUser = (req as any).apiUser;
    if (apiUser?.role !== 'ADMIN' && apiUser?.role !== 'OWNER') {
      return res.status(403).json({ error: 'Access Denied: Administrator role required to view security configuration.' });
    }
    res.json(store.getSecurityEngine().getConfig());
  });

  app.post('/api/security/config', authMiddleware, (req, res) => {
    const apiUser = (req as any).apiUser;
    if (apiUser?.role !== 'ADMIN' && apiUser?.role !== 'OWNER') {
      return res.status(403).json({ error: 'Access Denied: Administrator role required.' });
    }
    const updated = store.getSecurityEngine().updateConfig(req.body);
    res.json({ success: true, config: updated });
  });

  // 5. Auditor Sign-off Endpoints (Auditor Only)
  app.post('/api/security/signoff', authMiddleware, (req, res) => {
    const apiUser = (req as any).apiUser;
    if (apiUser?.role !== 'AUDITOR' && apiUser?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access Denied: Statutory Auditor role required to sign off records.' });
    }
    const { voucherId, notes } = req.body;
    const result = store.getSecurityEngine().signOffVoucher(voucherId, notes, apiUser);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.json(result);
  });

  app.get('/api/security/signoffs', authMiddleware, (req, res) => {
    res.json({ signoffs: store.getSecurityEngine().getAllSignoffs() });
  });

  // Global Error Handler (CWE-209: Prevent stack trace leakage)
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    const status = err.status || (err.name === 'SyntaxError' ? 400 : 500);
    res.status(status).json({
      error: err.message || 'An unexpected error occurred processing the request.',
    });
  });

  return app;
}
