export default function OfflinePage() {
  return (
    <div className="lf-auth-page">
      <div className="lf-auth-card lf-phone">
        <header className="lf-header" style={{ marginTop: 8 }}>
          <div>
            <div className="lf-header__title">Offline</div>
            <div className="lf-header__sub">No network connection</div>
          </div>
        </header>
        <div className="lf-card lf-card--pad" style={{ marginTop: 24 }}>
          <p style={{ fontSize: 14, lineHeight: 1.55 }}>
            Logic Finance needs a connection to load balances and transactions. Cached financial data is not shown for
            privacy.
          </p>
          <p className="lf-hint" style={{ marginTop: 12 }}>
            Check your connection and reopen the app. If you were signed out, log in again when back online — your session
            is stored in secure cookies and survives app restarts in standalone mode.
          </p>
        </div>
      </div>
    </div>
  );
}
