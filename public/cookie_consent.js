/**
 * GDPR / ePrivacy Compliant Cookie Consent Banner
 * Self-contained, zero-dependency, accessible vanilla JS.
 * Injected automatically by final-security-check skill.
 */
(function() {
  const STORAGE_KEY = 'site_cookie_consent_v1';

  function getConsent() {
    try {
      const val = localStorage.getItem(STORAGE_KEY);
      return val ? JSON.parse(val) : null;
    } catch (e) {
      return null;
    }
  }

  function setConsent(consent) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
      window.dispatchEvent(new CustomEvent('cookieConsentUpdated', { detail: consent }));
    } catch (e) {}
  }

  function createBanner() {
    if (document.getElementById('cookie-consent-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'cookie-consent-banner';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Cookie Consent Notice');
    banner.innerHTML = `
      <div class="cookie-content">
        <div class="cookie-text">
          <p><strong>We value your privacy:</strong> We use cookies to improve your browsing experience, provide secure sessions, and analyze website traffic in accordance with our <a href="cookies.html" style="color: #38bdf8; text-decoration: underline;">Cookie Policy</a>.</p>
        </div>
        <div class="cookie-actions">
          <button id="cookie-btn-decline" class="cookie-btn cookie-btn-decline" aria-label="Decline non-essential cookies">Decline Non-Essential</button>
          <button id="cookie-btn-accept" class="cookie-btn cookie-btn-accept" aria-label="Accept all cookies">Accept All Cookies</button>
        </div>
      </div>
    `;

    document.body.appendChild(banner);

    document.getElementById('cookie-btn-accept').addEventListener('click', function() {
      setConsent({ necessary: true, analytics: true, marketing: true, timestamp: new Date().toISOString() });
      banner.style.display = 'none';
    });

    document.getElementById('cookie-btn-decline').addEventListener('click', function() {
      setConsent({ necessary: true, analytics: false, marketing: false, timestamp: new Date().toISOString() });
      banner.style.display = 'none';
    });
  }

  // Global helper for footer links: <a href="#" onclick="window.openCookiePreferences(); return false;">Cookie Settings</a>
  window.openCookiePreferences = function() {
    let banner = document.getElementById('cookie-consent-banner');
    if (!banner) {
      createBanner();
      banner = document.getElementById('cookie-consent-banner');
    }
    if (banner) banner.style.display = 'block';
  };

  document.addEventListener('DOMContentLoaded', function() {
    const existing = getConsent();
    if (!existing) {
      createBanner();
    }
  });
})();
