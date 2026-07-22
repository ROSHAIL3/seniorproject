"use client";
import ThemedLineChart from "./ThemedLineChart";

const categories = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const series = [{ name: "Sales", data: [180, 190, 170, 160, 175, 165, 170, 205, 230, 210, 240, 235] }, { name: "Revenue", data: [40, 30, 50, 40, 55, 40, 70, 100, 110, 120, 150, 140] }];
export default function LineChartOne() { return <ThemedLineChart categories={categories} series={series} minWidth={1000} />; }
