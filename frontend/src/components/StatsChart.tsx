import { useMemo } from "react";
import { UrlData } from "../types";
import {
  Area,
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

export default function StatsChart({
  urls,
  loading,
}: StatsChartProps) {
  const chartData = useMemo(() => {
    // Build last 14 days
    const days: Record<string, { clicks: number; creations: number }> = {};
    const today = new Date();
    
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const day = d.getDate();
      const ordinal = (n: number) => {
        if (n > 3 && n < 21) return n + "th";
        switch (n % 10) { case 1: return n + "st"; case 2: return n + "nd"; case 3: return n + "rd"; default: return n + "th"; }
      };
      const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
      const key = `${ordinal(day)} ${weekday}`;
      days[key] = { clicks: 0, creations: 0 };
    }

    // Fill in actual data
    urls.forEach((item) => {
      const d = new Date(item.created_at);
      const day = d.getDate();
      const ordinal = (n: number) => {
        if (n > 3 && n < 21) return n + "th";
        switch (n % 10) { case 1: return n + "st"; case 2: return n + "nd"; case 3: return n + "rd"; default: return n + "th"; }
      };
      const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
      const key = `${ordinal(day)} ${weekday}`;
      if (days[key]) {
        days[key].clicks += item.clicks;
        days[key].creations += 1;
      }
    });

    return Object.entries(days).map(([date, data]) => ({
      date,
      clicks: data.clicks,
      creations: data.creations,
    }));
  }, [urls]);

  if (loading) {
    return (
      <div
        className="chart-skeleton"
        role="status"
        aria-live="polite"
      >
        <div className="skeleton-chart" />
      </div>
    );
  }

  if (!urls.length) {
    return (
      <p className="empty-state">
        No analytics available yet.
      </p>
    );
  }

  return (
    <div className="chart-card reference-chart">
      <h3 className="chart-title">
        Recent Statistics of Click Counts
      </h3>

      <ResponsiveContainer
        width="100%"
        height={420}
      >
        <ComposedChart
          data={chartData}
          margin={{
            top: 20,
            right: 20,
            left: 10,
            bottom: 10,
          }}
        >
          <CartesianGrid
            stroke="#e5e5e5"
            horizontal={true}
            vertical={true}
          />

          <XAxis
            dataKey="date"
            tick={{
              fill: "#666",
              fontSize: 11,
            }}
            height={40}
            interval={0}
          />

          <YAxis
            tick={{
              fill: "#666",
              fontSize: 12,
            }}
          />

          <Tooltip />

          <Legend
            verticalAlign="top"
            align="center"
            height={50}
            content={() => (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 30, alignItems: 'center', marginTop: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ display: 'inline-block', width: 40, height: 14, background: '#e8e8e8', border: '1.5px solid #5cb85c' }}></span>
                  <span style={{ color: '#666', fontSize: 13 }}>URL Clicks</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ display: 'inline-block', width: 40, height: 14, background: '#5bc0de' }}></span>
                  <span style={{ color: '#666', fontSize: 13 }}>URL Creations</span>
                </div>
              </div>
            )}
          />

          {/* Grey growth shadow */}
          <Area
            type="monotone"
            dataKey="clicks"
            name="URL Clicks"
            fill="#e8e8e8"
            fillOpacity={0.9}
            stroke="#5cb85c"
            strokeWidth={2}
          />

          {/* Growth line */}
          <Line
            type="monotone"
            dataKey="clicks"
            stroke="#66c7c7"
            strokeWidth={3}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
            legendType="none"
          />

          {/* URL creation bars */}
          <Bar
            dataKey="creations"
            name="URL Creations"
            fill="#5bc0de"
            barSize={36}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}