import { useMemo } from "react";
import { UrlData } from "../types";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface StatsChartProps {
  urls: UrlData[];
  loading: boolean;
}

export default function StatsChart({ urls, loading }: StatsChartProps) {
  const totalClicks = useMemo(() => urls.reduce((sum, item) => sum + item.clicks, 0), [urls]);

  const topUrl = useMemo(
    () => [...urls].sort((a, b) => b.clicks - a.clicks)[0],
    [urls],
  );

  const chartData = useMemo(
    () =>
      [...urls]
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .map((item) => ({
          date: new Date(item.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          clicks: item.clicks,
          creations: 1,
        })),
    [urls],
  );

  if (loading) {
    return (
      <div className="chart-skeleton" role="status" aria-live="polite">
        <div className="skeleton-chart" />
      </div>
    );
  }

  if (!urls.length) {
    return <p className="empty-state">No analytics available yet.</p>;
  }

  return (
    <div className="chart-card">
      <div className="chart-summary">
        <div>
          <span>Total clicks</span>
          <strong>{totalClicks}</strong>
        </div>
        <div>
          <span>Top link</span>
          <strong>{topUrl?.short_code ?? "—"}</strong>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={chartData} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
          <CartesianGrid stroke="#e8eef9" strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fill: "#6c7a98" }} />
          <YAxis tick={{ fill: "#6c7a98" }} />
          <Tooltip />
          <Legend verticalAlign="top" height={36} />
          <Line type="monotone" dataKey="clicks" stroke="#1e7bff" strokeWidth={3} dot={{ r: 4 }} />
          <Bar dataKey="creations" fill="#46b3ff" barSize={18} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
