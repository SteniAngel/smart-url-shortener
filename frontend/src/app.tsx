import React, { useCallback, useEffect, useRef, useState, Suspense, lazy } from "react";
import UrlForm from "./components/UrlForm";
import SectionHeader from "./components/ui/SectionHeader";
import ErrorBoundary from "./components/ErrorBoundary";
const UrlTable = lazy(() => import("./components/UrlTable"));
const StatsChart = lazy(() => import("./components/StatsChart"));
import { getUrls } from "./api";
import { UrlData } from "./types";

const PAGE_SIZE = 7;

function App() {
  const [urls, setUrls] = useState<UrlData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const abortRef = useRef<AbortController | null>(null);

  const loadUrls = useCallback(async (page: number = 1) => {
    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const data = await getUrls(page, PAGE_SIZE, controller.signal);
      setUrls(data.items);
      setTotalPages(data.total_pages);
      setCurrentPage(data.page);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Unable to load URLs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUrls(currentPage);
    return () => abortRef.current?.abort();
  }, [loadUrls, currentPage]);

  const handleShortened = useCallback(() => {
    // Reset to first page to show the new URL
    setCurrentPage(1);
    loadUrls(1);
  }, [loadUrls]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  return (
    <div className="app-shell">
      <header className="page-header">Easy URL Shortener</header>

      <section className="hero-section">
        <div className="hero-card hero-card--compact">
          <div className="hero-copy hero-copy--centered">
            <span className="eyebrow">Simplify your URL</span>
            <h1>Shorten your link in one step.</h1>
            <p className="hero-helper">Enter your URL below and click Shorten.</p>
            <UrlForm onShortened={handleShortened} />
          </div>
        </div>
      </section>

      <section className="panel panel-table">
        <SectionHeader
          title="Recent URLs"
          description="Track each shortened link, copy with one click, and inspect daily click analytics."
        />
        {error && <div className="error-message">{error}</div>}
        <ErrorBoundary fallback={<div className="error-message">Something went wrong loading the table. Please refresh.</div>}>
          <Suspense fallback={<div className="empty-state">Loading table...</div>}>
            <UrlTable
              urls={urls}
              loading={loading}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </Suspense>
        </ErrorBoundary>
      </section>

      <section className="panel panel-chart">
        <SectionHeader
          title="Statistics"
          description="Review recent clicks and performance for your shortened links."
        />
        <ErrorBoundary fallback={<div className="error-message">Something went wrong loading the chart. Please refresh.</div>}>
          <Suspense fallback={<div className="empty-state">Loading chart...</div>}>
            <StatsChart urls={urls} loading={loading} />
          </Suspense>
        </ErrorBoundary>
      </section>
    </div>
  );
}

export default App;
