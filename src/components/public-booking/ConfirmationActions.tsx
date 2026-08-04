"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ConfirmationActions({
  slug,
  referenceToken,
}: {
  slug: string;
  referenceToken: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const viewAll = async () => {
    setLoading(true);
    const response = await fetch(
      `/api/public-booking/${encodeURIComponent(slug)}/session`,
      {
        body: JSON.stringify({ referenceToken }),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      },
    );
    if (response.ok) router.push(`/book/${encodeURIComponent(slug)}/manage`);
    else setLoading(false);
  };

  return (
    <div className="mt-6 flex flex-wrap justify-center gap-2">
      <button
        onClick={() => void viewAll()}
        disabled={loading}
        className="inline-flex min-h-11 items-center rounded-xl bg-[#191a23] px-4 text-sm font-semibold text-white transition hover:bg-[#2a2b35] disabled:opacity-60"
      >
        {loading ? "Opening…" : "View all bookings"}
      </button>
      <Link
        href={`/book/${encodeURIComponent(slug)}`}
        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#191a23] px-4 text-sm font-medium transition hover:bg-[#b9ff66]"
      >
        Book another appointment
      </Link>
      <button
        onClick={() => window.print()}
        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#191a23] px-4 text-sm font-medium transition hover:bg-[#b9ff66]"
      >
        Print confirmation
      </button>
    </div>
  );
}
