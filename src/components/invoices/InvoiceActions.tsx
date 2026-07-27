"use client";

import { useState } from "react";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { DocsIcon, EnvelopeIcon } from "@/icons";

export default function InvoiceActions({
  customerEmail,
  invoiceNumber,
}: {
  customerEmail: string;
  invoiceNumber: string;
}) {
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  const confirmEmailSend = () => {
    window.dispatchEvent(
      new CustomEvent("slotova:invoice-email-send", {
        detail: {
          invoiceNumber,
          recipient: customerEmail,
        },
      }),
    );
    setIsEmailModalOpen(false);
  };

  return (
    <>
      <div className="flex flex-wrap gap-3 print:hidden">
        <Button
          size="sm"
          variant="outline"
          startIcon={<EnvelopeIcon />}
          onClick={() => setIsEmailModalOpen(true)}
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

      <Modal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        className="m-4 max-w-[500px] p-5 shadow-theme-xl sm:p-6"
      >
        <h2 className="pr-12 text-xl font-semibold text-gray-900 dark:text-white">
          Send invoice by email
        </h2>

        <div className="mt-6 flex items-start gap-4">
          <span className="inline-flex size-11 shrink-0 items-center justify-center overflow-visible rounded-xl bg-brand-50 text-brand-700 leading-none dark:bg-brand-500/10 dark:text-brand-400 [&>svg]:block [&>svg]:size-6 [&>svg]:shrink-0 [&>svg]:overflow-visible">
            <EnvelopeIcon />
          </span>
          <p className="min-w-0 pt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
            Send invoice{" "}
            <span className="font-semibold text-gray-900 dark:text-white">
              {invoiceNumber}
            </span>{" "}
            to{" "}
            <span className="break-all font-semibold text-gray-900 dark:text-white">
              {customerEmail}
            </span>
            ?
          </p>
        </div>

        <div className="mt-7 flex justify-end gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEmailModalOpen(false)}
          >
            No
          </Button>
          <Button size="sm" onClick={confirmEmailSend}>
            Send
          </Button>
        </div>
      </Modal>
    </>
  );
}
