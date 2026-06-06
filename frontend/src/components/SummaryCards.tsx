import type { UrlData } from "../types";

interface SummaryCardsProps {
  urls: UrlData[];
}

export default function SummaryCards({ urls }: SummaryCardsProps) {
  const totalClicks = urls.reduce((sum, item) => sum + item.clicks, 0);
  const activeUrls = urls.length;
  const newest = urls[0]?.created_at ? new Date(urls[0].created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "-";

  return (
    <div className="summary-cards">
      <article className="summary-card">
        <strong>{activeUrls}</strong>
        <p>Short links created</p>
      </article>
      <article className="summary-card">
        <strong>{totalClicks}</strong>
        <p>Clicks tracked</p>
      </article>
      <article className="summary-card">
        <strong>{newest}</strong>
        <p>Most recent link</p>
      </article>
    </div>
  );
}
