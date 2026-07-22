"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import { useTheme } from "@/context/ThemeContext";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false, loading: () => <ChartLoading /> });
export type LineChartSeries = { name: string; data: number[] };

export default function ThemedLineChart({ categories, series, height = 310, minWidth = 720, loading = false, error, emptyMessage = "No chart data available.", valueFormatter = (value) => String(value) }: { categories: string[]; series: LineChartSeries[]; height?: number; minWidth?: number; loading?: boolean; error?: string; emptyMessage?: string; valueFormatter?: (value: number) => string }) {
  const { theme } = useTheme();
  const chartTextColor = theme === "dark" ? "var(--color-gray-400)" : "var(--color-gray-500)";
  const options = useMemo<ApexOptions>(() => ({
    colors: ["var(--color-brand-500)", "var(--color-brand-300)"],
    chart: { background: "transparent", foreColor: chartTextColor, fontFamily: "var(--font-space-grotesk), sans-serif", height, type: "area", toolbar: { show: false }, animations: { enabled: true } },
    legend: { show: series.length > 1, position: "top", horizontalAlign: "left", labels: { colors: chartTextColor } },
    stroke: { curve: "straight", width: series.map(() => 2.5) },
    fill: { type: "gradient", gradient: { opacityFrom: 0.45, opacityTo: 0, stops: [0, 95, 100] } },
    markers: { size: 0, strokeColors: "var(--color-white)", strokeWidth: 2, hover: { size: 6 } },
    grid: { borderColor: theme === "dark" ? "var(--color-gray-800)" : "var(--color-gray-200)", xaxis: { lines: { show: false } }, yaxis: { lines: { show: true } } },
    dataLabels: { enabled: false },
    tooltip: { enabled: true, theme, y: { formatter: valueFormatter } },
    xaxis: { type: "category", categories, axisBorder: { show: false }, axisTicks: { show: false }, tooltip: { enabled: false }, labels: { style: { colors: chartTextColor, fontSize: "12px" } } },
    yaxis: { labels: { formatter: valueFormatter, style: { fontSize: "12px", colors: [chartTextColor] } } },
  }), [categories, chartTextColor, height, series, theme, valueFormatter]);
  if (loading) return <ChartLoading />;
  if (error) return <div role="alert" className="flex h-72 items-center justify-center rounded-xl border border-error-200 bg-error-50 px-5 text-center text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">{error}</div>;
  if (!categories.length || !series.some((item) => item.data.length)) return <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 px-5 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-white/[0.02] dark:text-gray-400">{emptyMessage}</div>;
  return <div className="max-w-full overflow-x-auto custom-scrollbar"><div style={{ minWidth }}><ReactApexChart options={options} series={series} type="area" height={height} /></div></div>;
}

function ChartLoading() { return <div className="h-72 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" aria-label="Loading chart" />; }
