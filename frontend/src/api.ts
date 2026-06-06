import { PaginatedUrlsResponse, UrlAnalyticsResponse, UrlData } from "./types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
const SHORT_URL_BASE = import.meta.env.VITE_SHORT_URL_BASE ?? BASE_URL;

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = body?.detail || res.statusText || "Unknown error";
    throw new Error(message);
  }

  return res.json();
}

export function getShortUrl(shortCode: string) {
  return `${SHORT_URL_BASE}/${shortCode}`;
}

export async function shortenUrl(url: string, signal?: AbortSignal): Promise<UrlData> {
  const res = await fetch(`${BASE_URL}/api/urls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
    signal,
  });

  return handleResponse<UrlData>(res);
}

export async function getUrls(
  page: number = 1,
  pageSize: number = 20,
  signal?: AbortSignal,
): Promise<PaginatedUrlsResponse> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  const res = await fetch(`${BASE_URL}/api/urls?${params}`, { signal });
  return handleResponse<PaginatedUrlsResponse>(res);
}

export async function getUrlAnalytics(
  urlId: number,
  signal?: AbortSignal,
): Promise<UrlAnalyticsResponse> {
  const res = await fetch(`${BASE_URL}/api/urls/${urlId}/analytics`, { signal });
  return handleResponse<UrlAnalyticsResponse>(res);
}
