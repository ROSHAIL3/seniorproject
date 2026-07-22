"use client";
import ThemedBarChart from "./ThemedBarChart";

const data = [168, 385, 201, 298, 187, 195, 291, 110, 215, 390, 280, 112].map((value, index) => ({ label: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][index], value }));
export default function BarChartOne() { return <ThemedBarChart data={data} seriesName="Sales" height={300} minWidth={1000} />; }
