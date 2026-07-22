"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import { useTheme } from "@/context/ThemeContext";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false, loading: () => <ChartLoading /> });

export type BarChartDatum = { label: string; value: number; lineValue?: number };
export type ThemedBarChartProps = {
  data: BarChartDatum[];
  seriesName: string;
  height?: number;
  minWidth?: number;
  loading?: boolean;
  error?: string;
  emptyMessage?: string;
  valueFormatter?: (value: number) => string;
  lineSeriesName?: string;
};

export default function ThemedBarChart({ data, seriesName, height = 260, minWidth = 640, loading = false, error, emptyMessage = "No chart data available.", valueFormatter = (value) => String(value), lineSeriesName }: ThemedBarChartProps) {
  const { theme } = useTheme();
  const options = useMemo<ApexOptions>(() => ({
    colors: ["var(--color-brand-500)", "var(--color-brand-300)"],
    chart: { fontFamily: "Outfit, sans-serif", type: lineSeriesName ? "line" : "bar", height, toolbar: { show: false }, animations: { enabled: true } },
    theme: { mode: theme },
    plotOptions: { bar: { horizontal: false, columnWidth: "42%", borderRadius: 5, borderRadiusApplication: "end" } },
    dataLabels: { enabled: false },
    stroke: { show: true, width: lineSeriesName ? [0, 3] : 3, curve: "smooth" },
    markers: { size: lineSeriesName ? 4 : 0, strokeWidth: 2, hover: { size: 6 } },
    xaxis: { categories: data.map((item) => item.label), axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { colors: "var(--color-gray-500)", fontSize: "12px" } } },
    yaxis: { labels: { formatter: valueFormatter, style: { colors: ["var(--color-gray-500)"], fontSize: "12px" } } },
    grid: { borderColor: theme === "dark" ? "var(--color-gray-800)" : "var(--color-gray-200)", strokeDashArray: 0, xaxis: { lines: { show: false } }, yaxis: { lines: { show: true } } },
    fill: { opacity: 1 },
    legend: { show: Boolean(lineSeriesName), position: "top", horizontalAlign: "left", labels: { colors: "var(--color-gray-500)" } },
    tooltip: { theme, x: { show: true }, y: { formatter: valueFormatter, title: { formatter: () => `${seriesName}: ` } } },
  }), [data, height, lineSeriesName, seriesName, theme, valueFormatter]);
  if (loading) return <ChartLoading />;
  if (error) return <div role="alert" className="flex h-64 items-center justify-center rounded-xl border border-error-200 bg-error-50 px-5 text-center text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">{error}</div>;
  if (!data.length) return <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 px-5 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-white/[0.02] dark:text-gray-400">{emptyMessage}</div>;
  const series = [{ name: seriesName, type: "bar", data: data.map((item) => item.value) }, ...(lineSeriesName ? [{ name: lineSeriesName, type: "line", data: data.map((item) => item.lineValue ?? item.value) }] : [])];
  return <div className="max-w-full overflow-x-auto custom-scrollbar"><div style={{ minWidth }}><ReactApexChart options={options} series={series} type={lineSeriesName ? "line" : "bar"} height={height} /></div></div>;
}

function ChartLoading() { return <div className="h-64 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" aria-label="Loading chart" />; }
