import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import UrlForm from "./UrlForm";
import * as api from "../api";

describe("UrlForm", () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("shows validation error for empty input", async () => {
    render(<UrlForm />);

    fireEvent.change(screen.getByLabelText(/original url/i), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: /shorten/i }));

    expect(await screen.findByText(/please enter a url/i)).toBeInTheDocument();
  });

  it("shortens a URL and exposes the shortened link", async () => {
    const shortenSpy = vi.spyOn(api, "shortenUrl").mockResolvedValue({
      id: 1,
      original_url: "https://example.com",
      short_code: "abc123",
      clicks: 0,
      created_at: new Date().toISOString(),
    });

    render(<UrlForm />);

    fireEvent.change(screen.getByLabelText(/original url/i), { target: { value: "example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /shorten/i }));

    await waitFor(() => expect(shortenSpy).toHaveBeenCalled());
    expect(await screen.findByText(/your link is ready/i)).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveTextContent(/abc123/);
  });

  it("copies the short URL when the copy button is clicked", async () => {
    vi.spyOn(api, "shortenUrl").mockResolvedValue({
      id: 1,
      original_url: "https://example.com",
      short_code: "abc123",
      clicks: 0,
      created_at: new Date().toISOString(),
    });

    render(<UrlForm />);
    fireEvent.change(screen.getByLabelText(/original url/i), { target: { value: "example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /shorten/i }));

    expect(await screen.findByRole("link")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /copy/i }));

    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalled());
    expect(await screen.findByText(/copied to clipboard/i)).toBeInTheDocument();
  });
});
