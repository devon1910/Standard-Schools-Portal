export default function PortalLoading() {
  return (
    <div className="page-loading" role="status" aria-live="polite">
      <div className="loading-heading">
        <span className="spinner spinner-large" aria-hidden="true" />
        <div>
          <strong>Loading page</strong>
          <p>Please wait while the latest school records are retrieved.</p>
        </div>
      </div>
      <div className="skeleton-grid" aria-hidden="true">
        <span className="skeleton skeleton-card" />
        <span className="skeleton skeleton-card" />
        <span className="skeleton skeleton-card" />
      </div>
      <span className="skeleton skeleton-table" aria-hidden="true" />
    </div>
  );
}
