import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import UrlTable from "./UrlTable";
import * as api from "../api";

const urls = [
  {
    id: 1,
    original_url: "https://example.com",
    short_code: "abc123",
    clicks: 5,
    created_at: new Date().toISOString(),
    last_accessed: null,
  },
];

const defaultProps = {
  urls,
  loading: false,
  currentPage: 1,
  totalPages: 1,
  onPageChange: vi.fn(),
};

describe("UrlTable", () => {
  it("renders the recent URL row", () => {
    render(<UrlTable {...defaultProps} />);
    expect(screen.getByText(/example.com/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /analytics/i })).toBeInTheDocument();
  });

  it("fetches and shows analytics details", async () => {
    const analyticsSpy = vi.spyOn(api, "getUrlAnalytics").mockResolvedValue({
      url: urls[0],
      total_clicks: 5,
      last_accessed: "2026-06-05T12:00:00Z",
      click_history: [{ date: "2026-06-05", clicks: 3 }],
    });

    render(<UrlTable {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: /analytics/i }));
    await waitFor(() => expect(analyticsSpy).toHaveBeenCalledWith(1, expect.anything()));

    expect(await screen.findByText(/total clicks:/i)).toBeInTheDocument();
    expect(screen.getByText(/2026-06-05/)).toBeInTheDocument();
  });
});
