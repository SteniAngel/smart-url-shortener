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

  it("renders the form with input and submit button", () => {
    render(<UrlForm />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /shorten url/i })).toBeInTheDocument();
  });

  it("shortens a URL and shows the result", async () => {
    const shortenSpy = vi.spyOn(api, "shortenUrl").mockResolvedValue({
      id: 1,
      original_url: "https://example.com",
      short_code: "abc123",
      clicks: 0,
      created_at: new Date().toISOString(),
    });

    render(<UrlForm />);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /shorten url/i }));

    await waitFor(() => expect(shortenSpy).toHaveBeenCalled());
    expect(await screen.findByRole("link")).toHaveTextContent(/abc123/);
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
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /shorten url/i }));

    expect(await screen.findByRole("link")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /copy/i }));

    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalled());
  });
});
