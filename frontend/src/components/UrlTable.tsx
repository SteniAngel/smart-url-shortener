import React, { useCallback, useMemo, useRef, useState } from "react";
import { UrlData } from "../types";
import { getShortUrl, getUrlAnalytics } from "../api";
import { formatDate } from "../utils";
import Button from "./ui/Button";
import StatusMessage from "./ui/StatusMessage";

interface UrlTableProps {
  urls: UrlData[];
  loading: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

interface AnalyticsCache {
  total_clicks: number;
  last_accessed: string | null;
  click_history: { date: string; clicks: number }[];
}

export default function UrlTable({ urls, loading, currentPage, totalPages, onPageChange }: UrlTableProps) {
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [analyticsById, setAnalyticsById] = useState<Record<number, AnalyticsCache>>({});
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const formattedDates = useMemo(
    () =>
      urls.reduce<Record<number, string>>((memo, item) => {
        memo[item.id] = formatDate(item.created_at);
        return memo;
      }, {}),
    [urls],
  );

  // Memoize short URLs per item to avoid calling getShortUrl multiple times per row
  const shortUrls = useMemo(
    () =>
      urls.reduce<Record<number, string>>((memo, item) => {
        memo[item.id] = getShortUrl(item.short_code);
        return memo;
      }, {}),
    [urls],
  );

  const handleCopy = useCallback(
    async (id: number) => {
      const url = shortUrls[id];
      if (!url) return;
      try {
        await navigator.clipboard.writeText(url);
        setCopiedId(id);
        window.setTimeout(() => setCopiedId(null), 2000);
      } catch {
        setError("Copy failed. Please copy the URL manually.");
      }
    },
    [shortUrls],
  );

  const handleAnalytics = useCallback(
    async (id: number) => {
      // Toggle off if already expanded
      if (expandedId === id) {
        setExpandedId(null);
        return;
      }

      // Always fetch fresh data
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoadingId(id);
      setError(null);

      try {
        const result = await getUrlAnalytics(id, controller.signal);
        setAnalyticsById((previous) => ({
          ...previous,
          [id]: {
            total_clicks: result.total_clicks,
            last_accessed: result.last_accessed,
            click_history: result.click_history,
          },
        }));
        setExpandedId(id);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Unable to load analytics.");
      } finally {
        setLoadingId(null);
      }
    },
    [expandedId],
  );

  if (loading) {
    return (
      <div className="url-table-skeleton">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="skeleton-row">
            <span className="skeleton-cell" />
            <span className="skeleton-cell" />
            <span className="skeleton-cell" />
            <span className="skeleton-cell" />
            <span className="skeleton-cell short" />
          </div>
        ))}
      </div>
    );
  }

  if (!urls.length) return <div className="empty-state">No URLs have been shortened yet.</div>;

  return (
    <>
      {error && <StatusMessage type="error">{error}</StatusMessage>}
      <div className="table-wrapper">
        <table className="url-table">
          <thead>
            <tr>
              <th>Original URL</th>
              <th>Short URL</th>
              <th>Created</th>
              <th>Last accessed</th>
              <th>Clicks</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {urls.map((item) => {
              const analytics = analyticsById[item.id];
              const shortUrl = shortUrls[item.id];
              return (
                <React.Fragment key={item.id}>
                  <tr>
                    <td className="truncate-cell" title={item.original_url} data-label="Original URL">
                      {item.original_url}
                    </td>
                    <td data-label="Short URL">
                      <a href={shortUrl} target="_blank" rel="noopener noreferrer">
                        {shortUrl}
                      </a>
                    </td>
                    <td data-label="Created">{formattedDates[item.id]}</td>
                    <td data-label="Last accessed">{item.last_accessed ? formatDate(item.last_accessed) : "Never"}</td>
                    <td data-label="Clicks">{item.clicks}</td>
                    <td className="table-actions" data-label="Actions">
                      <Button type="button" variant="success" className="copy-link-button" onClick={() => handleCopy(item.id)} icon="📋">
                        {copiedId === item.id ? "Copied!" : "Copy link"}
                      </Button>
                      <Button
                        type="button"
                        variant="accent"
                        className="analytics-link-button"
                        onClick={() => handleAnalytics(item.id)}
                        disabled={loadingId === item.id}
                        icon="📈"
                      >
                        {loadingId === item.id
                          ? "Loading..."
                          : expandedId === item.id
                          ? "Hide"
                          : "Analytics"}
                      </Button>
                    </td>
                  </tr>
                  {expandedId === item.id && analytics && (
                    <tr className="analytics-row" key={`analytics-${item.id}`}>
                      <td colSpan={6}>
                        <div className="analytics-summary">
                          <div>
                            <strong>Total clicks:</strong> {analytics.total_clicks}
                          </div>
                          <div>
                            <strong>Last accessed:</strong>{" "}
                            {analytics.last_accessed
                              ? formatDate(analytics.last_accessed)
                              : "Never"}
                          </div>
                        </div>
                        <div className="analytics-list">
                          {analytics.click_history.length ? (
                            analytics.click_history.map((h) => (
                              <div key={h.date}>
                                {h.date}: {h.clicks} click{h.clicks === 1 ? "" : "s"}
                              </div>
                            ))
                          ) : (
                            <div>No click data yet.</div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination" role="navigation" aria-label="Pagination">
          {Array.from({ length: totalPages }, (_, index) => (
            <button
              key={index}
              type="button"
              className={currentPage === index + 1 ? "pagination-button active" : "pagination-button"}
              onClick={() => onPageChange(index + 1)}
              aria-current={currentPage === index + 1 ? "page" : undefined}
            >
              {index + 1}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
