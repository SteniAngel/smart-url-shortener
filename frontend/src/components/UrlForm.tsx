import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getShortUrl, shortenUrl } from "../api";
import { normalizeUrl, isValidUrl } from "../utils";
import Button from "./ui/Button";
import StatusMessage from "./ui/StatusMessage";

interface UrlFormProps {
  onShortened?: () => void;
}

export default function UrlForm({ onShortened }: UrlFormProps) {
  const [url, setUrl] = useState("");
  const [shortUrl, setShortUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      abortRef.current?.abort();
    };
  }, []);

  const helperText = useMemo(() => {
    if (error) return error;
    if (statusMessage) return statusMessage;
    return "Enter a URL to create a short, shareable link.";
  }, [error, statusMessage]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setError(null);
      setStatusMessage(null);
      setShortUrl("");

      const trimmed = url.trim();
      if (!trimmed) {
        setError("Please enter a URL.");
        return;
      }

      const normalized = normalizeUrl(trimmed);
      if (!isValidUrl(normalized)) {
        setError("Please enter a valid URL.");
        return;
      }

      // Cancel any in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      try {
        const data = await shortenUrl(normalized, controller.signal);
        const urlString = getShortUrl(data.short_code);
        setShortUrl(urlString);
        setUrl("");
        setStatusMessage("Your link is ready.");
        onShortened?.();
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Unable to shorten the URL.");
      } finally {
        setLoading(false);
      }
    },
    [onShortened, url],
  );

  const handleCopy = useCallback(async () => {
    if (!shortUrl) return;
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopied(true);
      setStatusMessage("Copied to clipboard.");
      timeoutRef.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copy failed. Please use keyboard shortcuts to copy the link.");
    }
  }, [shortUrl]);

  return (
    <form className="url-form" onSubmit={handleSubmit} noValidate>
      <div className="form-row">
        <label htmlFor="original-url" className="sr-only">
          Original URL
        </label>
        <input
          id="original-url"
          name="original-url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter URL"
          aria-label="Original URL"
          autoComplete="url"
          required
          inputMode="url"
          maxLength={8192}
        />
        <Button type="submit" loading={loading}>
          Shorten
        </Button>
      </div>

      <div aria-live="polite" className="form-footer">
        <StatusMessage type={error ? "error" : statusMessage ? "success" : "info"}>
          {helperText}
        </StatusMessage>
      </div>

      {shortUrl && (
        <div className="result-card" role="status" aria-live="polite">
          <div>
            <p className="result-label">Short URL</p>
            <a href={shortUrl} target="_blank" rel="noopener noreferrer">
              {shortUrl}
            </a>
          </div>
          <Button type="button" variant="success" className="copy-link-button" onClick={handleCopy} icon="📋">
            {copied ? "Copied!" : "Copy link"}
          </Button>
        </div>
      )}
    </form>
  );
}
