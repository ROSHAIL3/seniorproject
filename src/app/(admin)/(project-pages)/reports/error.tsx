"use client";
import Button from "@/components/ui/button/Button";
export default function ErrorPage({ reset }: { reset: () => void }) { return <div className="rounded-2xl border border-error-200 bg-error-50 p-8 text-center"><h1 className="text-xl font-semibold text-error-700">Reports could not be loaded</h1><p className="mt-2 text-sm text-error-600">Please try loading the report again.</p><Button size="sm" className="mt-5" onClick={reset}>Try again</Button></div>; }
