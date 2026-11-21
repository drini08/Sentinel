import { Component, Suspense, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

class RouteErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="route-loading" role="alert">
        <p>This page could not load.</p>
        <button type="button" className="button-secondary" onClick={() => window.location.reload()}>
          Reload page
        </button>
      </div>
    );
  }
}

export function RouteContent({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <RouteErrorBoundary key={pathname}>
      <Suspense fallback={<div className="route-loading" role="status"><span />Loading page…</div>}>
        {children}
      </Suspense>
    </RouteErrorBoundary>
  );
}
