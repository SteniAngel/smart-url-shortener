export interface UrlData {
  id: number;
  original_url: string;
  short_code: string;
  clicks: number;
  created_at: string;
  last_accessed?: string | null;
}

export interface ClickHistoryItem {
  date: string;
  clicks: number;
}

export interface PaginatedUrlsResponse {
  items: UrlData[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface UrlAnalyticsResponse {
  url: UrlData;
  total_clicks: number;
  last_accessed: string | null;
  click_history: ClickHistoryItem[];
}
