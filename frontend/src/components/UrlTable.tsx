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

export default function UrlTable({
  urls,
  loading,
  currentPage,
  totalPages,
  onPageChange,
}: UrlTableProps) {
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [analyticsById, setAnalyticsById] = useState<
    Record<number, AnalyticsCache>
  >({});
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const formattedDates = useMemo(
    () =>
      urls.reduce<Record<number, string>>((memo, item) => {
        memo[item.id] = formatDate(item.created_at);
        return memo;
      }, {}),
    [urls]
  );

  const shortUrls = useMemo(
    () =>
      urls.reduce<Record<number, string>>((memo, item) => {
        memo[item.id] = getShortUrl(item.short_code);
        return memo;
      }, {}),
    [urls]
  );

  const handleCopy = useCallback(
    async (id: number) => {
      const url = shortUrls[id];

      if (!url) return;

      try {
        await navigator.clipboard.writeText(url);
        setCopiedId(id);

        window.setTimeout(() => {
          setCopiedId(null);
        }, 2000);
      } catch {
        setError("Copy failed. Please copy the URL manually.");
      }
    },
    [shortUrls]
  );

  const handleAnalytics = useCallback(
    async (id: number) => {
      if (expandedId === id) {
        setExpandedId(null);
        return;
      }

      abortRef.current?.abort();

      const controller = new AbortController();
      abortRef.current = controller;

      setLoadingId(id);
      setError(null);

      try {
        const result = await getUrlAnalytics(id, controller.signal);

        setAnalyticsById((prev) => ({
          ...prev,
          [id]: {
            total_clicks: result.total_clicks,
            last_accessed: result.last_accessed,
            click_history: result.click_history,
          },
        }));

        setExpandedId(id);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load analytics."
        );
      } finally {
        setLoadingId(null);
      }
    },
    [expandedId]
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

  if (!urls.length) {
    return (
      <div className="empty-state">
        No URLs have been shortened yet.
      </div>
    );
  }

  return (
    <>
      {error && (
        <StatusMessage type="error">
          {error}
        </StatusMessage>
      )}

      <div className="table-wrapper">
        <table className="url-table">
          <thead>
            <tr>
              <th>Original URL</th>
              <th>Short URL</th>
              <th></th>
              <th></th>
              <th>Created On</th>
              <th>Clicks</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {urls.map((item) => {
              const analytics = analyticsById[item.id];
              const shortUrl = shortUrls[item.id];

              return (
                <React.Fragment key={item.id}>
                  <tr className="url-row">
                    <td
                      className="truncate-cell"
                      title={item.original_url}
                    >
                      {item.original_url}
                    </td>

                    <td>
                      <a
                        href={shortUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="short-link"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" strokeLinecap="square" strokeLinejoin="miter" style={{ marginRight: 6, verticalAlign: 'middle' }}><rect x="9" y="2" width="12" height="12" stroke="#2c6b8a" strokeWidth="2.5" /><rect x="2" y="9" width="12" height="12" stroke="#2c6b8a" strokeWidth="2.5" /><rect x="2" y="9" width="12" height="6" fill="#2c6b8a" stroke="none" /></svg>
                        {shortUrl}
                      </a>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="icon-btn copy-btn"
                        onClick={() =>
                          handleCopy(item.id)
                        }
                        title="Copy URL"
                      >
                        {copiedId === item.id
                          ? <i className="fa fa-check"></i>
                          : <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" strokeLinecap="square" strokeLinejoin="miter"><rect x="9" y="2" width="12" height="12" stroke="white" strokeWidth="2.5" /><rect x="2" y="9" width="12" height="12" stroke="white" strokeWidth="2.5" /><rect x="2" y="9" width="12" height="6" fill="white" stroke="none" /></svg>}
                      </button>
                    </td>

                    <td>
                      <a
                        href={shortUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="icon-btn open-btn"
                        title="Open URL"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6l-3 3v10h11V2z" /><path d="M6 2v3H3" /><path d="M21 9h-8l-3 3v10h11V9z" /><path d="M13 9v3h-3" /></svg>
                      </a>
                    </td>

                    <td>
                      {formattedDates[item.id]}
                    </td>

                    <td>{item.clicks}</td>

                    <td>
                      <Button
                        type="button"
                        variant="accent"
                        className="analytics-btn"
                        onClick={() =>
                          handleAnalytics(item.id)
                        }
                        disabled={
                          loadingId === item.id
                        }
                        icon={<i className="fa fa-bar-chart"></i>}
                      >
                        {loadingId === item.id
                          ? "Loading..."
                          : expandedId === item.id
                          ? "Hide"
                          : "Analytics"}
                      </Button>
                    </td>
                  </tr>

                  {expandedId === item.id &&
                    analytics && (
                      <tr className="analytics-row">
                        <td colSpan={7}>
                          <div className="analytics-summary">
                            <div>
                              <strong>
                                Total Clicks:
                              </strong>{" "}
                              {
                                analytics.total_clicks
                              }
                            </div>

                            <div>
                              <strong>
                                Last Accessed:
                              </strong>{" "}
                              {analytics.last_accessed
                                ? formatDate(
                                    analytics.last_accessed
                                  )
                                : "Never"}
                            </div>
                          </div>

                          <div className="analytics-list">
                            {analytics
                              .click_history
                              .length ? (
                              analytics.click_history.map(
                                (history) => (
                                  <div
                                    key={
                                      history.date
                                    }
                                  >
                                    {
                                      history.date
                                    }
                                    :{" "}
                                    {
                                      history.clicks
                                    }{" "}
                                    click
                                    {history.clicks !==
                                    1
                                      ? "s"
                                      : ""}
                                  </div>
                                )
                              )
                            ) : (
                              <div>
                                No click data
                                yet.
                              </div>
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
        <div
          className="pagination"
          role="navigation"
          aria-label="Pagination"
        >
          <button
            type="button"
            className="pagination-button"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            &lt;
          </button>
          {Array.from(
            { length: totalPages },
            (_, index) => (
              <button
                key={index}
                type="button"
                className={
                  currentPage === index + 1
                    ? "pagination-button active"
                    : "pagination-button"
                }
                onClick={() =>
                  onPageChange(index + 1)
                }
                aria-current={
                  currentPage === index + 1
                    ? "page"
                    : undefined
                }
              >
                {String(index + 1).padStart(2, '0')}
              </button>
            )
          )}
          <button
            type="button"
            className="pagination-button"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            &gt;
          </button>
        </div>
      )}
    </>
  );
}