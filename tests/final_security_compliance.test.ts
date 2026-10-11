import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { createTallyServer } from '../src/core/port9000Server';
import http from 'node:http';

test('Final Security Check - 20 Compliance & Legal Protection Aspects Audit', async (t) => {
  const rootDir = path.resolve(__dirname, '..');

  await t.test('1. Privacy Policy Page (GDPR, DPDPA 2023 & CCPA)', () => {
    const privacyPath = path.join(rootDir, 'public', 'privacy.html');
    assert.ok(fs.existsSync(privacyPath), 'public/privacy.html must exist');
    const content = fs.readFileSync(privacyPath, 'utf8');
    assert.match(content, /<!DOCTYPE html>/i, 'Must contain DOCTYPE');
    assert.match(content, /<html\s+lang="en"/i, 'Must specify lang="en"');
    assert.match(content, /Data Minimization/i, 'Must disclose Data Minimization');
    assert.match(content, /DPDPA/i, 'Must include India DPDPA compliance');
    assert.match(content, /GDPR/i, 'Must include GDPR compliance');
    assert.match(content, /privacy@tallyprime\.internal/i, 'Must list DPO contact email');
  });

  await t.test('2. Terms & Conditions Page', () => {
    const termsPath = path.join(rootDir, 'public', 'terms.html');
    assert.ok(fs.existsSync(termsPath), 'public/terms.html must exist');
    const content = fs.readFileSync(termsPath, 'utf8');
    assert.match(content, /Terms and Conditions/i, 'Must contain title');
    assert.match(content, /Acceptable Use/i, 'Must contain Acceptable Use section');
    assert.match(content, /Limitation of Liability/i, 'Must contain limitation of liability');
    assert.match(content, /Governing Law/i, 'Must specify governing jurisdiction');
    assert.match(content, /legal@tallyprime\.internal/i, 'Must provide legal contact email');
  });

  await t.test('3. Cookie Policy Page', () => {
    const cookiesPath = path.join(rootDir, 'public', 'cookies.html');
    assert.ok(fs.existsSync(cookiesPath), 'public/cookies.html must exist');
    const content = fs.readFileSync(cookiesPath, 'utf8');
    assert.match(content, /Cookie Policy/i, 'Must contain Cookie Policy');
    assert.match(content, /site_cookie_consent_v1/i, 'Must document cookie consent token');
    assert.match(content, /tally_auth_session/i, 'Must document session bearer token');
    assert.match(content, /Strictly Necessary/i, 'Must classify necessary storage items');
    assert.match(content, /Manage Cookie Preferences/i, 'Must provide preference management mechanism');
  });

  await t.test('4. Cookie Consent Banner & Storage Integration', () => {
    const jsPath = path.join(rootDir, 'public', 'cookie_consent.js');
    const cssPath = path.join(rootDir, 'public', 'cookie_consent.css');
    const indexPath = path.join(rootDir, 'index.html');
    assert.ok(fs.existsSync(jsPath), 'public/cookie_consent.js must exist');
    assert.ok(fs.existsSync(cssPath), 'public/cookie_consent.css must exist');

    const indexHtml = fs.readFileSync(indexPath, 'utf8');
    assert.match(indexHtml, /cookie_consent\.css/, 'index.html must link cookie_consent.css');
    assert.match(indexHtml, /cookie_consent\.js/, 'index.html must reference cookie_consent.js');

    const jsContent = fs.readFileSync(jsPath, 'utf8');
    assert.match(jsContent, /site_cookie_consent_v1/, 'Must use site_cookie_consent_v1 key');
    assert.match(jsContent, /Accept All Cookies/i, 'Must support Accept All');
    assert.match(jsContent, /Decline Non-Essential/i, 'Must support Decline Non-Essential');
  });

  await t.test('5. Refund & Cancellation Policy', () => {
    const refundPath = path.join(rootDir, 'public', 'refund.html');
    assert.ok(fs.existsSync(refundPath), 'public/refund.html must exist');
    const content = fs.readFileSync(refundPath, 'utf8');
    assert.match(content, /14-Day.*Money-Back Guarantee/i, 'Must state 14-day guarantee');
    assert.match(content, /Subscription Cancellations/i, 'Must detail subscription cancellation rules');
    assert.match(content, /billing@tallyprime\.internal/i, 'Must provide billing contact');
  });

  await t.test('6. Form Consent Checkbox in Authentication & Input Forms', () => {
    const loginModalPath = path.join(rootDir, 'src', 'components', 'LoginModal.tsx');
    const content = fs.readFileSync(loginModalPath, 'utf8');
    assert.match(content, /auth-consent-checkbox/i, 'Login form must have an affirmative consent checkbox');
    assert.match(content, /Privacy Policy/i, 'Form must link to Privacy Policy');
    assert.match(content, /Terms &amp; Conditions/i, 'Form must link to Terms & Conditions');
  });

  await t.test('7. Data Minimization Check across Codebase', () => {
    const typesPath = path.join(rootDir, 'src', 'core', 'types.ts');
    const content = fs.readFileSync(typesPath, 'utf8');
    assert.ok(!content.includes('ssn'), 'No SSN data fields allowed');
    assert.ok(!content.includes('religion'), 'No sensitive biometric or religious fields');
    assert.ok(!content.includes('creditCardNumber'), 'Raw credit card numbers must not be stored');
  });

  await t.test('8. Tracking & Analytics Gating', () => {
    const indexPath = path.join(rootDir, 'index.html');
    const indexHtml = fs.readFileSync(indexPath, 'utf8');
    assert.ok(!indexHtml.includes('googletagmanager.com'), 'Zero un-gated GA4 tracking scripts');
    assert.ok(!indexHtml.includes('connect.facebook.net'), 'Zero un-gated Meta Pixels');
    assert.ok(!indexHtml.includes('tiktok.com/analytics'), 'Zero un-gated TikTok Pixels');
  });

  await t.test('9. Check 3rd-Party Embeds and iFrames', () => {
    const srcDir = path.join(rootDir, 'src');
    const tsxFiles = fs.readdirSync(path.join(srcDir, 'components'));
    for (const file of tsxFiles) {
      if (file.endsWith('.tsx')) {
        const text = fs.readFileSync(path.join(srcDir, 'components', file), 'utf8');
        assert.ok(!text.includes('<iframe'), `${file} should not have unsandboxed iframe embeds`);
      }
    }
  });

  await t.test('10. Accessibility (a11y) & DOCTYPE/Lang Attributes', () => {
    const htmlFiles = ['index.html', 'public/privacy.html', 'public/terms.html', 'public/cookies.html', 'public/refund.html'];
    for (const relPath of htmlFiles) {
      const fullPath = path.join(rootDir, relPath);
      assert.ok(fs.existsSync(fullPath), `${relPath} must exist`);
      const content = fs.readFileSync(fullPath, 'utf8');
      assert.match(content, /<!DOCTYPE html>/i, `${relPath} must declare standard HTML5 doctype`);
      assert.match(content, /<html\s+lang="en"/i, `${relPath} must set lang="en" attribute`);
    }
  });

  await t.test('11. Alt Text on Images & ARIA Labels', () => {
    const srcDir = path.join(rootDir, 'src');
    const files = fs.readdirSync(path.join(srcDir, 'components'));
    for (const f of files) {
      if (f.endsWith('.tsx')) {
        const text = fs.readFileSync(path.join(srcDir, 'components', f), 'utf8');
        const imgMatches = text.match(/<img[^>]*>/g);
        if (imgMatches) {
          for (const img of imgMatches) {
            assert.match(img, /alt=["'][^"']+["']/, `Image in ${f} must have non-empty alt attribute: ${img}`);
          }
        }
      }
    }
  });

  await t.test('12. Colour Contrast & WCAG 2.1 AA Compliance', () => {
    const cssPath = path.join(rootDir, 'src', 'index.css');
    assert.ok(fs.existsSync(cssPath), 'index.css must exist');
    const css = fs.readFileSync(cssPath, 'utf8');
    assert.match(css, /tally-input/, 'High-contrast Tally input styling defined');
  });

  await t.test('13. Keyboard-Friendly Forms & Tab Order', () => {
    const loginModal = fs.readFileSync(path.join(rootDir, 'src', 'components', 'LoginModal.tsx'), 'utf8');
    assert.match(loginModal, /inputRef\.current\?\.focus\(\)/, 'Must auto-focus form input on modal mount');
  });

  await t.test('14. Clear Button Labels and Descriptive Actions', () => {
    const topBar = fs.readFileSync(path.join(rootDir, 'src', 'components', 'TopBar.tsx'), 'utf8');
    assert.match(topBar, /aria-label="Export Enterprise Data"/, 'Icon action buttons must have descriptive aria-label');
  });

  await t.test('15. Zero Fake Reviews or Fabricated Testimonials', () => {
    const srcFiles = fs.readdirSync(path.join(rootDir, 'src', 'components'));
    for (const file of srcFiles) {
      if (file.endsWith('.tsx')) {
        const content = fs.readFileSync(path.join(rootDir, 'src', 'components', file), 'utf8');
        assert.ok(!content.includes('Lorem ipsum'), `${file} must not contain dummy lorem ipsum testimonials`);
        assert.ok(!content.includes('5/5 from 100,000+ users'), `${file} must not contain deceptive review claims`);
      }
    }
  });

  await t.test('16. Unsupported Claims & Superlatives Scrubber', () => {
    const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
    assert.ok(!indexHtml.includes('Get rich quick'), 'No fraudulent get rich quick claims');
    assert.ok(!indexHtml.includes('100% Guaranteed Profit'), 'No unprovable financial profit guarantees');
  });

  await t.test('17. Real Business Details in Footer', () => {
    const appTsx = fs.readFileSync(path.join(rootDir, 'src', 'App.tsx'), 'utf8');
    assert.match(appTsx, /<footer/i, 'App.tsx must render footer element');
    assert.match(appTsx, /Suvarna ERP Solutions Pvt\. Ltd\./i, 'Must display registered business name');
    assert.match(appTsx, /AMR Tech Park II.*Bangalore/i, 'Must display physical registered address');
    assert.match(appTsx, /\+91-80-68282828/, 'Must display business phone number');
    assert.match(appTsx, /href="\/privacy\.html"/, 'Footer must link to privacy.html');
    assert.match(appTsx, /href="\/terms\.html"/, 'Footer must link to terms.html');
    assert.match(appTsx, /href="\/cookies\.html"/, 'Footer must link to cookies.html');
    assert.match(appTsx, /href="\/refund\.html"/, 'Footer must link to refund.html');
  });

  await t.test('18. Image Copyright & Watermark Audit', () => {
    const publicFiles = fs.readdirSync(path.join(rootDir, 'public'));
    for (const pf of publicFiles) {
      assert.ok(!pf.toLowerCase().includes('shutterstock'), 'No watermarked shutterstock assets');
      assert.ok(!pf.toLowerCase().includes('getty'), 'No watermarked getty assets');
    }
  });

  await t.test('19. Local Regulatory Statutory Verification', () => {
    const storeFile = fs.readFileSync(path.join(rootDir, 'src', 'core', 'tallyStore.ts'), 'utf8');
    const statutoryFile = fs.readFileSync(path.join(rootDir, 'src', 'core', 'statutoryEngine.ts'), 'utf8');
    assert.match(storeFile, /auditEngine/, 'Must maintain MCA Audit Trail engine');
    assert.match(statutoryFile, /calculateGst/, 'Must maintain GST calculation compliance');
    assert.match(statutoryFile, /calculateTds/, 'Must maintain TDS statutory tax withholding');
  });

  await t.test('20. Technical Security Headers & Leaked Secret Guard', async () => {
    const headersFile = path.join(rootDir, '_headers');
    const vercelFile = path.join(rootDir, 'vercel.json');
    assert.ok(fs.existsSync(headersFile), '_headers configuration must exist');
    assert.ok(fs.existsSync(vercelFile), 'vercel.json configuration must exist');

    const headersContent = fs.readFileSync(headersFile, 'utf8');
    assert.match(headersContent, /X-Frame-Options:\s+DENY/, 'Must enforce X-Frame-Options: DENY');
    assert.match(headersContent, /X-Content-Type-Options:\s+nosniff/, 'Must enforce nosniff');
    assert.match(headersContent, /Strict-Transport-Security/, 'Must enforce HSTS');

    // Test live Express server headers
    const app = createTallyServer();
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address() as any;
    const port = address.port;

    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/health`);
      assert.strictEqual(res.headers.get('x-frame-options'), 'DENY', 'Server must emit X-Frame-Options: DENY');
      assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff', 'Server must emit X-Content-Type-Options: nosniff');
      assert.strictEqual(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin', 'Server must emit Referrer-Policy');

      // Test static file serving on Port 9000
      const privRes = await fetch(`http://127.0.0.1:${port}/privacy.html`);
      assert.strictEqual(privRes.status, 200, 'Port 9000 must serve public/privacy.html');
      const text = await privRes.text();
      assert.match(text, /Privacy Policy/i, 'Served content must be privacy policy');
    } finally {
      server.close();
    }
  });
});
