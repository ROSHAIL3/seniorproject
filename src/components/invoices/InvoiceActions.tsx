"use client";

import Button from "@/components/ui/button/Button";
import { DocsIcon, EnvelopeIcon } from "@/icons";

export default function InvoiceActions({
  customerEmail,
  invoiceNumber,
}: {
  customerEmail: string;
  invoiceNumber: string;
}) {
  return (
    <div className="flex flex-wrap gap-3 print:hidden">
      <Button
        size="sm"
        variant="outline"
        startIcon={<EnvelopeIcon />}
        onClick={() => {
          const subject = encodeURIComponent(`Invoice ${invoiceNumber}`);
          window.location.href = `mailto:${customerEmail}?subject=${subject}`;
        }}
      >
        Send by Email
      </Button>
      <Button
        size="sm"
        variant="outline"
        startIcon={<DocsIcon />}
        onClick={() => window.print()}
      >
        Print / Save as PDF
      </Button>
    </div>
  );
}
